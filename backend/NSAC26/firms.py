import asyncio, io, sqlite3
from datetime import date, datetime, timedelta, timezone

import pandas as pd

BASE = "https://firms.modaps.eosdis.nasa.gov/api"
ANCHOR = date(2000, 1, 1)
NRT_CUTOFF_DAYS = 120
SEGMENTS = [
    ("MODIS", "MODIS_SP", "MODIS_NRT", date(2000, 11, 1), None),
    ("VIIRS", "VIIRS_SNPP_SP", "VIIRS_SNPP_NRT", date(2012, 1, 20), date(2018, 3, 31)),
    ("VIIRS", "VIIRS_NOAA20_SP", "VIIRS_NOAA20_NRT", date(2018, 4, 1), None),
]
COLS = ["sensor", "source", "lat", "lon", "acq_date", "acq_time", "frp", "conf_level", "daynight"]


class FirmsError(RuntimeError):
    pass


def connect(path="firms_cache.sqlite"):
    c = sqlite3.connect(path)
    c.executescript("""
    CREATE TABLE IF NOT EXISTS hotspots(
      sensor TEXT, source TEXT, lat REAL, lon REAL, acq_date TEXT, acq_time TEXT,
      frp REAL, conf_level TEXT, daynight TEXT,
      PRIMARY KEY(sensor, lat, lon, acq_date, acq_time));
    CREATE INDEX IF NOT EXISTS ix_date ON hotspots(acq_date);
    CREATE TABLE IF NOT EXISTS chunks(
      source TEXT, bbox TEXT, start TEXT, days INTEGER, fetched_at TEXT, n INTEGER,
      PRIMARY KEY(source, bbox, start, days));
    """)
    return c


def bbox_key(b):
    return ",".join(f"{v:.3f}" for v in b)


def plan_chunks(start: date, end: date, today: date | None = None):
    today = today or datetime.now(timezone.utc).date()
    out = []
    for sensor, sp, nrt, s0, s1 in SEGMENTS:
        lo, hi = max(start, s0), min(end, s1 or end, today)
        if lo > hi:
            continue
        k = (lo - ANCHOR).days // 5
        cs = ANCHOR + timedelta(days=k * 5)
        while cs <= hi:
            a, b = max(cs, s0), min(cs + timedelta(days=4), hi, s1 or date.max)
            if a <= b:
                src = sp if b < today - timedelta(days=NRT_CUTOFF_DAYS) else nrt
                out.append((sensor, src, a, (b - a).days + 1))
            cs += timedelta(days=5)
    return out


def _conf_level(v):
    s = str(v).strip().lower()
    if s in ("l", "low"): return "low"
    if s in ("n", "nominal"): return "nominal"
    if s in ("h", "high"): return "high"
    try:
        x = float(s)
        return "low" if x < 30 else "nominal" if x < 80 else "high"
    except ValueError:
        return "nominal"


def parse_csv(text: str, sensor: str, source: str) -> pd.DataFrame:
    if not text.strip():
        return pd.DataFrame(columns=COLS)
    if not text.lstrip().lower().startswith("latitude"):
        raise FirmsError(text.strip()[:200])
    d = pd.read_csv(io.StringIO(text), dtype={"acq_time": str})
    t = d["acq_time"].astype(str).str.replace(":", "", regex=False).str.zfill(4)
    return pd.DataFrame({
        "sensor": sensor, "source": source, "lat": d["latitude"], "lon": d["longitude"],
        "acq_date": d["acq_date"].astype(str), "acq_time": t,
        "frp": pd.to_numeric(d.get("frp"), errors="coerce"),
        "conf_level": d["confidence"].map(_conf_level) if "confidence" in d else "nominal",
        "daynight": d.get("daynight", ""),
    })[COLS]


def _store(conn, df, source, bb, start, days):
    if len(df):
        conn.executemany(
            "INSERT OR IGNORE INTO hotspots VALUES(?,?,?,?,?,?,?,?,?)", df[COLS].itertuples(index=False, name=None))
    conn.execute("INSERT OR REPLACE INTO chunks VALUES(?,?,?,?,?,?)",
                 (source, bb, start.isoformat(), days, datetime.now(timezone.utc).isoformat(), len(df)))
    conn.commit()


def _fresh(conn, source, bb, start, days, today):
    r = conn.execute("SELECT fetched_at FROM chunks WHERE source=? AND bbox=? AND start=? AND days=?",
                     (source, bb, start.isoformat(), days)).fetchone()
    if not r:
        return False
    if (start + timedelta(days=days) - today).days > -10:
        age = datetime.now(timezone.utc) - datetime.fromisoformat(r[0])
        return age < timedelta(hours=3)
    return True


async def ensure_data(conn, map_key, bbox, start, end, progress=None, concurrency=2):
    import httpx
    today = datetime.now(timezone.utc).date()
    bb = bbox_key(bbox)
    todo = [c for c in plan_chunks(start, end, today) if not _fresh(conn, c[1], bb, c[2], c[3], today)]
    total, done, sem = len(todo), 0, asyncio.Semaphore(concurrency)
    area = ",".join(str(v) for v in bbox)

    async def one(client, sensor, src, s, n):
        nonlocal done
        url = f"{BASE}/area/csv/{map_key}/{src}/{area}/{n}/{s.isoformat()}"
        async with sem:
            for attempt in range(12):
                try:
                    r = await client.get(url)
                    if r.status_code == 200:
                        df = parse_csv(r.text, sensor, src)
                        _store(conn, df, src, bb, s, n)
                        break
                    if r.status_code in (429, 500, 502, 503, 504):
                        await asyncio.sleep(min(2 ** attempt * 2, 60))
                        continue
                    if r.status_code == 400 and "transaction limit" in r.text.lower():
                        # Límite de la MAP_KEY (por ventana de 10 min): esperar y reintentar.
                        await asyncio.sleep(75)
                        continue
                    raise FirmsError(f"HTTP {r.status_code}: {r.text[:120]}")
                except httpx.TransportError:
                    await asyncio.sleep(min(2 ** attempt, 30))
            else:
                raise FirmsError(f"gave up on {src} {s}")
        done += 1
        if progress:
            progress(done, total, f"{src} {s}")

    if not total:
        return 0
    async with httpx.AsyncClient(timeout=90) as client:
        await asyncio.gather(*(one(client, *c) for c in todo))
    return total


def load(conn, bbox, start, end) -> pd.DataFrame:
    w, s, e, n = bbox
    d = pd.read_sql_query(
        "SELECT * FROM hotspots WHERE acq_date BETWEEN ? AND ? AND lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?",
        conn, params=(start.isoformat(), end.isoformat(), s, n, w, e))
    d["date"] = pd.to_datetime(d.pop("acq_date"))
    return d


async def availability(map_key):
    import httpx
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.get(f"{BASE}/data_availability/csv/{map_key}/ALL")
        return r.text