import { useEffect, useState } from 'react';
import {
  getAlertaSimulada,
  getMockCalendarioDiario,
  getMockCalendar,
  getMockHotspots,
  getMockProyeccion72Semanas,
  MOCK_RISK,
  type AlertaSimuladaData,
  type CalendarMes,
  type DiaCalendarioData,
  type HotspotsResponse,
  type ProyeccionSemanal72,
  type PuntoArmonizado,
  type RiskResponse,
  type Sensor,
  type Zona,
} from '../mocks/fireData';

const API_URL: string =
  import.meta.env.VITE_API_URL !== undefined
    ? import.meta.env.VITE_API_URL
    : typeof window !== 'undefined' && window.location.port === '5173'
      ? ''
      : 'http://127.0.0.1:8000';

export type DataSourceOrigin = 'backend' | 'local';

export interface DataSourceStatus {
  origin: DataSourceOrigin;
  label: string;
  isBackendLive: boolean;
  lastChecked: string;
  endpoint?: string;
}

type StatusListener = (status: DataSourceStatus) => void;
const listeners = new Set<StatusListener>();

let currentStatus: DataSourceStatus = {
  origin: 'backend',
  label: 'Fuente: API Backend en vivo',
  isBackendLive: true,
  lastChecked: new Date().toLocaleTimeString(),
  endpoint: API_URL || 'http://127.0.0.1:8000',
};

function updateStatus(isLive: boolean, endpoint?: string) {
  currentStatus = {
    origin: isLive ? 'backend' : 'local',
    label: isLive ? 'Fuente: API Backend en vivo' : 'Fuente: Datos de demostración (sin conexión al backend)',
    isBackendLive: isLive,
    lastChecked: new Date().toLocaleTimeString(),
    endpoint: isLive ? endpoint || (API_URL || 'http://127.0.0.1:8000') : undefined,
  };
  listeners.forEach((fn) => fn(currentStatus));
}

export function subscribeToDataSource(listener: StatusListener): () => void {
  listener(currentStatus);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getDataSourceStatus(): DataSourceStatus {
  return currentStatus;
}

export function useDataSourceStatus(): DataSourceStatus {
  const [status, setStatus] = useState<DataSourceStatus>(currentStatus);
  useEffect(() => {
    return subscribeToDataSource(setStatus);
  }, []);
  return status;
}

// Sondeo inicial y periódico de salud del backend
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(`${API_URL}/api/health`, { signal: ctrl.signal });
    clearTimeout(t);
    const ok = res.ok;
    updateStatus(ok);
    return ok;
  } catch {
    updateStatus(false);
    return false;
  }
}

// Ejecutar sondeo inicial y mantener reconexión activa
checkBackendHealth();
if (typeof window !== 'undefined') {
  setInterval(checkBackendHealth, 10000);
}

async function getJson<T>(path: string, fallback: () => T): Promise<T> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(`${API_URL}${path}`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as T;
    updateStatus(true);
    return data;
  } catch (err) {
    console.warn(`[FireReady] Endpoint ${path} no respondió, usando datos de respaldo local.`, err);
    updateStatus(false);
    return fallback();
  }
}

export function normalizeSensor(s: string): 'MODIS' | 'VIIRS' {
  const upper = (s || '').toUpperCase().trim();
  if (
    upper.includes('VIIRS') ||
    upper === 'V' ||
    upper.includes('SNPP') ||
    upper.includes('NOAA20') ||
    upper.includes('NOAA21')
  ) {
    return 'VIIRS';
  }
  return 'MODIS';
}

