import { useEffect, useMemo, useState } from 'react';
import {
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Compass,
  Download,
  FileSpreadsheet,
  Filter,
  Layers,
  MapPin,
  Sliders,
  Sparkles,
} from 'lucide-react';
import type { Intensidad, PuntoArmonizado, Sensor, Zona } from '../mocks/fireData';
import { FOCUS, intensitySvg, type Paleta } from '../lib/theme';
import { frpTexto, nivelLabel, textos } from '../lib/lang';
import { buildHotspotsCsvUrl } from '../services/api';

interface Props {
  puntos: PuntoArmonizado[];
  sensorFiltro: 'TODOS' | Sensor;
  setSensorFiltro: (s: 'TODOS' | Sensor) => void;
  pal: Paleta;
  claro: boolean;
  totalSinFiltro: number;
  zonaActiva: Zona;
  lugarActivoTexto: string;
  fechaDesde: string;
  setFechaDesde: (v: string) => void;
  fechaHasta: string;
  setFechaHasta: (v: string) => void;
}

export default function DataTableTab({
  puntos,
  sensorFiltro,
  setSensorFiltro,
  pal,
  claro,
  totalSinFiltro,
  zonaActiva,
  lugarActivoTexto,
  fechaDesde,
  setFechaDesde,
  fechaHasta,
  setFechaHasta,
}: Props) {
  const t = textos(claro);
  const [intensidadFiltro, setIntensidadFiltro] = useState<'TODAS' | Intensidad>('TODAS');

  // Configuración del Constructor CSV Customizado
  const [colCoords, setColCoords] = useState<boolean>(true);
  const [colFecha, setColFecha] = useState<boolean>(true);
  const [colFrp, setColFrp] = useState<boolean>(true);
  const [colDetecciones, setColDetecciones] = useState<boolean>(true);
  const [colSensores, setColSensores] = useState<boolean>(true);
  const [colIntensidad, setColIntensidad] = useState<boolean>(true);

  // Filtro de sensor específico para exportación
  const [csvSensor, setCsvSensor] = useState<'TODOS' | Sensor>('TODOS');
  const [csvIntensidad, setCsvIntensidad] = useState<'TODAS' | Intensidad>('TODAS');

  // Bounding box editable para la descarga
  const [bboxCustom, setBboxCustom] = useState<string>(zonaActiva.bbox.join(', '));

  // Paginación y control de visualización de la vista previa tabular
  const [pagina, setPagina] = useState<number>(1);
  const [filasPorPagina, setFilasPorPagina] = useState<number>(15);
  const [tablaVisible, setTablaVisible] = useState<boolean>(true);

  // Puntos aplicables a la tabla en pantalla
  const puntosFiltrados = useMemo(() => {
    return puntos.filter(
      (p) => intensidadFiltro === 'TODAS' || p.nivel_intensidad === intensidadFiltro,
    );
  }, [puntos, intensidadFiltro]);

  // Reiniciar a la página 1 cuando cambian los filtros o datos
  useEffect(() => {
    setPagina(1);
  }, [puntos, intensidadFiltro, sensorFiltro]);

  const totalPaginas = Math.max(1, Math.ceil(puntosFiltrados.length / filasPorPagina));
  const puntosPaginados = useMemo(() => {
    const inicio = (pagina - 1) * filasPorPagina;
    return puntosFiltrados.slice(inicio, inicio + filasPorPagina);
  }, [puntosFiltrados, pagina, filasPorPagina]);

  // Descarga del CSV REAL generado por el backend (todos los focos armonizados del área y rango elegidos)
  const [descargando, setDescargando] = useState<boolean>(false);
  const [errorCsv, setErrorCsv] = useState<string>('');

  const nivelDeFrp = (frp: number): Intensidad => (frp >= 200 ? 'EXTREMO' : frp >= 70 ? 'ALTO' : 'MODERADO');

  const handleDescargarCustomCsv = async () => {
    setErrorCsv('');
    const nums = bboxCustom.split(',').map((s) => parseFloat(s.trim()));
    if (nums.length !== 4 || nums.some((n) => Number.isNaN(n))) {
      setErrorCsv('El bounding box debe ser: oeste, sur, este, norte (4 números).');
      return;
    }
    setDescargando(true);
    try {
      const url = buildHotspotsCsvUrl({
        bbox: nums as [number, number, number, number],
        start: fechaDesde,
        end: fechaHasta,
        sensor: csvSensor,
      });
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const texto = (await res.text()).replace(/\r/g, '').trim();
      const [cab, ...filas] = texto.split('\n');
      const idx = Object.fromEntries(cab.split(',').map((c, i) => [c, i]));
      const cols: { nombre: string; get: (f: string[]) => string }[] = [];
      if (colCoords) {
        cols.push({ nombre: 'latitud', get: (f) => f[idx.lat] }, { nombre: 'longitud', get: (f) => f[idx.lon] });
      }
      if (colFecha) cols.push({ nombre: 'fecha', get: (f) => f[idx.date] });
      if (colFrp) cols.push({ nombre: 'frp_mw', get: (f) => f[idx.frp] });
      if (colDetecciones) cols.push({ nombre: 'detecciones_agrupadas', get: (f) => f[idx.n_det] });
      if (colSensores) cols.push({ nombre: 'sensor', get: (f) => f[idx.sensor] });
      if (colIntensidad) cols.push({ nombre: 'nivel_intensidad', get: (f) => nivelDeFrp(parseFloat(f[idx.frp]) || 0) });
      cols.push({ nombre: 'peso_armonizacion', get: (f) => f[idx.weight] });

      const datos = filas
        .map((l) => l.split(','))
        .filter((f) => csvIntensidad === 'TODAS' || nivelDeFrp(parseFloat(f[idx.frp]) || 0) === csvIntensidad);

      const meta = [
        '# FireReady - NASA Space Apps Challenge (Harmonization MODIS & VIIRS)',
        `# ${lugarActivoTexto}`,
        `# Bounding Box (oeste, sur, este, norte): [${bboxCustom}]`,
        `# Rango temporal: ${fechaDesde} a ${fechaHasta}`,
        `# Sensores: ${csvSensor} | Celdas-día armonizadas de 1 km exportadas: ${datos.length}`,
        '# Fuente: NASA FIRMS (MODIS + VIIRS), armonizado en grilla de 1 km; peso = factor de escala a equivalente VIIRS',
        '',
      ];
      const csv =
        '\uFEFF' + meta.join('\n') + cols.map((c) => c.nombre).join(',') + '\n' +
        datos.map((f) => cols.map((c) => c.get(f)).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = `fireready_${zonaActiva.id}_${fechaDesde}_a_${fechaHasta}.csv`;
      a.click();
      URL.revokeObjectURL(href);
    } catch (e) {
      setErrorCsv(`No se pudo generar el CSV desde el backend (${(e as Error).message}). Verifica que el servidor esté activo.`);
    } finally {
      setDescargando(false);
    }
  };

  const forma = (n: Intensidad, size = 16) => (
    <span
      className="inline-flex shrink-0"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: intensitySvg(n, pal.fill[n], size) }}
    />
  );

  return (
    <div className="space-y-6">
      {/* 1. CONSTRUCTOR LIMPIO DE DESCARGA CSV CUSTOMIZADA */}
      <section
        aria-labelledby="csv-builder-title"
        className="rounded-xl border-2 border-cyan-400/50 bg-[#1F2833] p-5 space-y-4 shadow-xl"
      >
        <div className="flex flex-wrap items-start justify-between gap-4 pb-3 border-b border-[#323E4C]">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950 border border-cyan-400/40 text-cyan-300">
              <Download className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="csv-builder-title" className="text-base font-bold text-white">
                  {t.csvTitulo}
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#0B0C10] text-cyan-300 border border-[#323E4C]">
                  Lugar + Fechas + Columnas
                </span>
              </div>
              <p className="text-xs text-[#8C9BAA] mt-0.5">
                {t.csvSub}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-cyan-300 font-mono mt-1">
                <Compass className="w-3.5 h-3.5" />
                <span>{lugarActivoTexto}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDescargarCustomCsv}
            disabled={descargando}
            className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 disabled:pointer-events-none text-white shadow-lg shadow-cyan-950/60 transition ${FOCUS}`}
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span>{descargando ? t.csvGenerando : t.csvBtnDescargar}</span>
          </button>
          {errorCsv && (<p role="alert" className="text-xs text-white mt-2">{errorCsv}</p>)}
        </div>

        {/* Parámetros del constructor en 3 columnas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Columna 1: Lugar y Bounding Box */}
          <div className="rounded-lg bg-[#0B0C10]/60 p-3.5 border border-[#323E4C] space-y-2">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-cyan-300" />
              <span>1. Lugar y Bounding Box:</span>
            </span>
            <div className="text-[#8C9BAA]">
              Coordenadas: <strong className="text-white">{zonaActiva.center[0].toFixed(2)}°, {zonaActiva.center[1].toFixed(2)}°</strong>
            </div>
            <div>
              <label htmlFor="csv-bbox" className="block text-[#8C9BAA] mb-1">
                Bounding Box [O, S, E, N]:
              </label>
              <input
                id="csv-bbox"
                value={bboxCustom}
                onChange={(e) => setBboxCustom(e.target.value)}
                className={`w-full rounded bg-[#1F2833] border border-[#323E4C] px-2.5 py-1 text-white font-mono text-xs ${FOCUS}`}
              />
            </div>
          </div>

          {/* Columna 2: Rango Temporal */}
          <div className="rounded-lg bg-[#0B0C10]/60 p-3.5 border border-[#323E4C] space-y-2">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-300" />
              <span>2. Rango Temporal (2000–2026):</span>
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[#8C9BAA] mb-1">Desde:</label>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className={`w-full rounded bg-[#1F2833] border border-[#323E4C] px-2 py-1 text-white font-mono ${FOCUS}`}
                />
              </div>
              <div>
                <label className="block text-[#8C9BAA] mb-1">Hasta:</label>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className={`w-full rounded bg-[#1F2833] border border-[#323E4C] px-2 py-1 text-white font-mono ${FOCUS}`}
                />
              </div>
            </div>
            <div className="text-[11px] text-[#8C9BAA]">
              Horizonte multianual disponible: Serie completa MODIS 2000+ y VIIRS 2012+.
            </div>
          </div>

          {/* Columna 3: Filtros de Sensor e Intensidad */}
          <div className="rounded-lg bg-[#0B0C10]/60 p-3.5 border border-[#323E4C] space-y-2">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-cyan-300" />
              <span>3. Filtros de Atributo:</span>
            </span>
            <div className="flex items-center justify-between">
              <span className="text-[#8C9BAA]">Sensores:</span>
              <select
                value={csvSensor}
                onChange={(e) => setCsvSensor(e.target.value as 'TODOS' | Sensor)}
                className={`rounded bg-[#1F2833] border border-[#323E4C] px-2 py-1 text-white font-mono ${FOCUS}`}
              >
                <option value="TODOS">Todos (MODIS + VIIRS)</option>
                <option value="MODIS">Solo MODIS (1 km)</option>
                <option value="VIIRS">Solo VIIRS (375 m)</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#8C9BAA]">Intensidad:</span>
              <select
                value={csvIntensidad}
                onChange={(e) => setCsvIntensidad(e.target.value as 'TODAS' | Intensidad)}
                className={`rounded bg-[#1F2833] border border-[#323E4C] px-2 py-1 text-white font-mono ${FOCUS}`}
              >
                <option value="TODAS">Todas las intensidades</option>
                <option value="EXTREMO">Solo EXTREMO</option>
                <option value="ALTO">Solo ALTO</option>
                <option value="MODERADO">Solo MODERADO</option>
              </select>
            </div>
          </div>
        </div>

        {/* Checkboxes de Selección de Columnas */}
        <div className="pt-2 border-t border-[#323E4C]">
          <span className="block text-xs font-semibold text-white mb-2">
            Selecciona las columnas y métricas a incluir en el archivo CSV:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={colCoords}
                onChange={(e) => setColCoords(e.target.checked)}
                className="accent-cyan-400 rounded"
              />
              <span>Coordenadas grilla 1 km</span>
            </label>
            <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={colFecha}
                onChange={(e) => setColFecha(e.target.checked)}
                className="accent-cyan-400 rounded"
              />
              <span>Fecha de detección</span>
            </label>
            <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={colFrp}
                onChange={(e) => setColFrp(e.target.checked)}
                className="accent-cyan-400 rounded"
              />
              <span>FRP máximo (MW)</span>
            </label>
            <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={colDetecciones}
                onChange={(e) => setColDetecciones(e.target.checked)}
                className="accent-cyan-400 rounded"
              />
              <span>Focos agrupados</span>
            </label>
            <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={colSensores}
                onChange={(e) => setColSensores(e.target.checked)}
                className="accent-cyan-400 rounded"
              />
              <span>Sensores coincidentes</span>
            </label>
            <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={colIntensidad}
                onChange={(e) => setColIntensidad(e.target.checked)}
                className="accent-cyan-400 rounded"
              />
              <span>Nivel de intensidad</span>
            </label>

          </div>
        </div>
      </section>

      {/* 2. TABLA COMPLETA DE CELDAS CONSOLIDADAS */}
      <section
        aria-labelledby="table-view-title"
        className="rounded-xl border border-[#323E4C] bg-[#1F2833] p-4 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#323E4C]">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h3 id="table-view-title" className="font-bold text-white text-base">
                {t.tablaTitulo}
              </h3>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/50">
                Paginada ({filasPorPagina} por pág.)
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#8C9BAA]">
              <Compass className="w-3 h-3 text-cyan-300" />
              <span>{lugarActivoTexto} · {t.tablaSub}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTablaVisible(!tablaVisible)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#323E4C] bg-[#0B0C10] text-[#8C9BAA] hover:text-white hover:border-cyan-400 transition ${FOCUS}`}
              title={tablaVisible ? "Colapsar tabla para ahorrar espacio vertical" : "Expandir tabla"}
            >
              {tablaVisible ? (
                <>
                  <ChevronUp className="w-4 h-4 text-cyan-400" />
                  <span>{t.tablaColapsar}</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 text-cyan-400" />
                  <span>{t.tablaExpandir(puntosFiltrados.length)}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {tablaVisible && (
          <>
            {/* Barra de Filtros rápidos y Paginación superior */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#8C9BAA]">Sensor:</span>
                  <div role="group" className="flex rounded bg-[#0B0C10] border border-[#323E4C]">
                    {(['TODOS', 'MODIS', 'VIIRS'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSensorFiltro(s)}
                        className={`px-2.5 py-1 font-medium transition ${
                          sensorFiltro === s
                            ? 'bg-cyan-800 text-white font-semibold'
                            : 'text-[#8C9BAA] hover:text-white hover:bg-[#323E4C]'
                        } ${FOCUS}`}
                      >
                        {s === 'TODOS' ? 'Todos' : s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[#8C9BAA]">Intensidad:</span>
                  <div role="group" className="flex rounded bg-[#0B0C10] border border-[#323E4C]">
                    {(['TODAS', 'EXTREMO', 'ALTO', 'MODERADO'] as const).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setIntensidadFiltro(lvl)}
                        className={`px-2.5 py-1 font-medium transition ${
                          intensidadFiltro === lvl
                            ? 'bg-cyan-800 text-white font-semibold'
                            : 'text-[#8C9BAA] hover:text-white hover:bg-[#323E4C]'
                        } ${FOCUS}`}
                      >
                        {lvl === 'TODAS' ? 'Todas' : lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[#8C9BAA]">Por página:</span>
                  <select
                    value={filasPorPagina}
                    onChange={(e) => {
                      setFilasPorPagina(Number(e.target.value));
                      setPagina(1);
                    }}
                    className={`rounded bg-[#0B0C10] border border-[#323E4C] px-2 py-1 text-white font-mono text-xs ${FOCUS}`}
                  >
                    <option value={10}>10 filas</option>
                    <option value={15}>15 filas</option>
                    <option value={25}>25 filas</option>
                    <option value={50}>50 filas</option>
                  </select>
                </div>
              </div>

              <div className="text-xs text-[#8C9BAA]">
                Mostrando{' '}
                <strong className="text-white">
                  {puntosFiltrados.length === 0 ? 0 : (pagina - 1) * filasPorPagina + 1}–
                  {Math.min(pagina * filasPorPagina, puntosFiltrados.length)}
                </strong>{' '}
                de <strong className="text-white">{puntosFiltrados.length}</strong> celdas (Página {pagina} de {totalPaginas})
              </div>
            </div>

            {/* Tabla responsive con doble codificación */}
            <div className="overflow-x-auto rounded-lg border border-[#323E4C]">
              <table className="w-full text-sm">
                <caption className="sr-only">Celdas satelitales armonizadas en {lugarActivoTexto}</caption>
                <thead className="text-xs uppercase text-[#8C9BAA] bg-[#0B0C10]/80">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left font-medium">{t.colId}</th>
                    <th scope="col" className="px-4 py-3 text-left font-medium">{t.colCoords}</th>
                    <th scope="col" className="px-4 py-3 text-left font-medium">{t.colFecha}</th>
                    <th scope="col" className="px-4 py-3 text-left font-medium">{t.colFrp}</th>
                    <th scope="col" className="px-4 py-3 text-left font-medium">{t.colDetecciones}</th>
                    <th scope="col" className="px-4 py-3 text-left font-medium">{t.colSensores}</th>
                    <th scope="col" className="px-4 py-3 text-left font-medium">{t.colIntensidad}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#323E4C] bg-[#1F2833]">
                  {puntosPaginados.map((p) => (
                    <tr key={p.id_celda} className="hover:bg-[#323E4C]/40 transition-colors">
                      <th scope="row" className="px-4 py-2.5 font-mono text-xs text-left font-semibold text-white">
                        {p.id_celda}
                      </th>
                      <td className="px-4 py-2.5 whitespace-nowrap text-[#8C9BAA] font-mono text-xs">
                        {p.lat.toFixed(3)}°, {p.lng.toFixed(3)}°
                      </td>
                      <td className="px-4 py-2.5 text-white font-mono text-xs">{p.fecha}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-white font-bold font-mono">
                        {frpTexto(p.frp_max, claro)}
                      </td>
                      <td className="px-4 py-2.5 text-[#8C9BAA]">
                        <span className="px-2 py-0.5 rounded bg-[#0B0C10] border border-[#323E4C] font-mono text-xs text-white">
                          {p.detecciones_agrupadas}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-300 font-mono text-xs">
                        {p.sensores.join(' + ')}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${
                            pal.badge[p.nivel_intensidad]
                          }`}
                        >
                          {forma(p.nivel_intensidad, 14)} {nivelLabel(p.nivel_intensidad, claro)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {puntosFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-[#8C9BAA]">
                        No se encontraron celdas en el horizonte y filtros seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginador Inferior */}
            {totalPaginas > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
                <div className="text-[#8C9BAA]">
                  Página <strong className="text-white">{pagina}</strong> de{' '}
                  <strong className="text-white">{totalPaginas}</strong>
                  <span className="ml-2 text-[11px] text-[#8C9BAA] hidden sm:inline">
                    · Para procesar todas las celdas sin límite de vista, usa el botón superior{' '}
                    <span className="text-cyan-300 font-medium">Descargar CSV Customizado</span>
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPagina((p) => Math.max(1, p - 1))}
                    disabled={pagina <= 1}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded bg-[#0B0C10] border border-[#323E4C] text-slate-200 hover:text-white hover:border-cyan-400 disabled:opacity-30 disabled:pointer-events-none transition ${FOCUS}`}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Anterior</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                      let num = i + 1;
                      if (totalPaginas > 5 && pagina > 3) {
                        num = Math.min(pagina - 2 + i, totalPaginas - 4 + i);
                      }
                      return (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setPagina(num)}
                          className={`w-7 h-7 rounded text-xs font-mono font-medium transition ${
                            pagina === num
                              ? 'bg-cyan-700 text-white font-bold border border-cyan-400/50'
                              : 'bg-[#0B0C10] text-[#8C9BAA] border border-[#323E4C] hover:text-white hover:border-[#8C9BAA]'
                          }`}
                        >
                          {num}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                    disabled={pagina >= totalPaginas}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded bg-[#0B0C10] border border-[#323E4C] text-slate-200 hover:text-white hover:border-cyan-400 disabled:opacity-30 disabled:pointer-events-none transition ${FOCUS}`}
                  >
                    <span>Siguiente</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
