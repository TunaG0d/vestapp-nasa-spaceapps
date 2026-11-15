import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Calendar,
  Compass,
  Droplets,
  Flame,
  Info,
  LineChart as LineChartIcon,
  Mountain,
  Shield,
  ShieldAlert,
  Thermometer,
  TrendingUp,
  Wind,
  X,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  getMockProyeccion72Semanas,
  type ProyeccionSemanal72,
  type RiskResponse,
} from '../mocks/fireData';
import { fetchProyeccion72Semanas } from '../services/api';
import { FOCUS, intensitySvg, type Paleta } from '../lib/theme';
import { textos } from '../lib/lang';

interface Props {
  risk: RiskResponse;
  pal: Paleta;
  claro: boolean;
  onOpenSubscribe: () => void;
  lugarActivoTexto: string;
  zonaId?: string;
  customCenter?: [number, number];
  radioKm?: number;
  vistaForzada?: 'inmediato' | 'proyeccion72' | 'completa';
}

export default function RiskAssistant({
  risk,
  pal,
  claro,
  onOpenSubscribe,
  lugarActivoTexto,
  zonaId = 'chile_centro_sur',
  customCenter,
  radioKm = 50,
  vistaForzada,
}: Props) {
  const t = textos(claro);
  // Vista completa por defecto para que el gráfico a 72 semanas sea SIEMPRE visible de inmediato
  const [modoVista, setModoVista] = useState<'completa' | 'inmediato' | 'proyeccion72'>('completa');
  const [mostrarInfoSeveridad, setMostrarInfoSeveridad] = useState<boolean>(false);

  useEffect(() => {
    if (vistaForzada) {
      setModoVista(vistaForzada);
    }
  }, [vistaForzada]);

  const [proyeccion72, setProyeccion72] = useState<ProyeccionSemanal72[]>(() => getMockProyeccion72Semanas());
  const [cargando72, setCargando72] = useState<boolean>(false);

  useEffect(() => {
    let alive = true;
    setCargando72(true);
    fetchProyeccion72Semanas(zonaId, customCenter, radioKm)
      .then((data) => {
        if (alive && data && data.length > 0) {
          setProyeccion72(data);
        }
      })
      .catch((err) => {
        console.warn('[RiskAssistant] Error al obtener proyección a 72 semanas:', err);
      })
      .finally(() => {
        if (alive) setCargando72(false);
      });

    return () => {
      alive = false;
    };
  }, [zonaId, customCenter, radioKm]);

  const ventanasCriticas = useMemo(() => {
    return proyeccion72.filter((p) => p.es_ventana_critica);
  }, [proyeccion72]);

  const ventanaCortafuegos = useMemo(() => {
    return (
      ventanasCriticas.find((v) => v.tipo_ventana === 'PREVENCION_CORTAFUEGOS') ||
      ventanasCriticas[0] ||
      null
    );
  }, [ventanasCriticas]);

  const ventanaPeak = useMemo(() => {
    return (
      ventanasCriticas.find((v) => v.tipo_ventana === 'MAXIMO_RIESGO_IGNICION') ||
      ventanasCriticas[ventanasCriticas.length - 1] ||
      null
    );
  }, [ventanasCriticas]);

  const alto = risk.nivel_riesgo === 'ALTO' || risk.nivel_riesgo === 'EXTREMO';
  const nivelForma = risk.nivel_riesgo === 'EXTREMO' ? 'EXTREMO' : alto ? 'ALTO' : 'MODERADO';
  const color = pal.fill[nivelForma];
  const colorTexto = pal.text[nivelForma];

  return (
    <section
      aria-labelledby="riesgo-ia-titulo"
      className="relative rounded-2xl border border-[#2D3B48] bg-[#141B22]/95 backdrop-blur-md p-4 space-y-4 shadow-xl"
    >
      {/* Cabecera con selector de modo */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#2D3B48]">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-500" aria-hidden="true" />
            <h2 id="riesgo-ia-titulo" className="font-extrabold text-white text-base tracking-wide">
              Predicción Preventiva de Riesgo IA
            </h2>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#8C9BAA] mt-0.5">
            <Compass className="w-3 h-3 text-cyan-300" />
            <span className="truncate">{lugarActivoTexto}</span>
          </div>
        </div>

        {/* Selector de modo: Vista Completa vs Diagnóstico Inmediato vs Proyección 72 Semanas */}
        <div
          role="tablist"
          aria-label="Modo de predicción de riesgo"
          className="flex flex-wrap rounded-xl bg-[#0B0F14] p-1 border border-[#3A4B5C] text-xs gap-1"
        >
          <button
            role="tab"
            aria-selected={modoVista === 'completa'}
            onClick={() => setModoVista('completa')}
            className={`px-2.5 py-1 rounded-lg font-bold transition text-[11px] ${FOCUS} ${
              modoVista === 'completa'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-[#8C9BAA] hover:text-white'
            }`}
          >
            Todo Visible
          </button>
          <button
            role="tab"
            aria-selected={modoVista === 'inmediato'}
            onClick={() => setModoVista('inmediato')}
            className={`px-2.5 py-1 rounded-lg font-bold transition text-[11px] ${FOCUS} ${
              modoVista === 'inmediato'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-[#8C9BAA] hover:text-white'
            }`}
          >
            {t.pestanaInmediata}
          </button>
          <button
            role="tab"
            aria-selected={modoVista === 'proyeccion72'}
            onClick={() => setModoVista('proyeccion72')}
            className={`px-2.5 py-1 rounded-lg font-bold transition text-[11px] ${FOCUS} ${
              modoVista === 'proyeccion72'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-[#8C9BAA] hover:text-white'
            }`}
          >
            {t.pestanaProyeccion}
          </button>
        </div>
      </div>

      {/* SECCIÓN 1: DIAGNÓSTICO TÁCTICO INMEDIATO (30-30-30 + Pendiente) */}
      {(modoVista === 'completa' || modoVista === 'inmediato') && (
        <div className="space-y-4">
          {/* Tarjeta de diagnóstico objetivo con botón (i) de escala térmica */}
          <div
            role="status"
            aria-live="polite"
            className="relative rounded-xl border-2 p-3.5"
            style={{ borderColor: color, background: `${color}18` }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span
                className="font-extrabold text-base flex items-center gap-2"
                style={{ color: colorTexto }}
              >
                <Flame className="w-5 h-5 fill-current" />
                <span>
                  {claro ? 'Peligro estimado:' : 'FOCO CRÍTICO /'} {risk.nivel_riesgo}
                </span>
                <button
                  type="button"
                  onClick={() => setMostrarInfoSeveridad(!mostrarInfoSeveridad)}
                  aria-label="Ver escala de severidad térmica"
                  className="text-slate-300 hover:text-white p-0.5 rounded-full hover:bg-black/30 transition"
                  title="Información de la escala de severidad térmica"
                >
                  <Info className="w-4 h-4" />
                </button>
              </span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#0B0C10]/80 border border-[#3A4B5C] text-white">
                Probabilidad: {risk.probabilidad_incendio_pct}%
              </span>
            </div>
            <p className="text-xs text-white leading-relaxed">{risk.mensaje_accion}</p>

            {/* Popover Tooltip de Escala de Severidad Térmica (Imagen 4 del usuario) */}
            {mostrarInfoSeveridad && (
              <div
                role="dialog"
                aria-label="Escala de severidad térmica"
                className="absolute top-12 left-2 z-50 w-72 rounded-xl border border-[#3A4B5C] bg-[#0E141B]/95 p-3.5 shadow-2xl backdrop-blur-md animate-in fade-in duration-150 text-xs"
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#2D3B48]">
                  <span className="font-bold text-white text-[11px] tracking-wider uppercase">
                    Escala de Severidad Térmica
                  </span>
                  <button
                    type="button"
                    onClick={() => setMostrarInfoSeveridad(false)}
                    className="text-[#8C9BAA] hover:text-white p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                    <span className="text-slate-200">
                      <strong className="text-amber-300">Anomalía térmica Leve:</strong> Observación
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-500 fill-orange-500 shrink-0" />
                    <span className="text-slate-200">
                      <strong className="text-orange-400">Alerta media:</strong> Propagación
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-rose-500 fill-rose-500 shrink-0" />
                    <span className="text-slate-200">
                      <strong className="text-rose-400">Foco Crítico:</strong> Evacuación
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-yellow-400 border border-yellow-200 shrink-0 shadow-sm shadow-yellow-400/50" />
                    <span className="text-slate-200">
                      <strong className="text-yellow-300">Zona riesgo:</strong> Radiación térmica
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Desglose de variables predictivas con métricas meteorológicas + Pendiente (Imagen 1 y 7) */}
          <div className="space-y-2.5">
            <h3 className="text-xs uppercase tracking-wider text-[#8C9BAA] font-bold">
              DESGLOSE TRANSPARENTE DE VARIABLES PREDICTIVAS
            </h3>

            {/* Anomalía térmica previa */}
            <div className="rounded-xl bg-[#0B0F14]/70 border border-[#232F3B] p-2.5 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-[#8C9BAA]">
                <Activity className="w-4 h-4 text-cyan-400 shrink-0" aria-hidden="true" />
                <span>{t.anomaliaLabel}</span>
              </div>
              <span className="font-semibold text-white text-right font-mono">
                {t.anomaliaTexto(risk.anomalia_termica_previa)}
              </span>
            </div>

            {/* Grid 2x2 de métricas: Temperatura, Humedad, Viento, Pendiente (<3°) */}
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="rounded-xl bg-[#0B0F14]/70 border border-[#232F3B] p-2.5">
                <div className="text-base font-extrabold text-white">{risk.temperatura_c} °C</div>
                <div className="text-[11px] text-[#8C9BAA] flex items-center justify-center gap-1 mt-0.5">
                  <Thermometer className="w-3 h-3 text-rose-400" />
                  <span>{t.temperaturaLabel}</span>
                </div>
              </div>

              <div className="rounded-xl bg-[#0B0F14]/70 border border-[#232F3B] p-2.5">
                <div className="text-base font-extrabold text-white">{risk.humedad_relativa_pct}%</div>
                <div className="text-[11px] text-[#8C9BAA] flex items-center justify-center gap-1 mt-0.5">
                  <Droplets className="w-3 h-3 text-cyan-400" />
                  <span>{t.humedadLabel}</span>
                </div>
              </div>

              <div className="rounded-xl bg-[#0B0F14]/70 border border-[#232F3B] p-2.5">
                <div className="text-base font-extrabold text-white">{risk.viento_kmh} km/h</div>
                <div className="text-[11px] text-[#8C9BAA] flex items-center justify-center gap-1 mt-0.5">
                  <Wind className="w-3 h-3 text-teal-400" />
                  <span>{t.vientoLabel}</span>
                </div>
              </div>

              <div className="rounded-xl bg-[#0B0F14]/70 border border-[#232F3B] p-2.5">
                <div className="text-base font-extrabold text-white">5° (&lt;3°)</div>
                <div className="text-[11px] text-[#8C9BAA] flex items-center justify-center gap-1 mt-0.5">
                  <Mountain className="w-3 h-3 text-amber-400" />
                  <span>Pendiente interfaz</span>
                </div>
              </div>
            </div>
          </div>

          {/* Botón directo para configurar aviso preventivo por correo */}
          <div className="pt-2 border-t border-[#2D3B48]">
            <button
              onClick={onOpenSubscribe}
              aria-haspopup="dialog"
              className={`w-full group flex items-center justify-between rounded-xl border border-cyan-500/40 bg-cyan-950/40 px-3.5 py-2.5 text-xs font-bold text-cyan-200 hover:bg-cyan-900/50 hover:border-cyan-300 transition ${FOCUS}`}
            >
              <span className="text-left">{t.btnBoletin}</span>
              <ArrowRight
                className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
      )}

      {/* SECCIÓN 2: PREDICCIÓN PREVENTIVA ESTACIONAL A 72 SEMANAS (~17 MESES) - DIRECTAMENTE VISIBLE */}
      {(modoVista === 'completa' || modoVista === 'proyeccion72') && (
        <div className={`space-y-3 animate-in fade-in duration-150 ${modoVista === 'completa' ? 'pt-4 border-t border-[#2D3B48]' : ''}`}>
          <div className="flex items-center justify-between text-xs text-[#8C9BAA]">
            <div className="flex items-center gap-1.5 font-bold text-white">
              <TrendingUp className="w-4 h-4 text-rose-500" />
              <span>Proyección Preventiva a 72 Semanas (~17m)</span>
            </div>
            <span className="font-mono text-cyan-300 bg-[#0B0F14] px-2 py-0.5 rounded border border-[#3A4B5C] text-[11px]">
              26 Años Serie MODIS+VIIRS
            </span>
          </div>

          {/* Gráfico interactivo de proyección estacional 72 semanas con Recharts */}
          <div className="h-64 w-full rounded-xl bg-[#0B0F14]/90 p-2.5 border border-[#2D3B48]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={proyeccion72} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRiesgo72" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF003C" stopOpacity={0.7} />
                    <stop offset="60%" stopColor="#FF6B00" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#141B22" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#232F3B" />
                <XAxis
                  dataKey="semana"
                  stroke="#8C9BAA"
                  fontSize={10}
                  tickFormatter={(s: number) => (s % 12 === 0 || s === 1 ? `Sem ${s}` : '')}
                />
                <YAxis stroke="#8C9BAA" fontSize={10} domain={[0, 100]} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload as ProyeccionSemanal72;
                      return (
                        <div className="rounded-xl bg-[#0B0F14] border border-[#3A4B5C] p-3 text-xs shadow-2xl max-w-xs">
                          <div className="font-bold text-white mb-1 flex items-center justify-between gap-3">
                            <span>{d.fecha_inicio}</span>
                            {d.es_ventana_critica && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-600 text-[10px] font-bold">
                                VENTANA CRÍTICA
                              </span>
                            )}
                          </div>
                          <div className="space-y-1 text-slate-300">
                            <div>
                              <span className="text-[#8C9BAA]">Índice de riesgo:</span>{' '}
                              <strong className="text-white">{d.riesgo_estimado_pct}%</strong>
                            </div>
                            <div>
                              <span className="text-[#8C9BAA]">Celdas proyectadas:</span>{' '}
                              <strong className="text-white">{d.celdas_proyectadas} celdas (1km)</strong>
                            </div>
                            <div className="pt-1 text-[11px] text-cyan-200 border-t border-[#2D3B48]">
                              {d.fase_estacional}
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="riesgo_estimado_pct"
                  name="Riesgo de Ignición Estacional (%)"
                  stroke="#FF6B00"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRiesgo72)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Ventanas críticas destacadas */}
          <div className="rounded-xl bg-[#0B0F14] border border-[#2D3B48] p-3 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-white font-semibold">
              <TrendingUp className="w-4 h-4 text-cyan-300" />
              <span>Próximas Ventanas Críticas de Prevención (72 semanas):</span>
              {cargando72 && (
                <span className="text-[#8C9BAA] text-[10px] animate-pulse">
                  Calculando climatología...
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-lg bg-[#141B22] border border-amber-500/40 p-2">
                <div className="font-bold text-amber-300 mb-0.5">
                  {ventanaCortafuegos
                    ? `${ventanaCortafuegos.fecha_inicio} (${ventanaCortafuegos.riesgo_estimado_pct}% riesgo)`
                    : 'Semanas 3 a 7 (Diciembre)'}
                </div>
                <div className="text-white font-medium">Ventana de Cortafuegos</div>
                <p className="text-[#8C9BAA] mt-1 text-[10px] leading-relaxed">
                  {ventanaCortafuegos?.recomendacion_land_managers || (
                    <>
                      Preparación y despeje de cortafuegos perimetrales para <strong>Land Managers</strong> antes del inicio del peak de sequedad.
                    </>
                  )}
                </p>
              </div>

              <div className="rounded-lg bg-[#141B22] border border-rose-500/50 p-2">
                <div className="font-bold text-rose-400 mb-0.5">
                  {ventanaPeak
                    ? `${ventanaPeak.fecha_inicio} (${ventanaPeak.riesgo_estimado_pct}% riesgo)`
                    : 'Semanas 8 a 15 (Ene–Feb 2027)'}
                </div>
                <div className="text-white font-medium">Peak Crítico de Ignición</div>
                <p className="text-[#8C9BAA] mt-1 text-[10px] leading-relaxed">
                  {ventanaPeak?.recomendacion_municipios || (
                    <>
                      Veda total de quemas agrícolas, prohibición de faenas con chispas y patrullajes preventivos de interfaz.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Aviso de gobernanza ética */}
          <div className="flex gap-2 rounded-xl border border-cyan-400/40 bg-cyan-950/30 p-2.5 text-xs text-cyan-100">
            <Shield className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-[11px] leading-relaxed">
              <strong>Asistencia IA orientativa:</strong> apoya la planificación preventiva a 72 semanas, pero la decisión de despacho siempre es humana.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
