import calendar
from datetime import date

import numpy as np
import pandas as pd
from sklearn.neighbors import BallTree

EARTH_KM = 111.32
WX_ES = {"low": "bajo", "moderate": "moderado", "high": "alto", "extreme": "extremo"}
RANK = {"info": 0, "warning": 1, "critical": 2}


def cell_index(lat, lon):
    lat = np.asarray(lat, float)
    lon = np.asarray(lon, float)
    i = np.floor(lat * EARTH_KM).astype(np.int32)
    cos = np.cos(np.deg2rad(np.clip(lat, -80, 80)))
    j = np.floor(lon * EARTH_KM * np.maximum(cos, 0.15)).astype(np.int32)
    return i, j


def prepare(df):
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"])
    if "acq_hour" not in df.columns:
        df["acq_hour"] = df["acq_time"].astype(str).str.replace(":", "", regex=False).str.zfill(4).str[:2].astype(int)
    df["daynight"] = df["daynight"].fillna("").astype(str) if "daynight" in df.columns else ""
    return df


def _by_month(dates, weights=None):
    idx = pd.DatetimeIndex(pd.to_datetime(dates))
    w = np.ones(len(idx)) if weights is None else np.asarray(weights, float)
    if len(idx) == 0:
        return pd.Series(dtype=float)
    return pd.Series(w, index=idx).groupby(idx.month).sum()


def scale_factors(events):
    base = {m: 1.0 for m in range(1, 13)}
    vii = events[events.is_viirs == 1]
    mod = events[events.is_modis == 1]
    if vii.empty or mod.empty:
        return base, None, None, None
    vmin, vmax = vii.date.min(), vii.date.max()
    ov = events[(events.date >= vmin) & (events.date <= vmax)]
    if ov.empty:
        return base, None, vmin, vmax
    union = ov.groupby(ov.date.dt.month).size()
    mod_ov = ov[ov.is_modis == 1]
    modis_m = mod_ov.groupby(mod_ov.date.dt.month).size()
    if modis_m.sum() == 0 or union.sum() == 0:
        return base, None, vmin, vmax
    overall = float(union.sum() / modis_m.sum())
    factors = {}
    for m in range(1, 13):
        mv, uv = float(modis_m.get(m, 0)), float(union.get(m, 0))
        factors[m] = uv / mv if mv >= 30 and uv > 0 else overall
    return factors, overall, vmin, vmax


