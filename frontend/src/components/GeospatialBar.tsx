import { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronUp,
  Compass,
  MapPin,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import { ANIOS_DISPONIBLES, ZONAS_PRECONFIGURADAS, getAreaActivaTexto, type Zona } from '../mocks/fireData';
import { useDataSourceStatus } from '../services/api';
import { FOCUS } from '../lib/theme';
import { textos } from '../lib/lang';

interface Props {
  zonaId: string;
  setZonaId: (id: string) => void;
  zonaActiva: Zona;
  customLatInput: string;
  setCustomLatInput: (v: string) => void;
  customLngInput: string;
  setCustomLngInput: (v: string) => void;
  customRadioInput: string;
  setCustomRadioInput: (v: string) => void;
  onAplicarCustom: () => void;
  fechaDesde: string;
  setFechaDesde: (v: string) => void;
  fechaHasta: string;
  setFechaHasta: (v: string) => void;
  anio: number;
  onYearChange?: (nuevoAnio: number) => void;
  onResetFiltros: () => void;
  onSyncLive?: () => void;
  sincronizando?: boolean;
  claro?: boolean;
}

const AUDIENCIAS = [
  'Fire Managers',
  'Emergency Responders',
  'Firefighters',
  'Scientists',
  'Land Managers',
];

export default function GeospatialBar({
  zonaId,
  setZonaId,
  zonaActiva,
  customLatInput,
  setCustomLatInput,
  customLngInput,
  setCustomLngInput,
  customRadioInput,
  setCustomRadioInput,
  onAplicarCustom,
  fechaDesde,
  setFechaDesde,
  fechaHasta,
  setFechaHasta,
  anio,
  onYearChange,
  onResetFiltros,
  onSyncLive,
  sincronizando = false,
  claro = false,
}: Props) {
  const [desplegarCustom, setDesplegarCustom] = useState<boolean>(zonaId === 'custom');
  const dataSource = useDataSourceStatus();
  const t = textos(Boolean(claro));

  const hayFiltrosActivos =
    fechaDesde !== `${anio}-01-01` || fechaHasta !== `${anio}-12-31` || zonaId === 'custom';

  const textoArea = getAreaActivaTexto(zonaActiva, Number(customRadioInput) || 50);

  return (
    <div className="border-b border-[#323E4C] bg-[#1F2833]/90 backdrop-blur py-2.5 px-4 text-xs transition-colors">
      <div className="mx-auto max-w-[1600px] flex flex-wrap items-center justify-between gap-3">
        {/* Lado izquierdo: Selector de Región Global + Área personalizada */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Badge del Lugar Activo Global */}
          <div className="flex items-center gap-2 rounded-lg bg-[#0B0C10] border border-cyan-400/40 px-2.5 py-1 text-cyan-200 shadow-sm">
            <Compass className="w-3.5 h-3.5 text-cyan-300 shrink-0" aria-hidden="true" />
            <span className="font-semibold text-white tracking-wide">{textoArea}</span>
          </div>

          {/* Selector de zonas / filtro geográfico único */}
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-cyan-300 shrink-0" aria-hidden="true" />
            <select
              value={zonaId}
              onChange={(e) => {
                const val = e.target.value;
                setZonaId(val);
                if (val === 'custom') setDesplegarCustom(true);
              }}
              aria-label="Filtro geográfico global de consulta"
              className={`rounded-lg bg-[#0B0C10] border border-[#323E4C] px-3 py-1.5 text-white font-medium cursor-pointer ${FOCUS}`}
            >
              {ZONAS_PRECONFIGURADAS.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.nombre}
                </option>
              ))}
              <option value="custom">📍 Coordenadas Personalizadas (Lat, Lng, Radio km)</option>
            </select>
          </div>

          {/* Botón Coordenadas Lat/Lng siempre accesible */}
          <button
            type="button"
            onClick={() => setDesplegarCustom((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium transition cursor-pointer ${
              desplegarCustom || zonaId === 'custom'
                ? 'bg-cyan-950/70 text-cyan-300 border-cyan-400/50 shadow-sm'
                : 'bg-[#0B0C10] text-[#8C9BAA] border-[#323E4C] hover:text-white hover:border-cyan-400/40'
            } ${FOCUS}`}
            title="Ingresar o ajustar Coordenadas Lat/Lng y Radio km"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-300" aria-hidden="true" />
            <span>Coordenadas Lat/Lng</span>
            {desplegarCustom ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {/* Selector de Año Global (2000–2026) */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-[#323E4C]">
            <CalendarIcon className="w-3.5 h-3.5 text-cyan-300" aria-hidden="true" />
            <span className="text-[#8C9BAA]">Año:</span>
            <select
              value={anio}
              onChange={(e) => onYearChange?.(Number(e.target.value))}
              aria-label="Seleccionar año de análisis (2000–2026)"
              className={`rounded bg-[#0B0C10] border border-[#323E4C] px-2.5 py-1 text-white font-mono font-semibold cursor-pointer ${FOCUS}`}
            >
              {ANIOS_DISPONIBLES.map((a) => (
                <option key={a} value={a}>
                  {a} {a === 2017 || a === 2023 || a === 2024 ? '★ (Pico)' : a === 2026 ? '⚡ (En vivo)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Botón de Sincronización en Tiempo Real NASA FIRMS NRT */}
          {onSyncLive && (
            <button
              type="button"
              onClick={onSyncLive}
              disabled={sincronizando}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                sincronizando
                  ? 'bg-cyan-900/40 text-cyan-400 border-cyan-500/50 animate-pulse'
                  : 'bg-gradient-to-r from-cyan-950 to-blue-950 text-cyan-200 border-cyan-400/50 hover:bg-cyan-900/60 shadow-sm'
              } ${FOCUS}`}
              title="Consultar NASA FIRMS NRT con tu MAP_KEY para obtener las últimas detecciones de los satélites"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${sincronizando ? 'animate-spin' : ''}`} />
              <span>{sincronizando ? 'Sincronizando FIRMS…' : t.btnSync}</span>
            </button>
          )}

            {/* Selector de Rango de Fechas */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-[#323E4C]">
              <span className="text-[#8C9BAA]">Rango:</span>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                aria-label="Fecha inicial de consulta"
                className={`rounded bg-[#0B0C10] border border-[#323E4C] px-2 py-1 text-white font-mono ${FOCUS}`}
              />
              <span className="text-[#8C9BAA]">—</span>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                aria-label="Fecha final de consulta"
                className={`rounded bg-[#0B0C10] border border-[#323E4C] px-2 py-1 text-white font-mono ${FOCUS}`}
              />

              {/* Atajos temporales: Últimos 7 días (Activos) vs Temporada Completa (Acumulada) */}
              <div className="flex items-center gap-1 ml-1">
                <button
                  type="button"
                  onClick={() => {
                    const hoy = anio === 2026 ? '2026-11-14' : `${anio}-12-31`;
                    const hace7 = anio === 2026 ? '2026-11-07' : `${anio}-12-24`;
                    setFechaDesde(hace7);
                    setFechaHasta(hoy);
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                    (fechaDesde.endsWith('-11-07') || fechaDesde.endsWith('-12-24'))
                      ? 'bg-cyan-800 text-white font-semibold'
                      : 'bg-[#0B0C10] text-[#8C9BAA] border border-[#323E4C] hover:text-white'
                  }`}
                  title="Filtrar solo los últimos 7 días (monitoreo de focos activos recientes)"
                >
                  {t.btnAtajo7Dias}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFechaDesde(`${anio}-01-01`);
                    setFechaHasta(`${anio}-12-31`);
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                    fechaDesde === `${anio}-01-01` && fechaHasta === `${anio}-12-31`
                      ? 'bg-cyan-800 text-white font-semibold'
                      : 'bg-[#0B0C10] text-[#8C9BAA] border border-[#323E4C] hover:text-white'
                  }`}
                  title="Ver acumulado de toda la temporada"
                >
                  {t.btnAtajoAnio}
                </button>
              </div>

              {hayFiltrosActivos && (
                <button
                  type="button"
                  onClick={onResetFiltros}
                  title="Restablecer fechas y región inicial"
                  className={`p-1 rounded text-[#8C9BAA] hover:text-white hover:bg-[#323E4C] cursor-pointer ${FOCUS}`}
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="sr-only">Restablecer filtros globales</span>
                </button>
              )}
            </div>
        </div>

        {/* Lado derecho: Estado de Conexión API / Fallback + Badges discretos de audiencias NASA */}
        <div className="flex flex-wrap items-center gap-2 text-[11px]" aria-label="Estado del sistema y perfiles">
          {/* Indicador discreto de origen de datos (Backend vs Fallback Local) */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-medium transition ${
              dataSource.isBackendLive
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
            }`}
            title={
              dataSource.isBackendLive
                ? 'Conectado a FastAPI :8000 con 340.708 hotspots cacheados (26 años: 2000–2026) y NASA FIRMS NRT en vivo'
                : 'Servidor backend local no detectado o en timeout. Operando con dataset histórico local.'
            }
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                dataSource.isBackendLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
              aria-hidden="true"
            />
            <span className="tracking-tight">{dataSource.label}</span>
          </div>

          <span className="text-[#8C9BAA] ml-1 mr-0.5 flex items-center gap-1">
            <Users className="w-3 h-3 text-[#8C9BAA]" aria-hidden="true" />
            <span>{t.audienciaTitulo}</span>
          </span>
          {t.audiencias.map((aud) => (
            <span
              key={aud}
              className="px-2 py-0.5 rounded bg-[#0B0C10]/60 border border-[#323E4C] text-[#8C9BAA] font-medium"
            >
              {aud}
            </span>
          ))}
        </div>
      </div>

      {/* PANEL DESPLEGABLE DE COORDENADAS PERSONALIZADAS */}
      {desplegarCustom && (
        <div className="mx-auto max-w-[1600px] mt-2.5 pt-2 border-t border-[#323E4C]/60 flex flex-wrap items-center gap-3 animate-in fade-in duration-150">
          <span className="text-cyan-300 font-semibold flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Coordenadas personalizadas globales:</span>
          </span>
          <label className="flex items-center gap-1.5 text-[#8C9BAA]">
            <span>Latitud:</span>
            <input
              type="number"
              step="0.01"
              value={customLatInput}
              onChange={(e) => setCustomLatInput(e.target.value)}
              placeholder="-36.80"
              className={`w-24 rounded bg-[#0B0C10] border border-[#323E4C] px-2 py-1 text-white font-mono ${FOCUS}`}
            />
          </label>
          <label className="flex items-center gap-1.5 text-[#8C9BAA]">
            <span>Longitud:</span>
            <input
              type="number"
              step="0.01"
              value={customLngInput}
              onChange={(e) => setCustomLngInput(e.target.value)}
              placeholder="-72.20"
              className={`w-24 rounded bg-[#0B0C10] border border-[#323E4C] px-2 py-1 text-white font-mono ${FOCUS}`}
            />
          </label>
          <label className="flex items-center gap-1.5 text-[#8C9BAA]">
            <span>Radio:</span>
            <input
              type="number"
              value={customRadioInput}
              onChange={(e) => setCustomRadioInput(e.target.value)}
              className={`w-16 rounded bg-[#0B0C10] border border-[#323E4C] px-2 py-1 text-white font-mono ${FOCUS}`}
            />
            <span>km</span>
          </label>
          <button
            type="button"
            onClick={() => {
              setZonaId('custom');
              onAplicarCustom();
            }}
            className={`px-3 py-1 rounded bg-cyan-700 hover:bg-cyan-600 text-white font-semibold transition cursor-pointer ${FOCUS}`}
          >
            Aplicar Coordenadas a Todo el Dashboard
          </button>
          <span className="text-[11px] text-[#8C9BAA]">
            Actualiza inmediatamente el mapa, celdas satelitales, calendario y diagnóstico predictivo.
          </span>
        </div>
      )}
    </div>
  );
}