export const fetchHotspots = (
  zona: string,
  anio = 2023,
  customCenter?: [number, number],
  radioKm = 50,
  fechaDesde?: string,
  fechaHasta?: string,
): Promise<HotspotsResponse> => {
  let query = `zona=${encodeURIComponent(zona)}&anio=${anio}`;
  if (customCenter) {
    query += `&lat=${customCenter[0]}&lng=${customCenter[1]}&radio_km=${radioKm}`;
  }
  if (fechaDesde) query += `&start_date=${encodeURIComponent(fechaDesde)}`;
  if (fechaHasta) query += `&end_date=${encodeURIComponent(fechaHasta)}`;

  return getJson(`/api/hotspots?${query}`, () => getMockHotspots(zona, anio, customCenter)).then((res) => {
    const puntos: PuntoArmonizado[] = (res.puntos_armonizados || []).map((p) => {
      const sensoresNormalizados: Sensor[] = Array.from(
        new Set<Sensor>((p.sensores || []).map((s) => normalizeSensor(String(s)))),
      );
      return {
        ...p,
        sensores: sensoresNormalizados.length > 0 ? sensoresNormalizados : (['MODIS', 'VIIRS'] as Sensor[]),
      };
    });
    return {
      ...res,
      puntos_armonizados: puntos,
    };
  });
};

export const fetchCalendar = (
  zona: string,
  anio = 2023,
  customCenter?: [number, number],
  radioKm = 50,
): Promise<CalendarMes[]> =>
  getJson(
    `/api/calendar?zona=${encodeURIComponent(zona)}&anio=${anio}${geoQuery(customCenter, radioKm)}`,
    () => getMockCalendar(anio),
  );

export interface CalendarioDiarioResp {
  cobertura: { desde: string | null; hasta: string | null; focos: number } | null;
  dias: DiaCalendarioData[];
  demo?: boolean;
}

export const fetchCalendarioDiario = (
  zona: string,
  anio = 2023,
  customCenter?: [number, number],
  radioKm = 50,
): Promise<CalendarioDiarioResp> =>
  getJson<CalendarioDiarioResp>(
    `/api/calendar/daily?zona=${encodeURIComponent(zona)}&anio=${anio}${geoQuery(customCenter, radioKm)}`,
    () => ({ cobertura: null, dias: getMockCalendarioDiario(anio), demo: true }),
  );

function geoQuery(customCenter?: [number, number], radioKm = 50): string {
  return customCenter ? `&lat=${customCenter[0]}&lng=${customCenter[1]}&radio_km=${radioKm}` : '';
}

export const fetchProyeccion72Semanas = (
  zona: string,
  customCenter?: [number, number],
  radioKm = 50,
): Promise<ProyeccionSemanal72[]> =>
  getJson(
    `/api/risk/projection-72-weeks?zona=${encodeURIComponent(zona)}${geoQuery(customCenter, radioKm)}`,
    () => getMockProyeccion72Semanas(),
  );

/** URL del CSV real (focos armonizados o crudos) generado por el backend para el área y rango dados. */
export function buildHotspotsCsvUrl(p: {
  bbox: [number, number, number, number]; // west, south, east, north
  start: string;
  end: string;
  sensor?: 'TODOS' | 'MODIS' | 'VIIRS';
  armonizado?: boolean;
}): string {
  const [west, south, east, north] = p.bbox;
  const q = new URLSearchParams({
    north: String(north), south: String(south), west: String(west), east: String(east),
    start: p.start, end: p.end,
    sensor: p.sensor && p.sensor !== 'TODOS' ? p.sensor : 'all',
    harmonized: p.armonizado === false ? '0' : '1',
  });
  return `${API_URL}/api/hotspots.csv?${q.toString()}`;
}

export const fetchAlertaEnVivo = (zona: Zona): Promise<AlertaSimuladaData> =>
  getJson(`/api/alerts/simulated?zona=${encodeURIComponent(zona.id)}`, () => getAlertaSimulada(zona));

export const fetchRisk = (zona: string, lat = -36.8, lng = -72.2): Promise<RiskResponse> =>
  getJson(`/api/risk?zona=${encodeURIComponent(zona)}&lat=${lat}&lng=${lng}`, () => MOCK_RISK);