def harmonize(df):
    raw = {
        "total": int(len(df)),
        "modis": int((df.sensor == "MODIS").sum()) if len(df) else 0,
        "viirs": int((df.sensor == "VIIRS").sum()) if len(df) else 0,
    }
    empty_impact = {
        "grid_km": 1, "raw": raw, "after_same_sensor": 0, "intrasensor_duplicates_removed": 0,
        "cross_sensor_cells": 0, "harmonized_cells": 0, "duplicates_removed": 0, "reduction_pct": 0.0,
        "factors": {m: 1.0 for m in range(1, 13)}, "overall_factor": None, "by_month": [],
    }
    if df.empty:
        return df, empty_impact
    d = df.copy()
    d["frp_fill"] = pd.to_numeric(d["frp"], errors="coerce").fillna(-1)
    d["cell_i"], d["cell_j"] = cell_index(d["lat"], d["lon"])
    d["day"] = d["date"].dt.normalize()
    keys = ["day", "cell_i", "cell_j", "sensor"]
    counts = d.groupby(keys, sort=False).size().rename("n_det").reset_index()
    one = d.loc[d.groupby(keys, sort=False)["frp_fill"].idxmax(),
                ["day", "cell_i", "cell_j", "sensor", "lat", "lon", "frp", "daynight", "acq_hour"]].copy()
    one = one.merge(counts, on=keys, how="left")
    intra_removed = raw["total"] - int(len(one))
    one["is_modis"] = (one.sensor == "MODIS").astype(int)
    one["is_viirs"] = (one.sensor == "VIIRS").astype(int)
    events = one.groupby(["day", "cell_i", "cell_j"], sort=False).agg(
        lat=("lat", "mean"), lon=("lon", "mean"), frp=("frp", "max"),
        acq_hour=("acq_hour", "mean"), n_det=("n_det", "sum"),
        is_modis=("is_modis", "max"), is_viirs=("is_viirs", "max"),
        daynight=("daynight", "first"),
    ).reset_index()
    events["sensor"] = np.where((events.is_modis == 1) & (events.is_viirs == 1), "BOTH",
                                 np.where(events.is_viirs == 1, "VIIRS", "MODIS"))
    events["date"] = pd.to_datetime(events["day"])
    factors, overall, vmin, vmax = scale_factors(events)
    events["weight"] = 1.0
    if vmin is not None:
        outside = (events.sensor == "MODIS") & ((events.date < vmin) | (events.date > vmax))
        events.loc[outside, "weight"] = events.loc[outside, "date"].dt.month.map(factors).astype(float).to_numpy()
    removed = raw["total"] - int(len(events))
    rm, rv = _by_month(d.loc[d.sensor == "MODIS", "date"]), _by_month(d.loc[d.sensor == "VIIRS", "date"])
    hh = _by_month(events["date"], events["weight"])
    impact = {
        "grid_km": 1,
        "raw": raw,
        "after_same_sensor": int(len(one)),
        "intrasensor_duplicates_removed": int(intra_removed),
        "cross_sensor_cells": int(((events.is_modis == 1) & (events.is_viirs == 1)).sum()),
        "harmonized_cells": int(len(events)),
        "duplicates_removed": int(removed),
        "reduction_pct": round(100 * removed / raw["total"], 1) if raw["total"] else 0.0,
        "factors": {int(k): round(float(v), 3) for k, v in factors.items()},
        "overall_factor": None if overall is None else round(float(overall), 3),
        "by_month": [
            {"month": m, "raw_modis": round(float(rm.get(m, 0)), 1), "raw_viirs": round(float(rv.get(m, 0)), 1),
             "harmonized": round(float(hh.get(m, 0)), 1)}
            for m in range(1, 13)
        ],
    }
    return events, impact


def daily_series(events, start, end):
    idx = pd.date_range(start, end, freq="D")
    if events.empty:
        return pd.Series(0.0, index=idx)
    ev = events.dropna(subset=["weight"])
    return ev.groupby(ev["date"].dt.normalize())["weight"].sum().reindex(idx, fill_value=0.0)


def calendar_table(daily):
    idx = daily.index
    m = daily.groupby([idx.year, idx.month]).sum()
    n = daily.groupby([idx.year, idx.month]).size()
    years = sorted(set(idx.year))
    vals, partial = [], []
    for y in years:
        vals.append([float(m.get((y, k), np.nan)) for k in range(1, 13)])
        partial.append([bool(n.get((y, k), 0) < calendar.monthrange(y, k)[1]) for k in range(1, 13)])
    V = np.array(vals, dtype=float)
    P = np.array(partial)
    full = np.where(P | np.isnan(V), np.nan, V)
    cnt = np.sum(~np.isnan(full), axis=0)
    ssum = np.nansum(full, axis=0)
    anom = np.full_like(V, np.nan)
    for i in range(len(years)):
        for k in range(12):
            if np.isnan(V[i, k]):
                continue
            own = 0.0 if np.isnan(full[i, k]) else full[i, k]
            n_other = cnt[k] - (0 if np.isnan(full[i, k]) else 1)
            if n_other >= 2:
                mu = (ssum[k] - own) / n_other
                if mu > 0:
                    anom[i, k] = (V[i, k] - mu) / mu * 100
    med = np.array([
        np.nanmedian(full[:, k]) if np.isfinite(full[:, k]).any() else np.nan
        for k in range(12)
    ])
    median = [None if not np.isfinite(x) else round(float(x), 1) for x in med]
    return {
        "years": [int(y) for y in years],
        "values": np.round(V, 1).tolist(),
        "anomaly_pct": np.round(anom, 1).tolist(),
        "partial": P.tolist(),
        "median": median,
    }


