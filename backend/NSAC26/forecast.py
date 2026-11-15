import numpy as np
import pandas as pd
from scipy.ndimage import uniform_filter
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import average_precision_score, roc_auc_score

FEATURES = ["l1", "l2", "l4", "l8", "nb1", "nb4", "clim", "sin", "cos", "lat", "lon"]


def _maker():
    try:
        from xgboost import XGBClassifier

        def build(spw):
            return XGBClassifier(
                n_estimators=220, max_depth=6, learning_rate=0.07,
                subsample=0.85, colsample_bytree=0.85, min_child_weight=2,
                reg_lambda=1.0, objective="binary:logistic", eval_metric="logloss",
                scale_pos_weight=spw, tree_method="hist", random_state=0, n_jobs=2, verbosity=0,
            )

        return "xgboost", build
    except Exception:
        def build(_spw):
            return HistGradientBoostingClassifier(max_iter=250, learning_rate=0.07, max_depth=6, random_state=0)

        return "hist_gradient_boosting", build


def forecast(df, factors=None, min_weeks=78):
    d = df.dropna(subset=["weight"])
    d = d[d.weight > 0]
    if d.empty:
        return {"available": False, "note": "No hay focos utilizables para entrenar."}
    t0 = d.date.min().normalize()
    t0 = t0 - pd.Timedelta(days=int(t0.dayofweek))
    wk = ((d.date - t0).dt.days // 7).to_numpy()
    W = int(wk.max()) + 1
    if W < min_weeks:
        return {"available": False, "note": f"Hacen falta unas {min_weeks} semanas de historia (hay {W}). Ampliá el período."}
    complete = (d.date.max() - t0).days % 7 == 6
    W_use = W if complete else W - 1
    span = max(d.lat.max() - d.lat.min(), d.lon.max() - d.lon.min(), 0.01)
    cell = max(0.25, span / 120)
    lat0, lon0 = np.floor(d.lat.min() / cell) * cell, np.floor(d.lon.min() / cell) * cell
    ii = ((d.lat - lat0) // cell).astype(int).to_numpy()
    jj = ((d.lon - lon0) // cell).astype(int).to_numpy()
    nI, nJ = int(ii.max()) + 1, int(jj.max()) + 1
    if W * nI * nJ > 60e6:
        return {"available": False, "note": "El área es demasiado grande para la grilla del modelo. Achicá el recuadro."}
    T = np.zeros((W, nI, nJ), np.float32)
    np.add.at(T, (wk, ii, jj), 1.0)
    T = T[:W_use]
    W = W_use
    wstart = [t0 + pd.Timedelta(weeks=int(k)) for k in range(W + 1)]
    woy = np.array([(s.day_of_year - 1) // 7 for s in wstart])
    active = T.sum(0) >= 3
    if int(active.sum()) < 20:
        return {"available": False, "note": "Muy pocas celdas con historia de fuego para un modelo espacial."}
    ai, aj = np.nonzero(active)
    lat_c, lon_c = lat0 + (ai + .5) * cell, lon0 + (aj + .5) * cell

    def feats(w):
        l1, l2 = T[w], T[max(w - 1, 0)]
        l4, l8 = T[max(w - 3, 0):w + 1].sum(0), T[max(w - 7, 0):w + 1].sum(0)
        nb1 = uniform_filter(l1, 3, mode="constant") * 9 - l1
        nb4 = uniform_filter(l4, 3, mode="constant") * 9 - l4
        tgt = woy[(w + 1) % len(woy)] if w + 1 < len(woy) else (woy[w] + 1) % 53
        prior = [u for u in range(0, w + 1 - 26) if min(abs(int(woy[u]) - int(tgt)), 53 - abs(int(woy[u]) - int(tgt))) <= 1]
        clim = (T[prior] > 0).mean(0) if prior else np.zeros_like(l1)
        ang = 2 * np.pi * tgt / 53
        cols = [l1, l2, l4, l8, nb1, nb4, clim]
        return np.column_stack([c[ai, aj] for c in cols] + [np.full(len(ai), np.sin(ang)), np.full(len(ai), np.cos(ang)), lat_c, lon_c])

    ws = list(range(8, W - 1))
    X = np.vstack([feats(w) for w in ws])
    y = np.concatenate([(T[w + 1][ai, aj] > 0) for w in ws]).astype(int)
    wid = np.repeat(ws, len(ai))
    test_weeks = 52 if len(ws) > 156 else max(12, len(ws) // 5)
    cut = ws[-test_weeks]
    tr, te = wid < cut - 1, wid >= cut
    if len(np.unique(y[tr])) < 2 or len(np.unique(y[te])) < 2:
        return {"available": False, "note": "No hay suficiente variación para validar el modelo."}

    name, build = _maker()
    spw = float(min(20.0, (y[tr] == 0).sum() / max(int((y[tr] == 1).sum()), 1)))
    model = build(spw).fit(X[tr], y[tr])
    p = model.predict_proba(X[te])[:, 1]
    clim_p = X[te][:, FEATURES.index("clim")]
    metrics = {
        "model": name,
        "holdout_weeks": int(test_weeks),
        "base_rate": round(float(y[te].mean()), 4),
        "roc_auc": round(float(roc_auc_score(y[te], p)), 3),
        "avg_precision": round(float(average_precision_score(y[te], p)), 3),
        "auc_climatology_only": round(float(roc_auc_score(y[te], clim_p)), 3),
        "auc_last_week_persistence": round(float(roc_auc_score(y[te], X[te][:, 0] + 0.001 * X[te][:, 2])), 3),
    }
    use_model = metrics["roc_auc"] >= metrics["auc_climatology_only"]
    final_x = feats(W - 1)
    if use_model:
        final = build(spw).fit(X, y)
        pn = final.predict_proba(final_x)[:, 1]
        selected = name
    else:
        pn = final_x[:, FEATURES.index("clim")]
        selected = "climatology"
    order = np.argsort(-pn)[:400]
    nxt = wstart[W]
    return {
        "available": True,
        "selected": selected,
        "for_week": f"{nxt.date()} a {(nxt + pd.Timedelta(days=6)).date()}",
        "cell_deg": float(cell),
        "metrics": metrics,
        "cells": [
            {"lat": round(float(lat_c[k]), 3), "lon": round(float(lon_c[k]), 3), "p": round(float(pn[k]), 3)}
            for k in order if pn[k] >= 0.05
        ],
        "note": (
            "Probabilidad de al menos un foco en la celda durante la semana siguiente. "
            "Se publica el modelo que ganó la validación contra la climatología de la misma época. "
            "La latitud y la longitud representan la variación regional del terreno y del clima."
        ),
    }


def apply_weather(result, index):
    if not result or not result.get("available") or index is None:
        return result
    shift = (float(index) - 40.0) / 70.0

    def adj(p):
        p = float(np.clip(p, 1e-3, 1 - 1e-3))
        z = np.log(p / (1 - p)) + 0.8 * shift
        return float(1 / (1 + np.exp(-z)))

    cells = []
    for c in result.get("cells") or []:
        p = round(adj(c["p"]), 3)
        if p >= 0.05:
            cells.append({**c, "p_raw": c["p"], "p": p})
    cells.sort(key=lambda c: -c["p"])
    note = result.get("note") or ""
    return {
        **result,
        "cells": cells[:400],
        "weather_index": round(float(index), 1),
        "note": note + " Las probabilidades del mapa se ajustaron con el índice meteorológico regional.",
    }
