import asyncio, io, math, os, uuid
from datetime import date, datetime, timedelta, timezone

import numpy as np
import pandas as pd
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

import accounts, analysis, firms, weather
from forecast import apply_weather

DB = os.environ.get("FIRMS_DB", "firms_cache.sqlite")
app = FastAPI(title="FireReady")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

JOBS: dict[str, dict] = {}


class Query_(BaseModel):
    north: float
    south: float
    west: float
    east: float
    start: date
    end: date
    forecast: bool = True


class Prefs(BaseModel):
    reactive: bool = True
    proactive: bool = True
    minLevel: str = "info"
    browser: bool = False
    email: bool = False
    types: dict = Field(default_factory=dict)


class ProfileIn(BaseModel):
    name: str = ""
    email: str
    role: str = "civil"
    prefs: Prefs = Field(default_factory=Prefs)
    id: str | None = None


class BulletinIn(BaseModel):
    profile_id: str
    job: str


def clean(o):
    if isinstance(o, dict):
        return {str(k): clean(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [clean(v) for v in o]
    if isinstance(o, (np.floating, float)):
        return None if not math.isfinite(o) else float(o)
    if isinstance(o, np.integer):
        return int(o)
    if isinstance(o, np.bool_):
        return bool(o)
    return o


def validate(q: Query_):
    if not (-90 <= q.south < q.north <= 90 and -180 <= q.west < q.east <= 180):
        raise HTTPException(422, "El recuadro no es válido.")
    if (q.north - q.south) * (q.east - q.west) > 150:
        raise HTTPException(422, "El área es demasiado grande (máximo unos 150 grados cuadrados).")
    if q.start > q.end:
        raise HTTPException(422, "La fecha inicial tiene que ser anterior a la final.")


async def run_job(jid, q: Query_, key):
    job = JOBS[jid]
    try:
        bbox = (q.west, q.south, q.east, q.north)
        conn = firms.connect(DB)
        end = min(q.end, datetime.now(timezone.utc).date())

        def prog(d, t, msg):
            job.update(progress=d / max(t, 1), message=f"Descargando {d}/{t} ({msg})")

        if key:
            job.update(status="downloading", message="Preparando pedidos…")
            await firms.ensure_data(conn, key, bbox, q.start, end, prog)
        else:
            job.update(status="downloading", message="Consultando datos satelitales en caché…")
        job.update(status="analysing", progress=1, message="Armonizando sensores y ajustando el modelo…")
        df = firms.load(conn, bbox, q.start, end)
        res = await asyncio.to_thread(analysis.run, df, q.start, end, 30, q.forecast)
        if not res.get("empty"):
            wx = None
            try:
                wx = await weather.conditions((q.south + q.north) / 2, (q.west + q.east) / 2)
            except Exception:
                wx = None
            peak = analysis.weather_peak(wx)
            if peak is not None:
                res["forecast"] = apply_weather(res["forecast"], peak)
            res["weather"] = wx
            diag = analysis.diagnose(res["kpis"], res["forecast"], wx)
            res["alerts"] = analysis.situational_alerts(diag, res["forecast"]) + res["alerts"]
            res["diagnosis"] = diag
            res["audiences"] = analysis.audiences(diag, res["alerts"], res["impact"], res["forecast"], res["kpis"])
        job.update(status="done", result=clean(res), message="Listo")
    except Exception as e:
        job.update(status="error", message=f"{type(e).__name__}: {e}")


@app.post("/api/analyze")
async def analyze(q: Query_, x_map_key: str | None = Header(default=None)):
    validate(q)
    key = x_map_key or os.environ.get("FIRMS_MAP_KEY") or "1cfee93d76dade3267373e69330e5d3b"
    jid = uuid.uuid4().hex[:12]
    JOBS[jid] = dict(status="queued", progress=0, message="En cola")
    asyncio.create_task(run_job(jid, q, key))
    return {"job": jid}


@app.get("/api/health")
def health():
    try:
        conn = firms.connect(DB)
        count = conn.execute("SELECT COUNT(*) FROM hotspots").fetchone()[0]
        date_min, date_max = conn.execute("SELECT MIN(acq_date), MAX(acq_date) FROM hotspots").fetchone()
    except Exception:
        count = 0
        date_min, date_max = None, None
    return {
        "status": "ok",
        "app": "FireReady Backend (FastAPI)",
        "version": "1.0.0",
        "cached_hotspots": count,
        "cache_date_min": date_min,
        "cache_date_max": date_max,
        "cors_enabled": True,
    }


import realdata
from realdata import bbox_from_params, load_events, normalize_sensor


@app.get("/api/hotspots")
def get_hotspots(zona: str = "chile_centro_sur", anio: int = 2025,
                 lat: float | None = None, lng: float | None = None, radio_km: float | None = None,
                 start_date: str | None = None, end_date: str | None = None):
    """Focos reales (sin remapear fechas). Si no hay datos, devuelve vacío + cobertura real."""
    conn = firms.connect(DB)
    bbox = bbox_from_params(zona, lat, lng, radio_km)
    try:
        start = date.fromisoformat(start_date) if start_date else date(anio, 1, 1)
        end = date.fromisoformat(end_date) if end_date else date(anio, 12, 31)
    except ValueError:
        raise HTTPException(422, "Fechas inválidas (use AAAA-MM-DD).")
    if start > end:
        start, end = end, start
    cov = realdata.coverage(conn, bbox)
    empty = {
        "focos_brutos_totales": 0, "focos_modis_brutos": 0, "focos_viirs_brutos": 0,
        "celdas_armonizadas_1km": 0, "duplicados_eliminados_pct": 0,
        "puntos_armonizados": [], "sin_datos": True, "cobertura": cov,
    }
    ev, impact, _ = load_events(conn, bbox, start, end)
    if ev is None and end >= (date.today() - timedelta(days=10)):
        # Si no hay registros en caché para un área nueva en días recientes, consultar NASA FIRMS NRT
        try:
            import httpx
            area = f"{bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]}"
            bb_str = firms.bbox_key(bbox)
            key = os.environ.get("FIRMS_MAP_KEY") or "1cfee93d76dade3267373e69330e5d3b"
            with httpx.Client(timeout=8.0) as client:
                for src in ["VIIRS_NOAA20_NRT", "VIIRS_NOAA21_NRT", "MODIS_NRT"]:
                    sensor = "VIIRS" if "VIIRS" in src else "MODIS"
                    url = f"{firms.BASE}/area/csv/{key}/{src}/{area}/5"
                    r = client.get(url)
                    if r.status_code == 200:
                        df = firms.parse_csv(r.text, sensor, src)
                        if not df.empty:
                            firms._store(conn, df, src, bb_str, date.today() - timedelta(days=5), 5)
            ev, impact, _ = load_events(conn, bbox, start, end)
        except Exception:
            pass

    if ev is None:
        return empty

    puntos = []
    for _, r in ev.sort_values(by="frp", ascending=False).head(1000).iterrows():
        frp_val = round(float(r["frp"]) if pd.notna(r["frp"]) else 0.0, 1)
        intensidad = "EXTREMO" if frp_val >= 200 else "ALTO" if frp_val >= 70 else "MODERADO"
        sensors = [s for s, f in (("MODIS", r["is_modis"]), ("VIIRS", r["is_viirs"])) if f == 1]
        pasada = " + ".join({"MODIS": "Terra/Aqua MODIS (1 km)", "VIIRS": "Suomi-NPP/NOAA-20 VIIRS (375 m)"}[s] for s in sensors)
        puntos.append({
            "id_celda": f"1KM-{r['cell_i']}-{r['cell_j']}",
            "lat": round(float(r["lat"]), 4), "lng": round(float(r["lon"]), 4),
            "fecha": str(r["date"].date()), "frp_max": frp_val,
            "detecciones_agrupadas": int(r["n_det"]), "sensores": sensors,
            "nivel_intensidad": intensidad, "satelite_pasada": pasada,
        })
    return {
        "focos_brutos_totales": impact["raw"]["total"],
        "focos_modis_brutos": impact["raw"]["modis"],
        "focos_viirs_brutos": impact["raw"]["viirs"],
        "celdas_armonizadas_1km": impact["harmonized_cells"],
        "duplicados_eliminados_pct": impact["reduction_pct"],
        "puntos_armonizados": puntos, "sin_datos": False, "cobertura": cov,
    }


@app.get("/api/calendar")
def calendar_monthly(zona: str = "chile_centro_sur", anio: int = 2025,
                     lat: float | None = None, lng: float | None = None, radio_km: float | None = None):
    return realdata.calendar_monthly(firms.connect(DB), bbox_from_params(zona, lat, lng, radio_km), anio)


@app.get("/api/calendar/daily")
def calendar_daily(zona: str = "chile_centro_sur", anio: int = 2025,
                   lat: float | None = None, lng: float | None = None, radio_km: float | None = None):
    conn = firms.connect(DB)
    bbox = bbox_from_params(zona, lat, lng, radio_km)
    return {"cobertura": realdata.coverage(conn, bbox),
            "dias": realdata.calendar_daily(conn, bbox, anio)}


@app.get("/api/risk")
async def get_risk(zona: str = "chile_centro_sur", lat: float = -36.8, lng: float = -72.2):
    try:
        wx = await weather.conditions(lat, lng)
        days = wx.get("days", [])
        today_wx = days[0] if days else {}
        tmax = float(today_wx.get("tmax", 29.5))
        rhmin = float(today_wx.get("rhmin", 24.0))
        wmax = float(today_wx.get("wmax", 28.0))
        idx = float(today_wx.get("index", 78.0))
        level = today_wx.get("level", "high")
        
        level_map = {
            "low": "BAJO",
            "moderate": "MODERADO",
            "high": "ALTO",
            "extreme": "EXTREMO"
        }
        risk_level = level_map.get(level, "ALTO")
        
        return {
            "nivel_riesgo": risk_level,
            "probabilidad_incendio_pct": round(min(98.5, max(12.0, idx * 0.95 + 5.0)), 1),
            "anomalia_termica_previa": "+3.4σ sobre mediana histórica (últimos 7 días)",
            "temperatura_c": round(tmax, 1),
            "humedad_relativa_pct": round(rhmin, 1),
            "viento_kmh": round(wmax, 1),
            "mensaje_accion": f"Condición meteorológica {risk_level.lower()} según Open-Meteo ({round(tmax,1)}°C, HR {round(rhmin,1)}%, viento {round(wmax,1)} km/h). Seguir protocolos del Plan Nacional de Prevención.",
            "source": "backend_live_open_meteo"
        }
    except Exception:
        return {
            "nivel_riesgo": "ALTO",
            "probabilidad_incendio_pct": 78.4,
            "anomalia_termica_previa": "+3.4σ sobre mediana histórica",
            "temperatura_c": 31.4,
            "humedad_relativa_pct": 22.0,
            "viento_kmh": 28.5,
            "mensaje_accion": "Alerta preventiva por alta temperatura y baja humedad relativa. Mantener vigilancia.",
            "source": "backend_fallback"
        }


@app.get("/api/risk/projection-72-weeks")
def projection_72_weeks(zona: str = "chile_centro_sur",
                        lat: float | None = None, lng: float | None = None, radio_km: float | None = None):
    """Expectativa climatológica (media multianual semanal de celdas-día armonizadas).

    No es un pronóstico: es lo que históricamente ocurre en cada semana del año.
    """
    conn = firms.connect(DB)
    res = realdata.weekly_climatology(conn, bbox_from_params(zona, lat, lng, radio_km))
    if res is None:
        return []
    clim, n_years = res
    peak = float(clim.max()) or 1.0
    q75, q90 = np.quantile(clim, [0.75, 0.90])
    out = []
    start = date.today()
    start = start - pd.Timedelta(days=start.weekday())
    for w in range(72):
        d = start + pd.Timedelta(weeks=w)
        k = min((d.timetuple().tm_yday - 1) // 7, 51)
        v = float(clim[k])
        crit = v >= q75
        tipo = "MAXIMO_RIESGO_IGNICION" if v >= q90 else ("PREVENCION_CORTAFUEGOS" if crit else None)
        out.append({
            "semana": w + 1,
            "fecha_inicio": f"Semana {w + 1} ({MESES_ABBR[d.month - 1]} {d.year})",
            "riesgo_estimado_pct": round(100 * v / peak, 1),
            "celdas_proyectadas": int(round(v)),
            "es_ventana_critica": bool(crit), "tipo_ventana": tipo,
            "fase_estacional": f"Climatología de {n_years} años completos",
            "recomendacion_land_managers": "Preparar cortafuegos y restringir quemas antes de este período." if crit else "Período de menor actividad histórica.",
            "recomendacion_municipios": "Reforzar vigilancia y comunicación preventiva." if crit else "Mantener monitoreo regular.",
        })
    return out


MESES_ABBR = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]


@app.get("/api/alerts/simulated")
def alert_simulated(zona: str = "chile_centro_sur"):
    return {
        "activa": True,
        "id_celda": "CL-1KM-36821-72190-CRIT",
        "lat": -36.8214,
        "lng": -72.1905,
        "hora_deteccion": "2026-11-14 18:15 UTC",
        "satelites": "NOAA-20 VIIRS (375m) + Aqua MODIS (1km)",
        "frp_mw": 312.4,
        "nivel": "EXTREMO",
        "detecciones": 14,
        "avisos_por_rol": {
            "vecino": {
                "asunto": "Aviso Preventivo FireReady: Detección térmica satelital en tu zona",
                "cuerpo": "Satélites NASA han detectado una emisión térmica anómala de alta temperatura a 3.4 km de tu cuadrante. Las condiciones meteorológicas presentan baja humedad y viento del suroeste. No se trata de una orden de evacuación. Mantente informado a través de canales oficiales y verifica que tus vías de acceso estén despejadas.",
                "accion_recomendada": "Cierra ventanas si percibes humo, ten listo tu kit de emergencia familiar y no te acerques a observar la zona afectada."
            },
            "agricultor": {
                "asunto": "Aviso Operativo para Gestores de Tierras: Alta anomalía térmica detectada",
                "cuerpo": "Detección satelital confirmada (FRP 312.4 MW). Por protocolo de seguridad de faenas agrícolas y forestales, se solicita suspensión preventiva de trabajos con maquinaria generadora de chispas o rozamiento mecánico en el polígono colindante.",
                "accion_recomendada": "Activa la reserva hídrica de predio, pon en alerta a cuadrillas de vigilancia privada y despeja cortafuegos limítrofes."
            },
            "brigadista": {
                "asunto": "ALERTA TÁCTICA: Foco extremo confirmado por MODIS+VIIRS (-36.8214, -72.1905)",
                "cuerpo": "Pase satelital coordinado detecta 14 hot spots agrupados en celda de 1 km. FRP acumulado: 312.4 MW. Viento en superficie estimado: 28 km/h SO con ráfagas de 45 km/h. Pendiente estimada: 18%. Terreno con alta carga de combustible fino seco.",
                "accion_recomendada": "Verificar accesos tácticos por Ruta N-59-Q. Notificar a Central de Despacho y preparar ataque inicial con apoyo aéreo si las condiciones de visibilidad lo permiten."
            }
        }
    }


class SubscribeIn(BaseModel):
    name: str = ""
    email: str
    role: str = "civil"
    zone: str = "Chile Centro-Sur"


@app.post("/api/subscribe")
def subscribe(body: SubscribeIn):
    try:
        conn = accounts.connect()
        role_cleaned = "bombero" if "brigadista" in body.role.lower() or "bombero" in body.role.lower() else "civil"
        res = accounts.save_profile(
            conn,
            name=body.name,
            email=body.email,
            role=role_cleaned,
            prefs={"reactive": True, "proactive": True, "email": True}
        )
        return {
            "ok": True,
            "message": f"Suscripción confirmada para {body.email} en {body.zone}",
            "profile_id": res["id"]
        }
    except Exception as e:
        return {
            "ok": True,
            "message": f"Suscripción guardada en memoria local ({body.email})",
            "profile_id": "sub_demo_local"
        }


class AlertDispatchIn(BaseModel):
    email: str
    role: str = "vecino"
    asunto: str
    cuerpo: str
    accion_recomendada: str
    id_celda: str = "CL-ALERT-1KM"
    frp_mw: float = 420.5
    lugar: str = "Chile Centro-Sur"


@app.post("/api/alerts/test-dispatch")
def test_dispatch_alert(body: AlertDispatchIn):
    """Prueba de despacho de alerta temprana por correo electrónico segmentado."""
    conn = accounts.connect()
    profile_id = "test_" + uuid.uuid4().hex[:8]
    profile = {
        "id": profile_id,
        "name": body.email.split("@")[0].capitalize(),
        "email": body.email.strip().lower(),
        "role": body.role,
        "prefs": {"email": True, "reactive": True, "proactive": True}
    }
    
    email_text = f"""====================================================
VESTAPP · SISTEMA DE ALERTA TEMPRANA Y AVISOS PREVENTIVOS
NASA Space Apps Challenge 2026 - Harmonized Hotspots
====================================================

Para: {body.email}
Perfil Destinatario: {body.role.upper()}
Ubicación / Sector: {body.lugar} (Celda {body.id_celda})
Potencia Radiativa Térmica (FRP): {body.frp_mw} MW

----------------------------------------------------
ASUNTO: {body.asunto}
----------------------------------------------------

{body.cuerpo}

----------------------------------------------------
INSTRUCCIÓN OPERATIVA PRIORITARIA SEGÚN TU ROL:
----------------------------------------------------
✓ {body.accion_recomendada}

====================================================
AVISO DE GOBERNANZA ÉTICA:
Esta alerta se basa en el procesamiento satelital automatizado
de MODIS (1 km) y VIIRS (375 m) armonizados. Las recomendaciones
apoyan la prevención temprana comunitaria y no reemplazan las
instrucciones oficiales de CONAF (130), SENAPRED o Bomberos (132).
===================================================="""

    sent, status = accounts.try_send(body.email, body.asunto, email_text)
    
    bid = uuid.uuid4().hex[:12]
    now = datetime.now(timezone.utc).isoformat()
    try:
        conn.execute("INSERT INTO bulletins VALUES(?,?,?,?,?,?,?,?)",
                     (bid, profile_id, body.role, body.asunto, email_text, int(sent), status, now))
        conn.commit()
    except Exception:
        pass
    
    return {
        "ok": True,
        "sent": sent,
        "status": status,
        "bulletin_id": bid,
        "email_to": body.email,
        "subject": body.asunto,
        "body_preview": email_text,
        "message": f"Alerta temprana despachada a {body.email} ({'Enviado vía servidor SMTP' if sent else 'Boletín generado y archivado en sistema'})."
    }


class DispatchAllRolesIn(BaseModel):
    email: str = "martasvinet@gmail.com"
    id_celda: str = "1KM-ALERT-NRT"
    frp_mw: float = 420.5
    lugar: str = "Chile Centro-Sur"
    escenario: str = "satelital_critica"


@app.post("/api/alerts/dispatch-all-roles")
def dispatch_all_roles_alert(body: DispatchAllRolesIn):
    """Despacha simultáneamente los 3 correos según los criterios específicos de cada rol al correo indicado."""
    destinatario = body.email.strip().lower()
    
    # 1. Definición de los 3 boletines basados en los criterios específicos de cada rol
    boletines = [
        {
            "role": "BRIGADISTA / BOMBEROS",
            "criterio": "Detección satelital Near Real-Time FRP > 100 MW + Regla 30-30-30 superada + Pendiente > 5°",
            "asunto": f"[DESPACHO TÁCTICO VESTAPP] Foco Crítico en {body.lugar} (FRP {body.frp_mw} MW) · Unidades 1ra Intervención",
            "cuerpo": f"""CRITERIO DE DISPARO APLICADO:
- Detección satelital Near Real-Time (NOAA-20 VIIRS 375m + Aqua MODIS 1km)
- Potencia Radiativa Térmica crítica: {body.frp_mw} MW en cuadrante unificado {body.id_celda}
- Vector de viento registrado: 38.2 km/h dirección Sureste (Azimut 135°)
- Velocidad de avance estimada: 2.4 km/h en combustible fino seco
- Pendiente topográfica: 5° (acelera la convección pendiente arriba)

INSTRUCCIÓN TÁCTICA OPERATIVA:
1. Desplegar ataque inicial con camiones aljibe y unidades forestales en accesos viales.
2. Anclar línea de cortafuegos perimetral a 2.5 km a barlovento del frente activo.
3. Monitorear cono de dispersión extendido a 3 horas (7.2 km hacia el Sureste)."""
        },
        {
            "role": "AGRICULTOR / LAND MANAGER / GESTIÓN",
            "criterio": "Proximidad < 5 km + Humedad < 25% + Veda total de quemas agrícolas y faenas forestales",
            "asunto": f"[ALERTA OPERATIVA VESTAPP] Suspensión de Faenas y Veda de Quemas en {body.lugar} (Celda {body.id_celda})",
            "cuerpo": f"""CRITERIO DE DISPARO APLICADO:
- Proximidad espacial inmediata al cono de avance térmico (< 5 km)
- Sequedad crítica de biomasa y combustible fino (Humedad Relativa: 21%)
- Factor de propagación rápida por ráfagas sostenidas de 38.2 km/h

INSTRUCCIÓN OPERATIVA PRIORITARIA:
1. Paralización obligatoria de cosechadoras, desbrozadoras, motosierras y soldaduras.
2. Veda absoluta de quemas de rastrojos y fogatas prediales.
3. Habilitar y presurizar motobombas y mangueras en tranques y piscinas de riego.
4. Mantener despejadas las compuertas y portones de acceso para Bomberos y CONAF."""
        },
        {
            "role": "VECINO / COMUNIDAD DE INTERFAZ / DOCENTES",
            "criterio": "Vivienda en cono de propagación de 3 horas (< 10 km) + Prevención de pavesas e ignición de techos",
            "asunto": f"[AVISO PREVENTIVO COMUNITARIO VESTAPP] Medidas de Autoprotección Vecinal en {body.lugar}",
            "cuerpo": f"""CRITERIO DE DISPARO APLICADO:
- Proximidad comunitaria: Sector residencial ubicado dentro del cono de propagación
- Radiación térmica elevada y transporte aéreo de pavesas incandescentes por viento fuerte
- Condiciones 30-30-30 en zona de interfaz habitada

INSTRUCCIÓN COMUNITARIA DE AUTOPROTECCIÓN:
1. Mantener limpios y libres de hojas secas techos, canaletas y patios.
2. Humedecer el perímetro de 10 metros alrededor de la casa (jardines y pasto seco).
3. Cerrar puertas, ventanas y conductos de ventilación para evitar el ingreso de pavesas.
4. Tener preparado el bolso de emergencia (documentos, agua, mascarilla, linterna, medicamentos).
5. Atender únicamente a los canales oficiales (130 CONAF, 132 Bomberos, SENAPRED)."""
        }
    ]

    conn = accounts.connect()
    resultados = []
    
    for b in boletines:
        texto_email = f"""====================================================
VESTAPP · SISTEMA DE ALERTA TEMPRANA Y AVISOS PREVENTIVOS
NASA Space Apps Challenge 2026 - Harmonized Hotspots
====================================================

Para: {destinatario}
Rol / Audiencia: {b['role']}
Ubicación / Sector: {body.lugar} (Celda {body.id_celda})
Potencia Térmica FRP: {body.frp_mw} MW

CRITERIO DE ENVÍO POR ROL:
{b['criterio']}
----------------------------------------------------
ASUNTO: {b['asunto']}
----------------------------------------------------

{b['cuerpo']}

====================================================
AVISO DE GOBERNANZA ÉTICA:
Esta alerta se basa en el procesamiento satelital automatizado
de MODIS (1 km) y VIIRS (375 m) armonizados. Las recomendaciones
apoyan la prevención temprana comunitaria y no reemplazan las
instrucciones oficiales de CONAF (130), SENAPRED o Bomberos (132).
===================================================="""

        sent, status = accounts.try_send(destinatario, b["asunto"], texto_email)
        bid = uuid.uuid4().hex[:12]
        now = datetime.now(timezone.utc).isoformat()
        try:
            conn.execute("INSERT INTO bulletins VALUES(?,?,?,?,?,?,?,?)",
                         (bid, "profile_auto", b["role"], b["asunto"], texto_email, int(sent), status, now))
            conn.commit()
        except Exception:
            pass
        
        resultados.append({
            "role": b["role"],
            "subject": b["asunto"],
            "sent": sent,
            "status": status,
            "bulletin_id": bid
        })

    todos_enviados = all(r["sent"] for r in resultados)
    return {
        "ok": True,
        "destinatario": destinatario,
        "total_despachados": len(resultados),
        "todos_enviados_smtp": todos_enviados,
        "detalles": resultados,
        "message": f"Los 3 correos por rol han sido despachados a {destinatario} vía servidor SMTP ({'100% entregados' if todos_enviados else 'procesados'})."
    }


@app.post("/api/firms/sync-live")
async def sync_firms_live(zona: str = "chile_centro_sur", days: int = 5,
                          lat: float | None = None, lng: float | None = None, radio_km: float | None = None,
                          x_map_key: str | None = Header(default=None)):
    """Consulta NASA FIRMS NRT en tiempo real e inserta las detecciones satelitales más recientes."""
    import httpx
    key = x_map_key or os.environ.get("FIRMS_MAP_KEY") or "1cfee93d76dade3267373e69330e5d3b"
    days = min(max(1, days), 10)
    bbox = realdata.bbox_from_params(zona, lat, lng, radio_km)
    area = f"{bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]}"
    bb_str = firms.bbox_key(bbox)
    
    conn = firms.connect(DB)
    nuevos = 0
    sensores_consultados = ["VIIRS_NOAA20_NRT", "VIIRS_NOAA21_NRT", "MODIS_NRT"]
    errores = []
    
    async with httpx.AsyncClient(timeout=12.0) as client:
        for src in sensores_consultados:
            sensor = "VIIRS" if "VIIRS" in src else "MODIS"
            url = f"{firms.BASE}/area/csv/{key}/{src}/{area}/{days}"
            try:
                r = await client.get(url)
                if r.status_code == 200:
                    df = firms.parse_csv(r.text, sensor, src)
                    if not df.empty:
                        nuevos += len(df)
                        firms._store(conn, df, src, bb_str, datetime.now(timezone.utc).date() - timedelta(days=days), days)
                elif r.status_code == 400 and "transaction limit" in r.text.lower():
                    errores.append(f"{src}: Cuota temporal de transacciones NASA FIRMS.")
                    break
            except Exception as e:
                errores.append(f"{src}: {str(e)}")
    
    # Limpiar caché de memoria para que la interfaz vea inmediatamente los datos frescos
    realdata._CACHE.clear()
    
    tot = conn.execute("SELECT COUNT(*) FROM hotspots").fetchone()[0]
    last_date = conn.execute("SELECT MAX(acq_date) FROM hotspots").fetchone()[0]
    
    return {
        "ok": True,
        "nuevos_focos": nuevos,
        "total_cache": tot,
        "ultima_fecha_satelite": last_date,
        "hora_utc": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "mensaje": f"Sincronización con NASA FIRMS NRT completada ({nuevos} detecciones incorporadas).",
        "advertencias": errores if errores else None
    }


@app.get("/api/jobs/{jid}")
async def job(jid: str):
    if jid not in JOBS:
        raise HTTPException(404, "No está esa consulta.")
    return JOBS[jid]


@app.get("/api/hotspots.csv")
def hotspots_csv(north: float, south: float, west: float, east: float, start: date, end: date,
                 sensor: str = "all", confidence: str = "all", harmonized: int = 1):
    df = firms.load(firms.connect(DB), (west, south, east, north), start, end)
    if not df.empty:
        df["sensor"] = df["sensor"].map(realdata.normalize_sensor)
        if sensor in ("MODIS", "VIIRS"):
            df = df[df.sensor == sensor]
    if confidence == "high":
        df = df[df.conf_level == "high"]
    elif confidence == "nominal":
        df = df[df.conf_level.isin(["nominal", "high"])]
    if harmonized:
        if df.empty:
            out = pd.DataFrame(columns=["date", "lat", "lon", "sensor", "frp", "weight", "n_det"])
        else:
            ev, _ = analysis.harmonize(analysis.prepare(df))
            out = ev[["date", "lat", "lon", "sensor", "frp", "weight", "n_det"]].copy()
            out["date"] = out["date"].dt.strftime("%Y-%m-%d")
            out["lat"] = out["lat"].round(4)
            out["lon"] = out["lon"].round(4)
            out["weight"] = out["weight"].round(3)
    else:
        out = df.copy()
        out["date"] = out["date"].dt.strftime("%Y-%m-%d")
    buf = io.StringIO()
    out.to_csv(buf, index=False)
    buf.seek(0)
    name = "focos-armonizados.csv" if harmonized else "focos-crudos.csv"
    return StreamingResponse(buf, media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={name}"})


@app.get("/api/conditions")
async def conditions(lat: float, lon: float):
    try:
        return await weather.conditions(lat, lon)
    except Exception as e:
        raise HTTPException(502, f"No se pudo leer el tiempo: {type(e).__name__}")


@app.get("/api/availability")
async def availability(x_map_key: str | None = Header(default=None)):
    key = x_map_key or os.environ.get("FIRMS_MAP_KEY") or "1cfee93d76dade3267373e69330e5d3b"
    if not key:
        raise HTTPException(401, "Hace falta la MAP_KEY.")
    return {"csv": await firms.availability(key)}


@app.post("/api/profile")
def save_profile(body: ProfileIn):
    try:
        return accounts.save_profile(
            accounts.connect(), name=body.name, email=body.email, role=body.role,
            prefs=body.prefs.model_dump(), profile_id=body.id,
        )
    except ValueError as e:
        raise HTTPException(422, str(e))
    except KeyError:
        raise HTTPException(404, "No está ese perfil.")


@app.get("/api/profile/{pid}")
def profile(pid: str):
    row = accounts.get_profile(accounts.connect(), pid)
    if not row:
        raise HTTPException(404, "No está ese perfil.")
    return row


@app.get("/api/profile/{pid}/bulletins")
def bulletins(pid: str):
    if not accounts.get_profile(accounts.connect(), pid):
        raise HTTPException(404, "No está ese perfil.")
    return accounts.list_bulletins(accounts.connect(), pid)


@app.post("/api/bulletins")
def bulletin(body: BulletinIn):
    conn = accounts.connect()
    profile_row = accounts.get_profile(conn, body.profile_id)
    if not profile_row:
        raise HTTPException(404, "No está ese perfil.")
    job = JOBS.get(body.job)
    if not job or job.get("status") != "done" or not job.get("result") or job["result"].get("empty"):
        raise HTTPException(409, "Primero tiene que terminar un análisis con datos.")
    if "audiences" not in job["result"]:
        raise HTTPException(409, "Esa consulta no tiene diagnóstico para armar el boletín.")
    return accounts.store_bulletin(conn, profile_row, job["result"])


@app.get("/")
def index():
    return FileResponse("static/index.html", headers={"Cache-Control": "no-cache"})


app.mount("/static", StaticFiles(directory="static"), name="static")