def ytd_compare(daily):
    if daily.empty:
        return {"through": None, "day_of_year": 0, "years": [], "monthly": []}
    last = daily.index.max()
    doy = int(min(int(last.day_of_year), 365))
    month_cut, day_cut = int(last.month), int(last.day)
    years, monthly = [], []
    for y, g in daily.groupby(daily.index.year):
        sl = g[g.index.day_of_year <= doy]
        if sl.empty:
            continue
        years.append({
            "year": int(y),
            "total": round(float(sl.sum()), 1),
            "days": int(len(sl)),
            "complete": bool(g.index.day_of_year.min() <= 3 and sl.index.day_of_year.max() >= doy - 1),
        })
        vals = []
        for m in range(1, month_cut + 1):
            if m < month_cut:
                mask = (daily.index.year == y) & (daily.index.month == m)
            else:
                mask = (daily.index.year == y) & (daily.index.month == m) & (daily.index.day <= day_cut)
            vals.append(round(float(daily[mask].sum()), 1))
        monthly.append({"year": int(y), "months": vals})
    return {"through": str(last.date()), "day_of_year": doy, "years": years, "monthly": monthly}


def rolling_z(daily, window=7):
    r = daily.rolling(window, min_periods=window).sum().dropna()
    if r.empty:
        return pd.DataFrame(columns=["x", "mean", "z"])
    d = pd.DataFrame({"x": r, "doy": np.minimum(r.index.day_of_year, 365), "yr": r.index.year})
    g = d.groupby("doy")["x"]
    n, s, s2 = g.transform("count"), g.transform("sum"), g.transform(lambda x: (x ** 2).sum())
    n1 = n - 1
    mu = (s - d.x) / n1.where(n1 > 0)
    var = ((s2 - d.x ** 2) / n1.where(n1 > 0)) - mu ** 2
    sd = np.sqrt(var.clip(lower=0)).clip(lower=max(1.0, 0.25 * float(r.mean() or 1)))
    z = (d.x - mu) / sd
    z[n1 < 2] = np.nan
    return pd.DataFrame({"x": d.x, "mean": mu, "z": z})


def crossref(df, days=30, radius_km=1.0):
    end = df.date.max()
    d = df[df.date > end - pd.Timedelta(days=days)]
    res = {"days": days, "radius_km": radius_km, "modis_total": 0, "modis_confirmed": 0, "viirs_total": 0, "viirs_confirmed": 0}
    for _, g in d.groupby(d.date.dt.normalize()):
        a, b = g[g.sensor == "MODIS"], g[g.sensor == "VIIRS"]
        res["modis_total"] += len(a)
        res["viirs_total"] += len(b)
        if len(a) and len(b):
            tree = BallTree(np.radians(b[["lat", "lon"]].to_numpy()), metric="haversine")
            dist, _ = tree.query(np.radians(a[["lat", "lon"]].to_numpy()), k=1)
            res["modis_confirmed"] += int((dist[:, 0] * 6371.0 <= radius_km).sum())
            tree2 = BallTree(np.radians(a[["lat", "lon"]].to_numpy()), metric="haversine")
            dist2, _ = tree2.query(np.radians(b[["lat", "lon"]].to_numpy()), k=1)
            res["viirs_confirmed"] += int((dist2[:, 0] * 6371.0 <= radius_km).sum())
    res["modis_confirmed_pct"] = round(100 * res["modis_confirmed"] / res["modis_total"], 1) if res["modis_total"] else None
    res["viirs_confirmed_pct"] = round(100 * res["viirs_confirmed"] / res["viirs_total"], 1) if res["viirs_total"] else None
    return res