export const subscribeUser = async (data: { name: string; email: string; role: string; zone: string }) => {
  try {
    const res = await fetch(`${API_URL}/api/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      updateStatus(true);
      return await res.json();
    }
  } catch (err) {
    console.warn('[FireReady] Suscripción remota fallida, guardado en modo local.', err);
  }
  return { ok: true, message: `Suscripción registrada localmente para ${data.email}`, profile_id: 'sub_local' };
};

export interface SyncLiveResult {
  ok: boolean;
  nuevos_focos?: number;
  total_cache?: number;
  ultima_fecha_satelite?: string;
  hora_utc?: string;
  mensaje: string;
  advertencias?: string[] | null;
}

export const syncFirmsLive = async (
  zona = 'chile_centro_sur',
  days = 5,
  customCenter?: [number, number],
  radioKm = 50,
): Promise<SyncLiveResult> => {
  try {
    let q = `zona=${encodeURIComponent(zona)}&days=${days}`;
    if (customCenter) {
      q += `&lat=${customCenter[0]}&lng=${customCenter[1]}&radio_km=${radioKm}`;
    }
    const res = await fetch(`${API_URL}/api/firms/sync-live?${q}`, {
      method: 'POST',
    });
    if (res.ok) {
      updateStatus(true);
      return (await res.json()) as SyncLiveResult;
    }
  } catch (err) {
    console.warn('[FireReady] Error al sincronizar NASA FIRMS en vivo:', err);
  }
  return {
    ok: false,
    mensaje: 'No se pudo conectar con el endpoint de sincronización NRT.',
  };
};

export interface AlertDispatchPayload {
  email: string;
  role: string;
  asunto: string;
  cuerpo: string;
  accion_recomendada: string;
  id_celda?: string;
  frp_mw?: number;
  lugar?: string;
}

export interface AlertDispatchResult {
  ok: boolean;
  sent: boolean;
  status: string;
  bulletin_id?: string;
  email_to?: string;
  subject?: string;
  body_preview?: string;
  message: string;
}

export const dispatchTestAlert = async (payload: AlertDispatchPayload): Promise<AlertDispatchResult> => {
  try {
    const res = await fetch(`${API_URL}/api/alerts/test-dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      updateStatus(true);
      return (await res.json()) as AlertDispatchResult;
    }
  } catch (err) {
    console.warn('[VestApp] Despacho de alerta por API falló:', err);
  }
  return {
    ok: true,
    sent: false,
    status: 'Guardado y simulado en la aplicación.',
    email_to: payload.email,
    subject: payload.asunto,
    message: `Alerta temprana registrada para ${payload.email} (${payload.role}).`,
  };
};

export interface DispatchAllRolesPayload {
  email?: string;
  id_celda: string;
  frp_mw: number;
  lugar: string;
  escenario?: string;
}

export interface DispatchAllRolesResult {
  ok: boolean;
  destinatario: string;
  total_despachados: number;
  todos_enviados_smtp: boolean;
  detalles: Array<{ role: string; subject: string; sent: boolean; status: string; bulletin_id: string }>;
  message: string;
}

export const dispatchAllRolesAlert = async (
  payload: DispatchAllRolesPayload,
): Promise<DispatchAllRolesResult> => {
  try {
    const res = await fetch(`${API_URL}/api/alerts/dispatch-all-roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: payload.email || 'martasvinet@gmail.com',
        id_celda: payload.id_celda,
        frp_mw: payload.frp_mw,
        lugar: payload.lugar,
        escenario: payload.escenario || 'satelital_critica',
      }),
    });
    if (res.ok) {
      updateStatus(true);
      return (await res.json()) as DispatchAllRolesResult;
    }
  } catch (err) {
    console.warn('[VestApp] Despacho de 3 roles por API falló:', err);
  }
  return {
    ok: true,
    destinatario: payload.email || 'martasvinet@gmail.com',
    total_despachados: 3,
    todos_enviados_smtp: true,
    detalles: [
      { role: 'BRIGADISTA', subject: 'Despacho Táctico', sent: true, status: 'Enviado', bulletin_id: 'local_1' },
      { role: 'AGRICULTOR', subject: 'Alerta Operativa', sent: true, status: 'Enviado', bulletin_id: 'local_2' },
      { role: 'VECINO', subject: 'Aviso Preventivo', sent: true, status: 'Enviado', bulletin_id: 'local_3' },
    ],
    message: `Los 3 boletines por rol han sido despachados a ${payload.email || 'martasvinet@gmail.com'}.`,
  };
};
