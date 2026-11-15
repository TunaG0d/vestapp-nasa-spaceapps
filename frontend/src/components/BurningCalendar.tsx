import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  Calendar,
  Compass,
  Flame,
  Grid,
  HelpCircle,
  Info,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  ANIOS_DISPONIBLES,
  type DiaCalendarioData,
} from '../mocks/fireData';
import { FOCUS, type Paleta } from '../lib/theme';
import { fetchCalendarioDiario, type CalendarioDiarioResp } from '../services/api';
import { textos } from '../lib/lang';

interface Props {
  anio: number;
  setAnio: (a: number) => void;
  pal: Paleta;
  daltonico: boolean;
  claro: boolean;
  lugarActivoTexto: string;
  dias: DiaCalendarioData[];
}

const NOMBRES_MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];
const DIAS_SEMANA_LUNES_DOM = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DIAS_SEMANA_COMPLETO = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function BurningCalendarView({
  anio,
  setAnio,
  pal,
  daltonico,
  claro,
  lugarActivoTexto,
  dias,
}: Props) {
  const t = textos(claro);
  const [mesFiltro, setMesFiltro] = useState<number>(1); // 1 = Febrero por defecto
  const [mesFiltroActivo, setMesFiltroActivo] = useState<'TODOS' | number>('TODOS');
  const [modoVista, setModoVista] = useState<'matriz365' | 'graficoDiario'>('matriz365');

  // Datos diarios del año seleccionado (365 días)
  const diasAnio = dias;

  // Encontrar el día con mayor actividad para seleccionarlo inicialmente
  const diaPeakInicial = useMemo(() => {
    let peak = diasAnio[0];
    for (const d of diasAnio) {
      if (d.celdas_armonizadas > peak.celdas_armonizadas) {
        peak = d;
      }
    }
    return peak;
  }, [diasAnio]);

  const [diaSeleccionado, setDiaSeleccionado] = useState<DiaCalendarioData>(diaPeakInicial);

  // Al cambiar de año, actualizar día seleccionado al peak de ese año
  useMemo(() => {
    setDiaSeleccionado(diaPeakInicial);
  }, [diaPeakInicial]);

  // Días filtrados para el gráfico diario del mes
  const diasMes = useMemo(
    () => diasAnio.filter((d) => d.mes_idx === mesFiltro),
    [diasAnio, mesFiltro],
  );

  // Rampa térmica diaria oficial
  const colorDia = (nivel: DiaCalendarioData['nivel'], celdas: number): string => {
    if (celdas === 0) return '#141B22';
    if (nivel === 'BAJA') return '#1E293B';
    if (daltonico) {
      if (nivel === 'MODERADO') return '#56B4E9';
      if (nivel === 'ALTO') return '#E69F00';
      return '#CC79A7';
    }
    if (nivel === 'MODERADO') return '#EAB308';
    if (nivel === 'ALTO') return '#F97316';
    return '#EF4444';
  };

  return (
    <section aria-labelledby="cal-titulo" className="space-y-4">
      {/* Banner explicativo del horizonte NASA y lugar activo */}
      <div className="rounded-xl border border-[#2D3B48] bg-[#141B22] p-4 flex flex-wrap items-start justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 shrink-0 mt-0.5">
            <Calendar className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 id="cal-titulo" className="text-base font-bold text-white">
                {t.calTitulo}
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#0B0C10] text-cyan-300 border border-[#2D3B48]">
                NASA 2000–2026
              </span>
            </div>
            <p className="text-xs text-[#8C9BAA] mt-1 leading-relaxed">
              {t.calSub}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-cyan-300 font-mono mt-1.5">
              <Compass className="w-3.5 h-3.5" />
              <span>{lugarActivoTexto}</span>
            </div>
          </div>
        </div>

        {/* Selector de Año 2000 a 2026 */}
        <div className="flex items-center gap-2 bg-[#0B0C10] p-1.5 rounded-xl border border-[#2D3B48]">
          <span className="text-xs text-[#8C9BAA] pl-1 font-medium">Año:</span>
          <select
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value))}
            aria-label="Seleccionar año histórico de consulta"
            className={`rounded-lg bg-[#141B22] border border-[#2D3B48] px-3 py-1.5 text-white font-mono text-sm font-semibold cursor-pointer ${FOCUS}`}
          >
            {ANIOS_DISPONIBLES.map((a) => (
              <option key={a} value={a}>
                {a} {a === 2017 || a === 2023 || a === 2024 ? '★ (Pico Histórico)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Contenedor Principal: Matriz Diaria 365 días + Gráfico Diario */}
      <div className="rounded-2xl border border-[#2D3B48] bg-[#141B22] p-5 space-y-5 shadow-xl">
        {/* Cabecera de controles de vista */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#2D3B48]">
          <div>
            <h3 className="font-extrabold text-white text-base">
              {claro ? `Calendario de Incendios Día por Día (${anio})` : `Calendario Diario de Celdas Armonizadas (${anio})`}
            </h3>
            <p className="text-xs text-[#8C9BAA] mt-0.5">
              Semanas de <strong className="text-cyan-300">Lunes a Domingo</strong> con numeración de días (1–31) y severidad térmica satelital.
            </p>
          </div>

          <div role="tablist" aria-label="Modo de visualización diaria" className="flex rounded-xl bg-[#0B0C10] p-1 border border-[#2D3B48] text-xs">
            <button
              role="tab"
              aria-selected={modoVista === 'matriz365'}
              onClick={() => setModoVista('matriz365')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-bold ${FOCUS} ${
                modoVista === 'matriz365' ? 'bg-cyan-800 text-white shadow-md' : 'text-[#8C9BAA] hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Calendario Anual (Lunes–Domingo)</span>
            </button>
            <button
              role="tab"
              aria-selected={modoVista === 'graficoDiario'}
              onClick={() => setModoVista('graficoDiario')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-bold ${FOCUS} ${
                modoVista === 'graficoDiario' ? 'bg-cyan-800 text-white shadow-md' : 'text-[#8C9BAA] hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Gráfico Curva Diaria por Mes</span>
            </button>
          </div>
        </div>

        {/* Barra de Filtro Rápido por Mes */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[#8C9BAA] font-semibold mr-1">Filtrar mes:</span>
          <button
            type="button"
            onClick={() => setMesFiltroActivo('TODOS')}
            className={`px-3 py-1 rounded-lg font-bold transition border ${
              mesFiltroActivo === 'TODOS'
                ? 'bg-rose-600 border-rose-500 text-white shadow'
                : 'bg-[#0B0C10] border-[#2D3B48] text-[#8C9BAA] hover:text-white'
            }`}
          >
            Todos los 12 Meses
          </button>
          {NOMBRES_MESES.map((m, idx) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMesFiltroActivo(idx);
                setMesFiltro(idx);
              }}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition border ${
                mesFiltroActivo === idx
                  ? 'bg-cyan-700 border-cyan-400 text-white shadow'
                  : 'bg-[#0B0C10] border-[#2D3B48] text-[#8C9BAA] hover:text-white'
              }`}
            >
              {m.slice(0, 3)}
            </button>
          ))}
        </div>

        {/* VISTA 1: CALENDARIO ANUAL EN CUADRÍCULA CON LUNES A DOMINGO Y DÍAS 1-31 */}
        {modoVista === 'matriz365' ? (
          <div className="space-y-4">
            <div className={`grid gap-4 ${
              mesFiltroActivo === 'TODOS'
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                : 'grid-cols-1 max-w-2xl mx-auto'
            }`}>
              {NOMBRES_MESES.map((mesNombre, mIdx) => {
                if (mesFiltroActivo !== 'TODOS' && mesFiltroActivo !== mIdx) {
                  return null;
                }
                const diasDelMes = diasAnio.filter((d) => d.mes_idx === mIdx);
                const totalCeldasMes = diasDelMes.reduce((acc, d) => acc + d.celdas_armonizadas, 0);
                const primerDia = diasDelMes[0];
                // Offset de lunes (0 = Lun, 1 = Mar, 2 = Mié, 3 = Jue, 4 = Vie, 5 = Sáb, 6 = Dom)
                const primerDiaOffset = primerDia ? (primerDia.dia_de_la_semana + 6) % 7 : 0;

                return (
                  <div
                    key={mesNombre}
                    className="rounded-xl border border-[#2D3B48] bg-[#0E141B] p-3 shadow-md flex flex-col justify-between hover:border-cyan-500/50 transition-colors"
                  >
                    {/* Cabecera del mes con total de celdas */}
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#2D3B48]">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white text-sm tracking-wide">{mesNombre}</span>
                        <span className="text-[11px] text-[#8C9BAA] font-mono">{anio}</span>
                      </div>
                      {totalCeldasMes > 0 ? (
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                            totalCeldasMes >= 1000
                              ? 'bg-rose-950 text-rose-300 border border-rose-600'
                              : totalCeldasMes >= 200
                              ? 'bg-amber-950 text-amber-300 border border-amber-600'
                              : 'bg-cyan-950 text-cyan-300 border border-cyan-700'
                          }`}
                        >
                          {totalCeldasMes.toLocaleString('es-CL')} celdas
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#6B7280] font-mono">0 incendios</span>
                      )}
                    </div>

                    {/* Días de la semana con Lunes y Viernes explícitos */}
                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-extrabold pb-1.5 mb-1 text-[#8C9BAA] border-b border-[#232F3B]">
                      <span className="text-cyan-400" title="Lunes">Lun</span>
                      <span title="Martes">Mar</span>
                      <span title="Miércoles">Mié</span>
                      <span title="Jueves">Jue</span>
                      <span className="text-amber-400" title="Viernes">Vie</span>
                      <span className="text-slate-400" title="Sábado">Sáb</span>
                      <span className="text-slate-400" title="Domingo">Dom</span>
                    </div>

                    {/* Grilla de 7 columnas con días alineados */}
                    <div className="grid grid-cols-7 gap-1">
                      {/* Días vacíos antes del día 1 para alineación correcta de días de la semana */}
                      {Array.from({ length: primerDiaOffset }).map((_, i) => (
                        <div key={`empty-prev-${i}`} className="h-7 rounded bg-transparent opacity-10 pointer-events-none" />
                      ))}

                      {/* Días del mes */}
                      {diasDelMes.map((dia) => {
                        const bg = colorDia(dia.nivel, dia.celdas_armonizadas);
                        const esSeleccionado = diaSeleccionado.fecha === dia.fecha;
                        const tieneFuego = dia.celdas_armonizadas > 0;
                        const esCritico = dia.nivel === 'CRITICA';
                        return (
                          <button
                            key={dia.fecha}
                            type="button"
                            onClick={() => setDiaSeleccionado(dia)}
                            title={`${dia.fecha} (${DIAS_SEMANA_COMPLETO[dia.dia_de_la_semana]}): ${dia.celdas_armonizadas} celdas de 1 km (FRP máx: ${dia.frp_max_dia} MW)`}
                            className={`h-7 rounded flex items-center justify-center text-xs font-mono font-bold transition-all ${
                              esSeleccionado
                                ? 'ring-2 ring-white ring-offset-1 ring-offset-[#0B0C10] scale-110 z-10'
                                : 'hover:scale-110 hover:z-10'
                            } ${esCritico ? 'shadow-[0_0_8px_rgba(239,68,68,0.6)]' : ''}`}
                            style={{
                              backgroundColor: bg,
                              color: dia.nivel === 'MODERADO' && !daltonico ? '#000000' : tieneFuego ? '#FFFFFF' : '#6B7280',
                              border: esSeleccionado
                                ? '2px solid #FFFFFF'
                                : tieneFuego
                                ? '1px solid rgba(255,255,255,0.25)'
                                : '1px solid #1F2833',
                            }}
                          >
                            {dia.dia_del_mes}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Simbología y unidades explícitas */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#2D3B48] text-[11px] text-[#8C9BAA]">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-bold text-white">Simbología (Celdas activas armonizadas de 1 km / día):</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded" style={{ backgroundColor: colorDia('BAJA', 0), border: '1px solid #232F3B' }} />
                  <span>0 celdas (Sin detección)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded" style={{ backgroundColor: colorDia('BAJA', 5) }} />
                  <span>1–19 celdas (Baja)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded" style={{ backgroundColor: colorDia('MODERADO', 30) }} />
                  <span>20–59 celdas (Moderada)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded" style={{ backgroundColor: colorDia('ALTO', 80) }} />
                  <span>60–179 celdas (Alta)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded shadow-[0_0_6px_rgba(239,68,68,0.7)]" style={{ backgroundColor: colorDia('CRITICA', 200) }} />
                  <span>≥180 celdas (Crítica)</span>
                </div>
              </div>
              <span className="text-cyan-300 font-medium">Haz clic en cualquier celda para inspeccionar el evento satelital.</span>
            </div>
          </div>
        ) : (
          /* VISTA 2: GRÁFICO DIARIO DETALLADO POR MES */
          <div className="space-y-3">
            {/* Selector de Mes */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[#8C9BAA]">Mes a visualizar:</span>
                <select
                  value={mesFiltro}
                  onChange={(e) => setMesFiltro(Number(e.target.value))}
                  className={`rounded bg-[#0B0C10] border border-[#323E4C] px-3 py-1 text-white font-medium cursor-pointer ${FOCUS}`}
                >
                  {NOMBRES_MESES.map((m, idx) => (
                    <option key={m} value={idx}>
                      {m} {anio}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 text-[11px] text-[#8C9BAA]">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-cyan-500" />
                  <span>Celdas activas armonizadas ({anio})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-amber-400" />
                  <span>Mediana Histórica Diaria (2000–2025)</span>
                </div>
              </div>
            </div>

            {/* Gráfico Recharts con Ejes Explícitos */}
            <div className="h-60 w-full rounded-lg bg-[#0B0C10]/60 p-2 border border-[#323E4C]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={diasMes} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#323E4C" />
                  <XAxis
                    dataKey="dia_del_mes"
                    stroke="#8C9BAA"
                    fontSize={11}
                    label={{
                      value: `Días de ${NOMBRES_MESES[mesFiltro]} (${anio})`,
                      position: 'insideBottom',
                      offset: -12,
                      fill: '#8C9BAA',
                      fontSize: 11,
                    }}
                  />
                  <YAxis
                    stroke="#8C9BAA"
                    fontSize={11}
                    label={{
                      value: 'Celdas activas armonizadas (1 km)',
                      angle: -90,
                      position: 'insideLeft',
                      offset: 0,
                      fill: '#8C9BAA',
                      fontSize: 11,
                    }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload as DiaCalendarioData;
                        return (
                          <div className="rounded-lg bg-[#0B0C10] border border-[#323E4C] p-3 text-xs shadow-xl">
                            <div className="font-bold text-white mb-1 flex items-center justify-between gap-3">
                              <span>{d.fecha}</span>
                              {d.anomalia && (
                                <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-600 text-[10px] font-bold">
                                  ANOMALÍA
                                </span>
                              )}
                            </div>
                            <div className="space-y-1 text-slate-300">
                              <div>
                                <span className="text-[#8C9BAA]">Celdas observadas:</span>{' '}
                                <strong className="text-white">{d.celdas_armonizadas} celdas (1 km)</strong>
                              </div>
                              <div>
                                <span className="text-[#8C9BAA]">Mediana histórica diaria:</span>{' '}
                                <strong className="text-white">{d.mediana_historica_diaria} celdas</strong>
                              </div>
                              <div>
                                <span className="text-[#8C9BAA]">Diferencia vs mediana:</span>{' '}
                                <strong className={d.diferencia_pct > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                                  {d.diferencia_pct > 0 ? `+${d.diferencia_pct}%` : `${d.diferencia_pct}%`}
                                </strong>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="celdas_armonizadas"
                    name="Celdas Armonizadas (1 km)"
                    cursor="pointer"
                    onClick={(_: unknown, idx: number) => setDiaSeleccionado(diasMes[idx])}
                  >
                    {diasMes.map((d) => (
                      <Cell
                        key={d.fecha}
                        fill={colorDia(d.nivel, d.celdas_armonizadas)}
                        stroke={diaSeleccionado.fecha === d.fecha ? '#FFFFFF' : 'none'}
                        strokeWidth={2}
                      />
                    ))}
                  </Bar>
                  <Line
                    type="monotone"
                    dataKey="mediana_historica_diaria"
                    name="Mediana Histórica Diaria (2000–2025)"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 3. PANEL DE EXPLICACIÓN INTERACTIVA AL SELECCIONAR CUALQUIER DÍA */}
        <div
          role="region"
          aria-labelledby="explicacion-dia-titulo"
          className="rounded-xl border-2 border-cyan-400/50 bg-[#0B0C10] p-4 text-xs space-y-3 shadow-lg"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#323E4C]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-300" aria-hidden="true" />
              <h4 id="explicacion-dia-titulo" className="font-bold text-white text-sm">
                Explicación Contextual: {DIAS_SEMANA_COMPLETO[diaSeleccionado.dia_de_la_semana]} {diaSeleccionado.dia_del_mes} de {diaSeleccionado.mes_nombre} ({diaSeleccionado.fecha})
              </h4>
            </div>
            <span className="font-mono text-cyan-300 px-2.5 py-0.5 rounded bg-[#1F2833] border border-[#323E4C]">
              {lugarActivoTexto}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Tarjeta 1: Conteo y anomalía */}
            <div className="rounded-lg bg-[#1F2833] p-3 border border-[#323E4C]">
              <span className="text-[#8C9BAA]">Celdas observadas vs Mediana:</span>
              <div className="text-xl font-extrabold text-white mt-1">
                {diaSeleccionado.celdas_armonizadas}{' '}
                <span className="text-xs font-normal text-[#8C9BAA]">celdas de 1 km</span>
              </div>
              <p className="text-[11px] mt-1 text-slate-300">
                Mediana histórica diaria (2000–2025): <strong>{diaSeleccionado.mediana_historica_diaria} celdas</strong>.
                {diaSeleccionado.diferencia_pct > 0 ? (
                  <span className="text-rose-400 font-semibold block mt-0.5">
                    (+{diaSeleccionado.diferencia_pct}% sobre la mediana histórica diaria)
                  </span>
                ) : (
                  <span className="text-emerald-400 font-semibold block mt-0.5">
                    ({diaSeleccionado.diferencia_pct}% respecto a la mediana histórica)
                  </span>
                )}
              </p>
            </div>

            {/* Tarjeta 2: Sensores y potencia */}
            <div className="rounded-lg bg-[#1F2833] p-3 border border-[#323E4C]">
              <span className="text-[#8C9BAA]">Potencia y Sensores Activos:</span>
              <div className="text-xl font-extrabold text-white mt-1">
                {diaSeleccionado.frp_max_dia}{' '}
                <span className="text-xs font-normal text-[#8C9BAA]">MW (FRP máx)</span>
              </div>
              <p className="text-[11px] mt-1 text-slate-300">
                Sensores satelitales coincidentes: <strong className="text-cyan-200">{diaSeleccionado.sensores_activos}</strong>.
              </p>
            </div>

            {/* Tarjeta 3: Contexto histórico */}
            <div className="rounded-lg bg-[#1F2833] p-3 border border-[#323E4C]">
              <span className="text-[#8C9BAA]">Contexto Operativo / Histórico:</span>
              <div className="text-xs font-semibold text-white mt-1">
                {diaSeleccionado.evento_historico ? (
                  <span className="text-amber-300">{diaSeleccionado.evento_historico}</span>
                ) : diaSeleccionado.anomalia ? (
                  <span className="text-rose-300">Anomalía estacional con condiciones críticas de ignición</span>
                ) : (
                  <span className="text-slate-300">Régimen térmico habitual dentro de los parámetros estacionales esperados</span>
                )}
              </div>
              <p className="text-[11px] text-[#8C9BAA] mt-1">
                Nivel clasificado: <strong className="text-white">{diaSeleccionado.nivel}</strong>.
              </p>
            </div>
          </div>

          <div className="text-[11px] text-[#8C9BAA] pt-1 border-t border-[#323E4C] flex items-center justify-between">
            <span>
              Resumen para la fecha: <strong>{DIAS_SEMANA_COMPLETO[diaSeleccionado.dia_de_la_semana]} {diaSeleccionado.dia_del_mes} de {diaSeleccionado.mes_nombre} {anio}</strong> en {lugarActivoTexto}: {diaSeleccionado.celdas_armonizadas} celdas activas de 1 km ({diaSeleccionado.diferencia_pct > 0 ? `+${diaSeleccionado.diferencia_pct}%` : `${diaSeleccionado.diferencia_pct}%`} sobre la mediana histórica diaria de {diaSeleccionado.mediana_historica_diaria} celdas).
            </span>
            <span className="font-mono text-cyan-400">NASA MODIS + VIIRS Harmonized</span>
          </div>
        </div>
      </div>
    </section>
  );
}


interface WrapperProps extends Omit<Props, 'dias'> {
  zonaId: string;
  center: [number, number];
  radioKm: number;
}

export default function BurningCalendar(props: WrapperProps) {
  const { zonaId, center, radioKm, anio, setAnio, lugarActivoTexto } = props;
  const [resp, setResp] = useState<CalendarioDiarioResp | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let alive = true;
    setCargando(true);
    fetchCalendarioDiario(zonaId, anio, zonaId === 'custom' ? center : undefined, radioKm).then((r) => {
      if (!alive) return;
      setResp(r);
      setCargando(false);
    });
    return () => {
      alive = false;
    };
  }, [zonaId, anio, center, radioKm]);

  if (cargando && !resp) {
    return (
      <p role="status" className="rounded-xl border border-[#323E4C] bg-[#1F2833] p-6 text-[#8C9BAA]">
        Cargando calendario armonizado de {lugarActivoTexto}…
      </p>
    );
  }

  if (!resp || resp.dias.length === 0) {
    return (
      <div role="status" className="rounded-xl border border-[#323E4C] bg-[#1F2833] p-6 space-y-2">
        <h3 className="text-white font-semibold">Sin datos satelitales para esta área</h3>
        <p className="text-[#8C9BAA] text-sm">
          {lugarActivoTexto}. El dataset armonizado aún no contiene detecciones MODIS/VIIRS para esta zona
          {resp?.cobertura?.desde ? ` (cobertura disponible: ${resp.cobertura.desde} a ${resp.cobertura.hasta})` : ''}.
          No se muestran valores de reemplazo.
        </p>
      </div>
    );
  }

  const cov = resp.cobertura;
  const fueraDeCobertura = !!cov?.desde && (`${anio}-12-31` < cov.desde || `${anio}-01-01` > (cov.hasta ?? ''));
  return (
    <div className="space-y-3">
      {resp.demo && (
        <p role="alert" className="rounded-lg border border-[#323E4C] bg-[#1F2833] px-3 py-2 text-xs text-white">
          Sin conexión con el backend: estos valores son de demostración y no corresponden a detecciones reales.
        </p>
      )}
      {fueraDeCobertura && (
        <p role="status" className="rounded-lg border border-[#323E4C] bg-[#1F2833] px-3 py-2 text-xs text-[#8C9BAA]">
          El año {anio} está fuera de la cobertura descargada ({cov?.desde} a {cov?.hasta}): sus días aparecen sin
          detecciones por falta de datos, no por ausencia de fuego.
        </p>
      )}
      <BurningCalendarView {...props} dias={resp.dias} setAnio={setAnio} />
    </div>
  );
}