def alerts(events, daily, z):
    out, last = [], daily.index.max()
    if len(z):
        zl = z.iloc[-1]
        if np.isfinite(zl["z"]) and zl["z"] >= 2:
            level = "critical" if zl["z"] >= 3 else "warning"
            out.append(dict(
                level=level, type="count", proactive=False, date=str(z.index[-1].date()),
                lat=None, lon=None,
                message=(f"Suma de 7 días: {zl['x']:.0f} focos armonizados, {zl['z']:.1f}σ sobre "
                         f"lo habitual para esta fecha ({zl['mean']:.0f})."),
            ))
    d = events.dropna(subset=["weight"])
    d = d[d.weight > 0]
    if d.empty:
        return out
    recent = d[d.date > last - pd.Timedelta(days=3)]
    past = d[d.date <= last - pd.Timedelta(days=365 - 15)]
    doy = past.date.dt.day_of_year
    tdoy = int(last.day_of_year)
    near = past[((doy - tdoy + 183) % 365 - 183).abs() <= 15]
    seen = {(int(a), int(b)) for a, b in zip(near.cell_i, near.cell_j)}
    if len(past) and len(recent):
        mask = [(int(a), int(b)) not in seen for a, b in zip(recent.cell_i.to_numpy(), recent.cell_j.to_numpy())]
        fresh = recent.iloc[np.flatnonzero(np.asarray(mask, dtype=bool))]
        top = fresh.groupby(["cell_i", "cell_j"]).size().sort_values(ascending=False).head(8)
        for (ci, cj), n in top.items():
            sample = fresh[(fresh.cell_i == ci) & (fresh.cell_j == cj)].iloc[0]
            out.append(dict(
                level="warning", type="new_area", proactive=False, date=str(last.date()),
                lat=round(float(sample.lat), 3), lon=round(float(sample.lon), 3),
                message=(f"{int(n)} foco(s) en una celda de 1 km sin incendios en esta época "
                         f"dentro de la historia cargada. Centro aprox. {sample.lat:.2f}, {sample.lon:.2f}."),
            ))
    frp = d["frp"].dropna()
    if len(frp) > 200 and len(recent):
        thr = frp.quantile(0.995)
        hot = recent[recent.frp >= thr].sort_values("frp", ascending=False).head(5)
        for r in hot.itertuples():
            out.append(dict(
                level="info", type="intense", proactive=False, date=str(pd.Timestamp(r.date).date()),
                lat=round(float(r.lat), 3), lon=round(float(r.lon), 3),
                message=f"Foco muy intenso: FRP {r.frp:.0f} MW (percentil 99.5 de la historia), sensor {r.sensor}.",
            ))
    order = {"critical": 0, "warning": 1, "info": 2}
    return sorted(out, key=lambda a: order[a["level"]])


def patterns(events, daily):
    d = events.dropna(subset=["weight"])
    d = d[d.weight > 0]
    mo = daily.groupby([daily.index.year, daily.index.month]).sum().unstack(fill_value=np.nan).reindex(columns=range(1, 13))
    full_years = [y for y in mo.index if not mo.loc[y].isna().any()]
    clim = mo.loc[full_years] if full_years else mo
    monthly = {}
    if len(clim):
        for k, f in {"mean": "mean", "median": "median", "std": "std", "min": "min", "max": "max"}.items():
            monthly[k] = [None if not np.isfinite(v) else round(float(v), 1) for v in clim.agg(f).to_numpy()]
    else:
        monthly = {k: [None] * 12 for k in ("mean", "median", "std", "min", "max")}
    yearly = daily.groupby(daily.index.year).sum()
    yd = {int(y): round(float(v), 1) for y, v in yearly.items()}
    full = [y for y in yearly.index if y in full_years]
    trend = None
    if len(full) >= 5:
        slope = np.polyfit(full, yearly.loc[full].to_numpy(), 1)[0]
        trend = round(100 * slope / max(float(yearly.loc[full].mean()), 1), 2)
    mm = np.nan_to_num(np.array(monthly["mean"], dtype=float))
    order = np.argsort(-mm)
    csum = np.cumsum(mm[order]) / max(mm.sum(), 1e-9)
    peak = sorted(int(order[i]) + 1 for i in range(int(np.searchsorted(csum, 0.5)) + 1)) if mm.sum() else []
    diurnal = np.zeros(24)
    night = None
    if len(d):
        lh = (d.acq_hour.fillna(12) + d.lon / 15.0) % 24
        diurnal = np.histogram(lh, bins=24, range=(0, 24), weights=d.weight)[0]
        night = round(100 * float((d.daynight == "N").mean()), 1)
    return {
        "monthly": monthly, "yearly": yd, "trend_pct_per_year": trend, "peak_months": peak,
        "diurnal_local": (diurnal / max(diurnal.sum(), 1) * 100).round(2).tolist(),
        "night_share_pct": night,
    }


