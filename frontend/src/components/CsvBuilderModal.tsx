import { useState, useMemo } from 'react';
import { Download, X, Calendar, Filter, CheckCircle2 } from 'lucide-react';
import type { PuntoArmonizado, Zona, Sensor, Intensidad } from '../mocks/fireData';

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  zona: Zona;
  puntos: PuntoArmonizado[];
  anio: number;
}

export default function CsvBuilderModal({ abierto, onCerrar, zona, puntos, anio }: Props) {
  // Configuración de columnas
  const [colCoords, setColCoords] = useState(true);
  const [colSensores, setColSensores] = useState(true);
  const [colFecha, setColFecha] = useState(true);
  const [colIntensidad, setColIntensidad] = useState(true);
  const [colFrp, setColFrp] = useState(true);

  // Filtros de preview
  const [filtroSensor, setFiltroSensor] = useState<'Todos' | 'MODIS' | 'VIIRS'>('Todos');
  const [filtroIntensidad, setFiltroIntensidad] = useState<'Todos' | 'Crítico' | 'Moderado' | 'Leve'>('Todos');
  const [porPagina, setPorPagina] = useState<number>(15);
  const [pagina, setPagina] = useState<number>(1);

  // Fechas de rango
  const [fechaDesde, setFechaDesde] = useState(`${anio}-01-01`);
  const [fechaHasta, setFechaHasta] = useState(`${anio}-12-31`);

  // Filtrado de puntos según controles
  const puntosFiltrados = useMemo(() => {
    return puntos.filter((p) => {
      const matchSensor = filtroSensor === 'Todos' || p.sensores.includes(filtroSensor as Sensor);
      const matchIntensidad =
        filtroIntensidad === 'Todos' ||
        (filtroIntensidad === 'Crítico' && p.nivel_intensidad === 'EXTREMO') ||
        (filtroIntensidad === 'Moderado' && p.nivel_intensidad === 'ALTO') ||
        (filtroIntensidad === 'Leve' && p.nivel_intensidad === 'MODERADO');
      return matchSensor && matchIntensidad;
    });
  }, [puntos, filtroSensor, filtroIntensidad]);

  // Paginación
  const totalPaginas = Math.ceil(puntosFiltrados.length / porPagina) || 1;
  const puntosPaginados = puntosFiltrados.slice((pagina - 1) * porPagina, pagina * porPagina);

  // Generador real de descarga CSV
  const handleDescargarCsv = () => {
    const headers: string[] = ['ID_CELDA_1KM'];
    if (colCoords) {
      headers.push('LATITUD', 'LONGITUD');
    }
    if (colFecha) {
      headers.push('FECHA_DETECCION');
    }
    if (colFrp) {
      headers.push('FRP_MAX_MW', 'FOCOS_AGRUPADOS');
    }
    if (colSensores) {
      headers.push('SENSORES_NASA');
    }
    if (colIntensidad) {
      headers.push('NIVEL_INTENSIDAD');
    }

    const rows = puntosFiltrados.map((p) => {
      const row: (string | number)[] = [p.id_celda];
      if (colCoords) {
        row.push(p.lat.toFixed(4), p.lng.toFixed(4));
      }
      if (colFecha) {
        row.push(p.fecha);
      }
      if (colFrp) {
        row.push(p.frp_max, p.detecciones_agrupadas);
      }
      if (colSensores) {
        row.push(`"${p.sensores.join('+')}"`);
      }
      if (colIntensidad) {
        row.push(p.nivel_intensidad);
      }
      return row.join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `vestapp_${zona.id}_${anio}_armonizado.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="csv-modal-title"
        className="w-full max-w-4xl rounded-2xl border border-[#2D3B48] bg-[#141B22] p-5 shadow-2xl text-white max-h-[92vh] overflow-y-auto"
      >
        {/* Cabecera modal (Imagen 3) */}
        <div className="flex items-center justify-between pb-3 border-b border-[#2D3B48]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-500">
              <Download className="w-5 h-5" />
            </div>
            <h2 id="csv-modal-title" className="text-base font-extrabold tracking-wide text-white">
              CONSTRUCTOR DE EXPORTACIÓN CSV
            </h2>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="p-1.5 rounded-lg text-[#8C9BAA] hover:text-white hover:bg-[#2D3B48] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sección 1: Lugar, Bounding Box y Rango Temporal */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-xs">
          {/* Lugar y Bounding Box */}
          <div className="space-y-1.5">
            <span className="font-bold text-[#8C9BAA] uppercase text-[10px] tracking-wider">
              LUGAR Y BOUNDING BOX:
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[#8C9BAA]">COORDENADAS:</span>
              <span className="px-2 py-1 rounded bg-[#0B0F14] border border-[#2D3B48] font-mono text-cyan-300">
                {zona.center[0].toFixed(2)}
              </span>
              <span className="px-2 py-1 rounded bg-[#0B0F14] border border-[#2D3B48] font-mono text-cyan-300">
                {zona.center[1].toFixed(2)}
              </span>
            </div>
            <div className="text-[11px] text-[#8C9BAA]">
              BOUNDING BOX (O, S, E, N):
              <div className="mt-1 px-2.5 py-1 rounded bg-[#0B0F14] border border-[#2D3B48] font-mono text-slate-300">
                [{zona.bbox.map((n) => n.toFixed(1) + '°').join(', ')}]
              </div>
            </div>
          </div>

          {/* Rango Temporal */}
          <div className="space-y-1.5">
            <span className="font-bold text-[#8C9BAA] uppercase text-[10px] tracking-wider">
              RANGO TEMPORAL:
            </span>
            <div className="text-[11px] text-cyan-400 font-semibold">
              SERIE COMPLETA MODIS 2000 + Y VIIRS 2012+
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full bg-[#0B0F14] border border-[#2D3B48] rounded px-2 py-1 text-slate-200 text-xs font-mono"
              />
              <span className="text-[#8C9BAA]">-</span>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full bg-[#0B0F14] border border-[#2D3B48] rounded px-2 py-1 text-slate-200 text-xs font-mono"
              />
            </div>
          </div>

          {/* Filtros de Sensor e Intensidad */}
          <div className="space-y-1.5">
            <span className="font-bold text-[#8C9BAA] uppercase text-[10px] tracking-wider">
              FILTROS ACTIVOS:
            </span>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[#8C9BAA]">SENSORES:</span>
                <select
                  value={filtroSensor}
                  onChange={(e) => setFiltroSensor(e.target.value as any)}
                  className="bg-[#0B0F14] border border-[#2D3B48] rounded px-2 py-0.5 text-xs text-white"
                >
                  <option value="Todos">Todos (MODIS + VIIRS)</option>
                  <option value="MODIS">Solo MODIS (1 km)</option>
                  <option value="VIIRS">Solo VIIRS (375 m)</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#8C9BAA]">INTENSIDAD:</span>
                <select
                  value={filtroIntensidad}
                  onChange={(e) => setFiltroIntensidad(e.target.value as any)}
                  className="bg-[#0B0F14] border border-[#2D3B48] rounded px-2 py-0.5 text-xs text-white"
                >
                  <option value="Todos">Todas las intensidades</option>
                  <option value="Crítico">Foco Crítico (Extremo)</option>
                  <option value="Moderado">Alerta media (Alto)</option>
                  <option value="Leve">Anomalía leve (Moderado)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Sección 2: Toggles de Columnas a incluir en el CSV (Imagen 3) */}
        <div className="mt-4 pt-3 border-t border-[#2D3B48]">
          <span className="block font-bold text-[#8C9BAA] uppercase text-[10px] tracking-wider mb-2">
            SELECCIONA LAS COLUMNAS Y MÉTRICAS A INCLUIR EN EL ARCHIVO CSV:
          </span>
          <div className="flex flex-wrap gap-4 text-xs">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={colCoords}
                onChange={(e) => setColCoords(e.target.checked)}
                className="w-4 h-4 accent-cyan-500 rounded"
              />
              <span>Coordenadas grilla 1 Km</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={colSensores}
                onChange={(e) => setColSensores(e.target.checked)}
                className="w-4 h-4 accent-cyan-500 rounded"
              />
              <span>Sensores coincidentes</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={colFecha}
                onChange={(e) => setColFecha(e.target.checked)}
                className="w-4 h-4 accent-cyan-500 rounded"
              />
              <span>Fecha de detección</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={colIntensidad}
                onChange={(e) => setColIntensidad(e.target.checked)}
                className="w-4 h-4 accent-cyan-500 rounded"
              />
              <span>Nivel de intensidad</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={colFrp}
                onChange={(e) => setColFrp(e.target.checked)}
                className="w-4 h-4 accent-cyan-500 rounded"
              />
              <span>FRP Máximo (MW)</span>
            </label>
          </div>
        </div>

        {/* Barra de estado: Área activa */}
        <div className="mt-3 py-1.5 px-3 rounded-lg bg-[#0B0F14] border border-[#2D3B48] text-xs text-[#8C9BAA] font-mono flex items-center justify-between">
          <span>
            ÁREA ACTIVA: <strong className="text-white">{zona.nombre}</strong> / {zona.center[0].toFixed(2)}°,{' '}
            {zona.center[1].toFixed(2)}° / Radio {zona.radio_km || 50} Km / Serie multianual
          </span>
          <span className="text-cyan-400 font-bold">{puntosFiltrados.length} celdas filtradas</span>
        </div>

        {/* Sección 3: VISTA PREVIA Y TABLA CON FILTROS (Imagen 3) */}
        <div className="mt-4 pt-3 border-t border-[#2D3B48]">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold text-white uppercase text-[10px] tracking-wider">
                VISTA PREVIA:
              </span>

              {/* Botones rápidos de sensor */}
              <div className="flex items-center gap-1 bg-[#0B0F14] p-0.5 rounded-lg border border-[#2D3B48]">
                <span className="text-[#8C9BAA] px-1.5 text-[10px]">SENSOR:</span>
                {(['Todos', 'MODIS', 'VIIRS'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFiltroSensor(s)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                      filtroSensor === s ? 'bg-cyan-700 text-white font-bold' : 'text-[#8C9BAA] hover:text-white'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Botones rápidos de intensidad */}
              <div className="flex items-center gap-1 bg-[#0B0F14] p-0.5 rounded-lg border border-[#2D3B48]">
                <span className="text-[#8C9BAA] px-1.5 text-[10px]">INTENSIDAD:</span>
                {(['Todos', 'Crítico', 'Moderado', 'Leve'] as const).map((it) => (
                  <button
                    key={it}
                    type="button"
                    onClick={() => setFiltroIntensidad(it)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                      filtroIntensidad === it
                        ? 'bg-rose-700 text-white font-bold'
                        : 'text-[#8C9BAA] hover:text-white'
                    }`}
                  >
                    {it}
                  </button>
                ))}
              </div>
            </div>

            {/* Paginación selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[#8C9BAA] text-[11px]">POR PÁGINA:</span>
              <select
                value={porPagina}
                onChange={(e) => {
                  setPorPagina(Number(e.target.value));
                  setPagina(1);
                }}
                className="bg-[#0B0F14] border border-[#2D3B48] rounded px-2 py-1 text-xs text-white"
              >
                <option value={10}>10 Filas</option>
                <option value={15}>15 Filas</option>
                <option value={30}>30 Filas</option>
                <option value={50}>50 Filas</option>
              </select>
            </div>
          </div>

          {/* Tabla de Preview */}
          <div className="overflow-x-auto max-h-56 overflow-y-auto rounded-xl border border-[#232F3B]">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead className="bg-[#0B0F14] text-[#8C9BAA] uppercase text-[10px] tracking-wider sticky top-0 border-b border-[#232F3B]">
                <tr>
                  <th className="py-2 px-3">ID CELDA 1KM</th>
                  {colCoords && <th className="py-2 px-3">LAT / LNG</th>}
                  {colFecha && <th className="py-2 px-3">FECHA</th>}
                  {colFrp && <th className="py-2 px-3">FRP MÁX</th>}
                  {colFrp && <th className="py-2 px-3">FOCOS</th>}
                  {colSensores && <th className="py-2 px-3">SENSOR</th>}
                  {colIntensidad && <th className="py-2 px-3">INTENSIDAD</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#232F3B] bg-[#141B22]/70">
                {puntosPaginados.map((p) => (
                  <tr key={p.id_celda} className="hover:bg-[#1E2833] transition-colors">
                    <td className="py-1.5 px-3 text-cyan-300 font-bold">{p.id_celda}</td>
                    {colCoords && (
                      <td className="py-1.5 px-3 text-slate-300">
                        {p.lat.toFixed(2)}°, {p.lng.toFixed(2)}°
                      </td>
                    )}
                    {colFecha && <td className="py-1.5 px-3 text-slate-400">{p.fecha}</td>}
                    {colFrp && <td className="py-1.5 px-3 text-rose-400 font-bold">{p.frp_max} MW</td>}
                    {colFrp && <td className="py-1.5 px-3 text-white">{p.detecciones_agrupadas}</td>}
                    {colSensores && (
                      <td className="py-1.5 px-3 text-slate-300">{p.sensores.join(' + ')}</td>
                    )}
                    {colIntensidad && (
                      <td className="py-1.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.nivel_intensidad === 'EXTREMO'
                              ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                              : p.nivel_intensidad === 'ALTO'
                              ? 'bg-orange-950 text-orange-300 border border-orange-500/40'
                              : 'bg-yellow-950 text-yellow-300 border border-yellow-500/40'
                          }`}
                        >
                          {p.nivel_intensidad === 'EXTREMO'
                            ? 'Foco Crítico 🔥'
                            : p.nivel_intensidad === 'ALTO'
                            ? 'Alerta Media ⚠️'
                            : 'Leve 🟡'}
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pie de modal con botón de descarga azul (Imagen 3) */}
        <div className="mt-4 pt-3 border-t border-[#2D3B48] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[#8C9BAA]">
            <span>
              Página {pagina} de {totalPaginas}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={pagina <= 1}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                className="px-2 py-0.5 rounded bg-[#0B0F14] border border-[#2D3B48] disabled:opacity-40"
              >
                ‹
              </button>
              <button
                type="button"
                disabled={pagina >= totalPaginas}
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                className="px-2 py-0.5 rounded bg-[#0B0F14] border border-[#2D3B48] disabled:opacity-40"
              >
                ›
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDescargarCsv}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-blue-900/40"
          >
            <Download className="w-4 h-4" />
            <span>Descargar CSV Personalizado</span>
          </button>
        </div>
      </div>
    </div>
  );
}
