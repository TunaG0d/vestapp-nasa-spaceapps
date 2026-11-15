import unittest
from datetime import date

import pandas as pd

import analysis


def row(sensor, lat, lon, day, frp=10):
    return dict(sensor=sensor, lat=lat, lon=lon, date=pd.Timestamp(day), acq_time="1230",
                frp=frp, conf_level="high", daynight="D")


class HarmonizeTests(unittest.TestCase):
    def test_grid_collapses_duplicates_and_scales_modis(self):
        rows = []
        for i in range(40):
            lat = -30 + i * 0.02
            rows.append(row("MODIS", lat, -71.0, "2020-01-10"))
            rows.append(row("VIIRS", lat, -69.0, "2020-01-10", frp=12))
        rows.append(row("MODIS", -34.50, -71.20, "2020-02-02", frp=20))
        rows.append(row("MODIS", -34.5004, -71.2003, "2020-02-02", frp=8))
        rows.append(row("VIIRS", -34.5002, -71.2001, "2020-02-02", frp=30))
        rows.append(row("VIIRS", -34.5003, -71.2002, "2020-02-02", frp=15))
        rows.append(row("MODIS", -34.50, -71.20, "2008-01-15", frp=9))
        df = analysis.prepare(pd.DataFrame(rows))
        events, impact = analysis.harmonize(df)
        self.assertEqual(impact["raw"]["total"], 40 + 40 + 4 + 1)
        self.assertEqual(impact["cross_sensor_cells"], 1)
        self.assertGreater(impact["duplicates_removed"], 0)
        self.assertAlmostEqual(impact["overall_factor"], 81 / 41, places=2)
        old = events[events.date.dt.year == 2008]
        self.assertEqual(len(old), 1)
        self.assertAlmostEqual(float(old.weight.iloc[0]), 2.0, places=2)
        both = events[events.sensor == "BOTH"]
        self.assertEqual(len(both), 1)
        self.assertEqual(float(both.weight.iloc[0]), 1.0)

    def test_calendar_median_ytd_and_diagnosis(self):
        rows = [row("MODIS", -34.5, -71.2, "2020-01-10"), row("VIIRS", -34.6, -71.1, "2020-01-11")]
        df = analysis.prepare(pd.DataFrame(rows))
        res = analysis.run(df, date(2020, 1, 1), date(2020, 1, 31), 30, False)
        self.assertEqual(len(res["calendar"]["median"]), 12)
        self.assertEqual(res["ytd"]["years"][0]["year"], 2020)
        self.assertIn("impact", res)
        diag = analysis.diagnose(
            {"last_7d_z": 3.4, "last_7d": 20},
            {"available": True, "selected": "xgboost", "for_week": "hoy", "cells": [{"p": 0.8}] * 8},
            {"elevation_m": 120, "days": [{"date": "2099-01-01", "index": 90, "level": "extreme"}]},
        )
        self.assertEqual(diag["level"], "ALTO")
        aud = analysis.audiences(diag, res["alerts"], res["impact"], res["forecast"], res["kpis"])
        self.assertIn("autoridad", " ".join(aud["civil"]["actions"]).lower())
        self.assertNotEqual(aud["civil"]["headline"], aud["bombero"]["headline"])
        kept = analysis.filter_alerts(
            [{"level": "info", "type": "intense", "proactive": False, "message": "x"},
             {"level": "warning", "type": "weather", "proactive": True, "message": "y"}],
            {"reactive": True, "proactive": False, "minLevel": "info", "types": {}},
        )
        self.assertEqual([a["type"] for a in kept], ["intense"])


if __name__ == "__main__":
    unittest.main()