def _score_activity(z):
    if z is None or not np.isfinite(z):
        return 0
    if z < 1:
        return 0
    if z < 2:
        return 1
    if z < 3:
        return 2
    return 3


def _ahead_days(weather):
    days = (weather or {}).get("days") or []
    today = date.today().isoformat()
    ahead = [d for d in days if str(d.get("date")) >= today][:3]
    return ahead or days[-3:]


def weather_peak(weather):
    ahead = _ahead_days(weather)
    if not ahead:
        return None
    return max(float(d.get("index") or 0) for d in ahead)


def diagnose(kpis, forecast, weather):
    z = kpis.get("last_7d_z")
    zf = None if z is None else float(z)
    act = _score_activity(zf)
    ahead = _ahead_days(weather)
    wx = max((float(d.get("index") or 0) for d in ahead), default=None)
    wx_level = None
    if ahead:
        order = {"low": 0, "moderate": 1, "high": 2, "extreme": 3}
        wx_level = max(ahead, key=lambda d: order.get(d.get("level"), 0)).get("level")
    wsc = {"low": 0, "moderate": 1, "high": 2, "extreme": 3}.get(wx_level, 0)
    cells = (forecast or {}).get("cells") or []
    ps = sorted(float(c["p"]) for c in cells)
    if len(ps) >= 5:
        p_ref = ps[int(0.9 * (len(ps) - 1))]
    elif ps:
        p_ref = ps[-1]
    else:
        p_ref = 0.0
    psc = 0 if p_ref < 0.3 else 1 if p_ref < 0.5 else 2 if p_ref < 0.7 else 3
    score = act + wsc + psc
    top = max(act, wsc, psc)
    if score >= 6 or (top == 3 and score >= 5):
        level = "ALTO"
    elif score >= 3 or top >= 2:
        level = "MEDIO"
    else:
        level = "BAJO"
    why = []
    if zf is None:
        why.append("Todavía no hay suficiente historia para comparar la última semana con otros años.")
    else:
        why.append(f"Actividad reciente: la suma de 7 días está a {zf:.1f}σ de lo habitual para esta fecha (puntaje {act}/3).")
    elev = (weather or {}).get("elevation_m") if weather else None
    if wx is None:
        why.append("No se pudo leer la meteorología. El nivel usa focos y, si está, el modelo.")
    else:
        extra = f" Elevación del punto central: {elev:.0f} m." if elev is not None else ""
        why.append(f"Meteorología de los próximos días: índice {wx:.0f} ({WX_ES.get(wx_level, wx_level)}), puntaje {wsc}/3.{extra}")
    if forecast and forecast.get("available"):
        why.append(
            f"Modelo ({forecast.get('selected')}): referencia de probabilidad {p_ref:.0%} "
            f"para la semana {forecast.get('for_week')} (puntaje {psc}/3)."
        )
    else:
        why.append("Modelo no publicado. " + ((forecast or {}).get("note") or ""))
    return {
        "level": level, "score": int(score),
        "activity": {"score": act, "z": None if zf is None else round(zf, 2), "last_7d": kpis.get("last_7d")},
        "weather": {"score": wsc, "index": None if wx is None else round(wx, 1), "level": wx_level,
                    "level_es": None if wx_level is None else WX_ES.get(wx_level, wx_level),
                    "elevation_m": elev},
        "model": {"score": psc, "p_ref": round(float(p_ref), 3), "selected": (forecast or {}).get("selected"),
                  "for_week": (forecast or {}).get("for_week"), "available": bool((forecast or {}).get("available"))},
        "why": why,
    }


