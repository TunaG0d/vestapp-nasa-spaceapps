"""Series armonizadas reales (MODIS + VIIRS, grilla 1 km) leídas del caché FIRMS.

Sin remapeo de fechas ni valores sintéticos: si no hay datos para la zona/rango,
se devuelve vacío y se informa la cobertura real.
"""
import math
from datetime import date

import numpy as np
import pandas as pd

import analysis, firms

ZONE_BBOX = {  # (west, south, east, north)
    "chile_centro_sur": (-73.8, -38.5, -70.5, -32.5),
    "california": (-124.4, 32.5, -114.1, 42.0),
    "amazonas": (-65.0, -15.0, -55.0, -5.0),
}
MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
MESES_LARGO = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto",
               "Septiembre", "Octubre", "Noviembre", "Diciembre"]


def normalize_sensor(s):
    s = str(s).upper().strip()
    return "VIIRS" if ("VIIRS" in s or s == "V") else "MODIS"


def bbox_from_params(zona, lat=None, lng=None, radio_km=None):
    if zona == "custom" or (lat is not None and lng is not None and radio_km):
        r = float(radio_km or 50)
        dlat = r / 111.0
        dlng = r / (111.0 * max(0.1, math.cos(math.radians(lat))))
        return (round(lng - dlng, 3), round(lat - dlat, 3), round(lng + dlng, 3), round(lat + dlat, 3))
    return ZONE_BBOX.get(zona, ZONE_BBOX["chile_centro_sur"])


def load_events(conn, bbox, start, end):
    """Carga focos reales y los armoniza. Devuelve (eventos, impacto, df_crudo)."""
    df = firms.load(conn, bbox, start, end)
    if df.empty:
        return None, None, df
    df["sensor"] = df["sensor"].map(normalize_sensor)
    ev, impact = analysis.harmonize(analysis.prepare(df))
    return ev, impact, df


def coverage(conn, bbox):
    w, s, e, n = bbox
    r = conn.execute(
        "SELECT MIN(acq_date), MAX(acq_date), COUNT(*) FROM hotspots "
        "WHERE lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?", (s, n, w, e)).fetchone()
    return {"desde": r[0], "hasta": r[1], "focos": r[2]}


_CACHE: dict = {}


def full_daily(conn, bbox):
    """Serie diaria armonizada (celdas-día de 1 km, equivalentes VIIRS) y eventos del área."""
    stamp = conn.execute("SELECT MAX(rowid) FROM hotspots").fetchone()[0]
    key = (bbox, stamp)
    if key in _CACHE:
        return _CACHE[key]
    cov = coverage(conn, bbox)
    if not cov["focos"]:
        _CACHE[key] = None
        return None
    start = date.fromisoformat(cov["desde"])
    end = date.fromisoformat(cov["hasta"])
    ev, impact, _ = load_events(conn, bbox, start, end)
    daily = analysis.daily_series(ev, pd.Timestamp(start), pd.Timestamp(end))
    day = ev.assign(d=ev["date"].dt.normalize())
    frp = day.groupby("d")["frp"].max()
    mod = day.groupby("d")["is_modis"].max()
    vii = day.groupby("d")["is_viirs"].max()
    out = {"daily": daily, "frp": frp, "modis": mod, "viirs": vii, "cov": cov}
    _CACHE.clear()
    _CACHE[key] = out
    return out


def _years_for_baseline(daily, exclude_year):
    """Años con cobertura completa (excluye el año evaluado y años parciales)."""
    idx = daily.index
    first, last = idx.min(), idx.max()
    ys = []
    for y in sorted(set(idx.year)):
        if y == exclude_year:
            continue
        full = (first <= pd.Timestamp(y, 1, 1)) and (last >= pd.Timestamp(y, 12, 31))
        if full:
            ys.append(y)
    return ys


def calendar_daily(conn, bbox, anio):
    s = full_daily(conn, bbox)
    if s is None:
        return []
    daily = s["daily"]
    ys = _years_for_baseline(daily, anio)
    nz = daily[daily > 0]
    q80, q95, q99 = (np.quantile(nz, [0.80, 0.95, 0.99]) if len(nz) else (1, 2, 3))
    out, doy = [], 0
    for m in range(1, 13):
        for d in range(1, [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1] + 1):
            doy += 1
            ts = pd.Timestamp(anio, m, d)
            val = float(daily.get(ts, 0.0))
            base = [float(daily.get(pd.Timestamp(y, m, d), 0.0)) for y in ys]
            med = float(np.median(base)) if base else 0.0
            if med > 0:
                diff = round((val - med) / med * 100, 1)
            else:
                diff = 0.0 if val == 0 else 100.0
            nivel = "CRITICA" if val > q99 else "ALTO" if val > q95 else "MODERADO" if val > q80 else "BAJA"
            sens = []
            if s["modis"].get(ts, 0) == 1:
                sens.append("MODIS")
            if s["viirs"].get(ts, 0) == 1:
                sens.append("VIIRS")
            out.append({
                "fecha": ts.date().isoformat(), "dia_del_anio": doy, "mes_idx": m - 1,
                "mes_nombre": MESES_LARGO[m - 1], "dia_del_mes": d,
                "semana_del_anio": (doy - 1) // 7 + 1, "dia_de_la_semana": (ts.weekday() + 1) % 7,
                "celdas_armonizadas": round(val, 1), "mediana_historica_diaria": round(med, 1),
                "diferencia_pct": diff, "anomalia": bool(diff > 100 and val >= 10),
                "nivel": nivel, "frp_max_dia": round(float(s["frp"].get(ts, 0.0) or 0.0), 1),
                "sensores_activos": " + ".join(sens) if sens else "Sin detecciones",
            })
    return out


def calendar_monthly(conn, bbox, anio):
    s = full_daily(conn, bbox)
    if s is None:
        return []
    daily = s["daily"]
    ys = _years_for_baseline(daily, anio)
    mon = daily.groupby([daily.index.year, daily.index.month]).sum()
    out = []
    for m in range(1, 13):
        base = [float(mon.get((y, m), 0.0)) for y in ys]
        actual = float(mon.get((anio, m), 0.0))
        prom = float(np.mean(base)) if base else 0.0
        med = float(np.median(base)) if base else 0.0
        out.append({"mes": MESES[m - 1], "historico": round(prom), "promedio_historico": round(prom),
                    "mediana_historica": round(med), "actual": round(actual),
                    "anomalia": bool(prom > 0 and actual >= 1.5 * prom)})
    return out


def weekly_climatology(conn, bbox):
    """Esperado semanal (media multianual de celdas-día) por semana del año."""
    s = full_daily(conn, bbox)
    if s is None:
        return None
    daily = s["daily"]
    ys = _years_for_baseline(daily, None)
    if len(ys) < 2:
        return None
    wk = daily[daily.index.year.isin(ys)]
    woy = np.minimum((wk.index.dayofyear - 1) // 7, 51)
    tab = wk.groupby([wk.index.year, woy]).sum().unstack()
    return tab.mean(axis=0).to_numpy(), len(ys)
