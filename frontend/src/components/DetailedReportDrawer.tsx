import { useState } from 'react';
import { ChevronRight, X, Calendar, Download } from 'lucide-react';
import type { PuntoArmonizado } from '../mocks/fireData';

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  puntos: PuntoArmonizado[];
  anio: number;
  onAbrirExportador: () => void;
}

export default function DetailedReportDrawer({
  abierto,
  onCerrar,
  puntos,
  anio,
  onAbrirExportador,
}: Props) {
  const [mesSeleccionado, setMesSeleccionado] = useState<string>('Todos los meses');

  if (!abierto) return null;

  const meses = [
    'Todos los meses',
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

  return (
    <aside
      aria-label="Panel de Información de Reportes en Detalle"
      className="absolute bottom-4 right-4 z-30 w-[720px] max-w-[calc(100vw-32px)] rounded-2xl border border-[#2D3B48] bg-[#141B22]/95 backdrop-blur-md p-4 shadow-2xl text-white animate-in slide-in-from-bottom-4 duration-200"
    >
      {/* Cabecera del drawer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#2D3B48]">
        <div className="flex items-center gap-2">
          <ChevronRight className="w-5 h-5 text-rose-500 font-bold" />
          <h3 className="font-extrabold text-sm tracking-wide text-white">
            INFORMACIÓN DE REPORTES EN DETALLE
          </h3>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {/* Selector de Mes Pill */}
          <div className="flex items-center gap-1.5 bg-[#0B0F14] border border-[#3A4B5C] rounded-xl px-2.5 py-1 text-slate-200 font-mono">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <select
              value={mesSeleccionado}
              onChange={(e) => setMesSeleccionado(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
            >
              {meses.map((m) => (
                <option key={m} value={m} className="bg-[#141B22] text-white">
                  {m} {anio}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={onAbrirExportador}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-700 hover:bg-cyan-600 text-white font-semibold transition"
            title="Abrir constructor de CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={onCerrar}
            className="p-1 rounded-lg text-[#8C9BAA] hover:text-white hover:bg-[#2D3B48] transition"
            aria-label="Cerrar tabla de detalle"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabla detallada de celdas */}
      <div className="mt-3 overflow-x-auto max-h-56 overflow-y-auto rounded-xl border border-[#232F3B]">
        <table className="w-full text-left text-xs border-collapse font-mono">
          <thead className="bg-[#0B0F14] text-[#8C9BAA] uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-[#232F3B]">
            <tr>
              <th className="py-2.5 px-3">CELDA</th>
              <th className="py-2.5 px-3">LAT/LNG</th>
              <th className="py-2.5 px-3">FECHA</th>
              <th className="py-2.5 px-3">FRP MÁX</th>
              <th className="py-2.5 px-3">DETICS</th>
              <th className="py-2.5 px-3">SENSORES</th>
              <th className="py-2.5 px-3">INTENSIDAD</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#232F3B] bg-[#141B22]/70">
            {puntos.slice(0, 8).map((p, i) => (
              <tr key={p.id_celda + i} className="hover:bg-[#1E2833] transition-colors">
                <td className="py-2 px-3 text-white font-bold">{p.id_celda}</td>
                <td className="py-2 px-3 text-slate-300">
                  {p.lat.toFixed(3)}, {p.lng.toFixed(3)}
                </td>
                <td className="py-2 px-3 text-slate-400">{p.fecha}</td>
                <td className="py-2 px-3 text-rose-400 font-bold">{p.frp_max} MW</td>
                <td className="py-2 px-3 text-cyan-300">{p.detecciones_agrupadas}</td>
                <td className="py-2 px-3 text-slate-300">{p.sensores.join(' + ')}</td>
                <td className="py-2 px-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      p.nivel_intensidad === 'EXTREMO'
                        ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                        : p.nivel_intensidad === 'ALTO'
                        ? 'bg-orange-950 text-orange-300 border border-orange-500/40'
                        : 'bg-yellow-950 text-yellow-300 border border-yellow-500/40'
                    }`}
                  >
                    {p.nivel_intensidad}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#8C9BAA]">
        <span>Mostrando 8 de {puntos.length} registros armonizados</span>
        <button
          type="button"
          onClick={onAbrirExportador}
          className="text-cyan-400 hover:text-cyan-300 underline font-sans"
        >
          Ver y exportar todos los registros en el Constructor CSV →
        </button>
      </div>
    </aside>
  );
}