def situational_alerts(diag, forecast):
    out = []
    today = date.today().isoformat()
    w = diag["weather"]
    if w["score"] >= 2 and w["index"] is not None:
        elev = f" Elevación {w['elevation_m']:.0f} m." if w.get("elevation_m") is not None else ""
        out.append(dict(
            level="critical" if w["score"] >= 3 else "warning", type="weather", proactive=True,
            date=today, lat=None, lon=None,
            message=(f"Índice meteorológico {w['index']:.0f} ({w.get('level_es')}) para los próximos días.{elev} "
                     "No es el FWI canadiense: combina temperatura, humedad mínima, viento y racha seca."),
        ))
    m = diag["model"]
    if m["score"] >= 2 and m.get("available"):
        out.append(dict(
            level="critical" if m["score"] >= 3 else "warning", type="forecast", proactive=True,
            date=today, lat=None, lon=None,
            message=(f"Semana {m.get('for_week')}: probabilidad de referencia {m['p_ref']:.0%} "
                     f"con el modelo seleccionado ({m.get('selected')})."),
        ))
    return out


_CIVIL = {
    "count": "En la última semana hubo más focos de lo normal para esta época. Evitá cualquier fuego y seguí los avisos oficiales.",
    "new_area": "Apareció fuego en un lugar que, en esta época, no solía quemarse. No te acerques y avisá a las autoridades si ves llamas o mucho humo.",
    "intense": "Hay un foco muy intenso en la zona. Alejate del humo y esperá la indicación de la autoridad local.",
    "weather": "El tiempo de los próximos días favorece los incendios, aunque hoy se vea tranquilo. No hagas quemas y enterate cómo avisa tu municipio.",
    "forecast": "El modelo ve más chance de fuegos nuevos la semana que viene. Conviene prepararse antes de que haya humo.",
}
_SCIENCE = {
    "count": " Anomalía leave-one-year-out de la suma móvil de 7 días sobre la serie armonizada.",
    "new_area": " Celda de 1 km sin ocupación en una ventana de ±15 días del calendario, en la historia cargada.",
    "intense": " El FRP es potencia radiativa del foco, no superficie quemada.",
    "weather": " Índice propio de esta aplicación, no un FWI oficial.",
    "forecast": " El objetivo es la presencia de al menos un foco en la celda, no su tamaño ni su dirección.",
}
_HEAD = {
    "civil": {
        "BAJO": "Por ahora, la actividad de fuego en esta zona está dentro de lo habitual.",
        "MEDIO": "La zona merece atención: hay más fuego de lo usual o condiciones que lo favorecen.",
        "ALTO": "Riesgo alto en la zona elegida. Priorizá la precaución y los avisos oficiales.",
    },
    "bombero": {
        "BAJO": "Sin anomalía relevante de focos ni meteorología de corto plazo para el área.",
        "MEDIO": "Condición elevada. Conviene reforzar el reconocimiento de celdas nuevas y el pronóstico de 7 días.",
        "ALTO": "Condición crítica para el área. Revisá focos nuevos, FRP alto y celdas de mayor probabilidad.",
    },
    "cientifico": {
        "BAJO": "La serie armonizada no muestra una anomalía conjunta destacada en actividad, meteorología o modelo.",
        "MEDIO": "Hay una señal moderada en al menos uno de los tres indicadores: anomalía, meteorología o modelo.",
        "ALTO": "Coinciden señales fuertes de anomalía, meteorología y/o probabilidad de ignición.",
    },
}
_ACTIONS = {
    "civil": {
        "BAJO": [
            "No inicies quemas ni fogatas sin el permiso que exija tu municipio.",
            "Mantené despejado el perímetro de la vivienda: hojas, pasto seco y ramas.",
            "Conocé dos caminos de salida y cómo se entera tu familia de un aviso oficial.",
        ],
        "MEDIO": [
            "Evitá herramientas que tiren chispas y cualquier quema a cielo abierto.",
            "Tené a mano documentos, agua y el teléfono cargado.",
            "No estaciones sobre banquinas ni caminos que puedan usar los bomberos.",
            "Si ves una columna de humo, avisá a la autoridad local. No intentes apagarlo.",
        ],
        "ALTO": [
            "Seguí únicamente la instrucción de protección civil, municipio o bomberos.",
            "Si ordenan evacuar, hacelo enseguida y no vuelvas hasta que lo habiliten.",
            "Cerrá ventanas si hay humo. Cortá el gas solo si la autoridad te lo indica.",
            "No te acerques a ver el fuego ni bloquees los accesos.",
        ],
    },
    "bombero": {
        "BAJO": [
            "La ficha no muestra un desvío que justifique un refuerzo por esta vía.",
            "Igual contrastá con el parte de la central: esta vista no es una orden de despacho.",
            "Las celdas del mapa son de 1 km y pueden agrupar varios frentes chicos.",
        ],
        "MEDIO": [
            "Revisá las celdas marcadas como área nueva: no tienen antecedente en esta época.",
            "Usá el FRP solo como orden de intensidad relativa, no como tamaño del incendio.",
            "El pronóstico semanal marca dónde es más probable un foco nuevo, no hacia dónde corre.",
            "Contrastá viento y racha seca del panel meteorológico con el parte local.",
        ],
        "ALTO": [
            "Priorizá reconocimiento en celdas nuevas y en las de mayor probabilidad del mapa.",
            "Hay coincidencia de anomalía de focos, meteorología o modelo: no esperes a que cierre el día.",
            "Esta alerta no reemplaza el protocolo de la institución ni el despacho de la central.",
            "Registrá accesos libres: el aviso civil pide no bloquear caminos.",
        ],
    },
    "cientifico": {
        "BAJO": [
            "La comparación de la última semana sale de una anomalía leave-one-year-out.",
            "Los conteos son celdas-día de 1 km, escalados solo en meses sin VIIRS.",
            "Un nivel bajo no descarta incendios bajo nube o por debajo de la sensibilidad del sensor.",
        ],
        "MEDIO": [
            "Separá la señal: actividad (σ de 7 días), meteorología regional y probabilidad de la celda.",
            "El calendario y el año en curso usan la misma serie armonizada, así que son comparables entre sí.",
            "No interpretes el total como área quemada ni como cantidad de incendios independientes.",
        ],
        "ALTO": [
            "Conviene mirar el holdout del modelo antes de citar la probabilidad: si ganó la climatología, el mapa es estacional.",
            "Las celdas MODIS+VIIRS del mismo día cuentan una sola vez; el porcentaje de duplicados está en el impacto.",
            "El índice meteorológico es un proxy local, no un producto de peligro de incendio de una agencia.",
        ],
    },
}


