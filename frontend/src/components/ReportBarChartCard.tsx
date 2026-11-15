import { useMemo } from 'react';
import { ChevronRight, FileSpreadsheet } from 'lucide-react';
import type { CalendarMes } from '../mocks/fireData';

interface Props {
  calendar: CalendarMes[];
  anio: number;
  onGenerarReporte: () => void;
  onToggleDetalle: () => void;
  detalleAbierto: boolean;
}

export default function ReportBarChartCard({
  calendar,
  anio,
  onGenerarReporte,
  onToggleDetalle,
  detalleAbierto,
}: Props) {
  // Datos normalizados para los 12 meses (con pico histórico en febrero si es 2023)
  const mesesData = useMemo(() => {
    const nombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return nombres.map((nom, i) => {
      const match = calendar.find((c) => c.mes.toLowerCase().startsWith(nom.toLowerCase().slice(0, 3)));
      let val = match ? match.actual : 100;
      if (anio === 2023 && i === 1) val = 3500; // Febrero 2023 histórico
      else if (anio === 2023 && i === 0) val = 850;
      else if (anio === 2023 && i === 2) val = 750;
      else if (anio === 2023 && i === 3) val = 250;
      else if (anio === 2023 && i === 4) val = 120;
      else if (anio === 2023 && i === 5) val = 50;
      else if (anio === 2023 && i === 6) val = 40;
      else if (anio === 2023 && i === 7) val = 60;
      else if (anio === 2023 && i === 8) val = 110;
      else if (anio === 2023 && i === 9) val = 180;
      else if (anio === 2023 && i === 10) val = 380;
      else if (anio === 2023 && i === 11) val = 520;

      return {
        mes: nom,
        abrev: nom.slice(0, 3),
        valor: val,
        esPico: val >= 2000,
      };
    });
  }, [calendar, anio]);

  const maxVal = 3500;

  return (
    <div className="relative rounded-2xl border border-[#2D3B48] bg-[#141B22]/90 backdrop-blur-md p-4 shadow-2xl text-white transition-all duration-200">
      {/* Contenedor del gráfico de barras */}
      <div className="relative flex items-center justify-between">
        {/* Gráfico con eje Y a la izquierda */}
        <div className="flex-1 flex gap-2">
          {/* Ticks numéricos del eje Y */}
          <div className="flex flex-col justify-between text-[9px] text-[#6E8092] font-mono text-right select-none py-1 h-36">
            <span>3.500</span>
            <span>3.000</span>
            <span>2.500</span>
            <span>2.000</span>
            <span>1.500</span>
            <span>1.000</span>
            <span>500</span>
            <span>0</span>
          </div>

          {/* Área de barras */}
          <div className="flex-1 flex flex-col justify-end h-36 border-b border-l border-[#2D3B48]/80 pl-1 pb-1">
            <div className="flex items-end justify-between gap-1 h-full pt-1">
              {mesesData.map((m, idx) => {
                const alturaPct = Math.min(100, Math.max(4, (m.valor / maxVal) * 100));
                return (
                  <div
                    key={m.mes}
                    className="flex-1 flex flex-col items-center justify-end h-full group relative"
                  >
                    {/* Tooltip al pasar el cursor */}
                    <div className="absolute -top-7 hidden group-hover:flex z-30 bg-[#0E141B] border border-[#3A4B5C] px-1.5 py-0.5 rounded text-[10px] font-mono text-white whitespace-nowrap shadow-lg">
                      {m.mes}: {m.valor.toLocaleString('es-CL')}
                    </div>

                    {/* Barra */}
                    <div
                      className={`w-full rounded-t-sm transition-all duration-300 ${
                        m.esPico
                          ? 'bg-gradient-to-t from-rose-600 to-rose-400 shadow-md shadow-rose-900/40'
                          : m.valor > 600
                          ? 'bg-gradient-to-t from-orange-600 to-orange-400'
                          : m.valor > 200
                          ? 'bg-gradient-to-t from-amber-600 to-amber-400'
                          : 'bg-gradient-to-t from-amber-500/70 to-yellow-400/80'
                      }`}
                      style={{ height: `${alturaPct}%` }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Etiquetas de meses en el eje X */}
            <div className="flex items-center justify-between text-[8px] text-[#8C9BAA] font-mono pt-1 select-none">
              {mesesData.map((m) => (
                <span key={m.mes} className="truncate text-center" style={{ width: '8.33%' }}>
                  {m.abrev[0]}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Flecha lateral para desplegar u ocultar el detalle de reportes (Imagen 2) */}
        <button
          type="button"
          onClick={onToggleDetalle}
          aria-label={detalleAbierto ? 'Ocultar reporte en detalle' : 'Mostrar reporte en detalle'}
          className={`ml-2 p-1.5 rounded-lg border border-[#3A4B5C] bg-[#1A232E] hover:bg-[#283646] text-[#8C9BAA] hover:text-white transition shadow ${
            detalleAbierto ? 'bg-cyan-900/60 border-cyan-400 text-cyan-300 rotate-180' : ''
          }`}
          title="Ver tabla de reportes en detalle"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Botón GENERAR REPORTE (Pill button con borde como en la Imagen 1 y 7) */}
      <div className="mt-3 pt-3 border-t border-[#2D3B48]/80">
        <button
          type="button"
          onClick={onGenerarReporte}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#455A64] bg-gradient-to-r from-[#1A232E] to-[#141B22] hover:from-[#222E3C] hover:to-[#1A232E] hover:border-cyan-400 py-2.5 px-4 text-xs font-extrabold tracking-wider text-slate-100 uppercase transition shadow-lg shadow-black/40"
        >
          <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
          <span>GENERAR REPORTE</span>
        </button>
      </div>
    </div>
  );
}
