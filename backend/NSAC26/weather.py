import httpx, numpy as np, pandas as pd

URL = "https://api.open-meteo.com/v1/forecast"


def _clip(x, lo, hi):
    return float(np.clip((x - lo) / (hi - lo), 0, 1))


def score_days(daily: pd.DataFrame) -> pd.DataFrame:
    dry, run = [], 0
    for p in daily["precip"]:
        run = 0 if p >= 2 else run + 1
        dry.append(run)
    daily = daily.assign(dry_days=dry)
    daily["index"] = [
        round(100 * (0.25 * _clip(r.tmax, 15, 38) + 0.30 * _clip(60 - r.rhmin, 0, 48)
                     + 0.15 * _clip(r.wmax, 10, 50) + 0.30 * _clip(r.dry_days, 0, 21)))
        for r in daily.itertuples()]
    daily["level"] = pd.cut(daily["index"], [-1, 34, 54, 74, 101], labels=["low", "moderate", "high", "extreme"]).astype(str)
    return daily


async def conditions(lat, lon, past_days=21, forecast_days=7):
    params = dict(latitude=lat, longitude=lon, timezone="auto", past_days=past_days, forecast_days=forecast_days,
                  hourly="temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation")
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.get(URL, params=params)
        r.raise_for_status()
        payload = r.json()
        h = payload["hourly"]
        elevation = payload.get("elevation")
    d = pd.DataFrame({"t": pd.to_datetime(h["time"]), "T": h["temperature_2m"], "rh": h["relative_humidity_2m"],
                      "w": h["wind_speed_10m"], "p": h["precipitation"]})
    d["date"] = d.t.dt.date
    day = d.groupby("date").agg(tmax=("T", "max"), rhmin=("rh", "min"), wmax=("w", "max"), precip=("p", "sum")).reset_index()
    day = score_days(day.fillna(0))
    day["date"] = day["date"].astype(str)
    return {"elevation_m": None if elevation is None else round(float(elevation), 1), "days": day.to_dict("records")}