def present_alert(alert, role):
    if role == "civil":
        text = _CIVIL.get(alert["type"], "Seguí los avisos de la autoridad local.")
    elif role == "cientifico":
        text = alert["message"] + _SCIENCE.get(alert["type"], "")
    else:
        text = alert["message"]
    return {**alert, "message": text}


def filter_alerts(alerts, prefs):
    prefs = prefs or {}
    types = prefs.get("types") or {}
    min_r = RANK.get(prefs.get("minLevel", "info"), 0)
    out = []
    for a in alerts:
        if types and not types.get(a["type"], True):
            continue
        if a.get("proactive") and not prefs.get("proactive", True):
            continue
        if not a.get("proactive") and not prefs.get("reactive", True):
            continue
        if RANK.get(a["level"], 0) < min_r:
            continue
        out.append(a)
    return out


def audiences(diag, alerts, impact, forecast, kpis):
    level = diag["level"]
    out = {}
    for role in ("civil", "bombero", "cientifico"):
        shown = [present_alert(a, role) for a in alerts]
        item = {
            "role": role,
            "risk": level,
            "headline": _HEAD[role][level],
            "actions": _ACTIONS[role][level],
            "alerts": shown,
        }
        if role == "cientifico":
            metrics = (forecast or {}).get("metrics") or {}
            item["method"] = {
                "overall_factor": (impact or {}).get("overall_factor"),
                "reduction_pct": (impact or {}).get("reduction_pct"),
                "duplicates_removed": (impact or {}).get("duplicates_removed"),
                "selected_model": (forecast or {}).get("selected"),
                "roc_auc": metrics.get("roc_auc"),
                "auc_climatology_only": metrics.get("auc_climatology_only"),
                "harmonized_total": kpis.get("viirs_equivalent_total"),
            }
        out[role] = item
    return out


def run(df, start, end, crossref_days=30, with_forecast=True):
    from forecast import forecast
    if df.empty:
        return {"empty": True}
    df = prepare(df)
    events, impact = harmonize(df)
    daily = daily_series(events, pd.Timestamp(start), pd.Timestamp(end))
    z = rolling_z(daily)
    cal = calendar_table(daily)
    pat = patterns(events, daily)
    notes = []
    if impact["overall_factor"]:
        vals = [v for v in impact["factors"].values() if v]
        notes.append(
            f"En la grilla de 1 km, la unión de sensores equivale a ×{impact['overall_factor']:.2f} los focos MODIS "
            f"(factores mensuales ×{min(vals):.1f}–{max(vals):.1f}). "
            "Cada celda-día con VIIRS cuenta una vez; los meses anteriores a VIIRS se escalan con ese factor."
        )
    else:
        notes.append("No hubo superposición suficiente de MODIS y VIIRS para calibrar el factor. Las celdas cuentan una vez, sin escalar.")
    if impact["duplicates_removed"]:
        notes.append(
            f"Se unificaron {impact['duplicates_removed']} detecciones repetidas ({impact['reduction_pct']}%): "
            "varias lecturas del mismo día en la misma celda de 1 km, del mismo sensor o de los dos."
        )
    both = (df.sensor == "MODIS").any() and (df.sensor == "VIIRS").any()
    z_last = None if not len(z) or not np.isfinite(z.z.iloc[-1]) else round(float(z.z.iloc[-1]), 2)
    out = {
        "kpis": {
            "hotspots_total": impact["raw"]["total"],
            "modis": impact["raw"]["modis"],
            "viirs": impact["raw"]["viirs"],
            "harmonized_cells": impact["harmonized_cells"],
            "viirs_equivalent_total": round(float(daily.sum()), 0),
            "first": str(df.date.min().date()),
            "last": str(df.date.max().date()),
            "last_7d": round(float(daily.tail(7).sum()), 0),
            "last_7d_z": z_last,
        },
        "factors": impact["factors"],
        "impact": impact,
        "calendar": cal,
        "ytd": ytd_compare(daily),
        "patterns": pat,
        "alerts": alerts(events, daily, z),
        "crossref": crossref(df, crossref_days) if both else None,
        "recent_daily": [{"date": str(i.date()), "count": round(float(v), 1)} for i, v in daily.tail(60).items()],
        "notes": notes,
    }
    out["forecast"] = forecast(events) if with_forecast else {"available": False, "note": "Pronóstico desactivado."}
    return out
