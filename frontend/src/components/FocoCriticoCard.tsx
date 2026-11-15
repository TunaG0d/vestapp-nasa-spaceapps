import { useState } from 'react';
import { Flame, Info, Sparkles, Wind, Droplets, Thermometer, Mountain, X } from 'lucide-react';
import type { RiskResponse } from '../mocks/fireData';

interface Props {
  risk: RiskResponse;
  probabilidad: number;
  claro: boolean;
  onVerProyeccion?: () => void;
}

export default function FocoCriticoCard({ risk, probabilidad, claro, onVerProyeccion }: Props) {
  const [mostrarInfo, setMostrarInfo] = useState<boolean>(false);

  const temp = risk.temperatura_c ?? 33.5;
  const hum = risk.humedad_relativa_pct ?? 21;
  const viento = risk.viento_kmh ?? 38.2;
  const pendiente = 5; // Grados de pendiente topográfica (<3° interfaz)

  return (
    <div className="relative rounded-2xl border border-[#2D3B48] bg-[#141B22]/90 backdrop-blur-md p-4 shadow-2xl text-white transition-all duration-200">
      {/* Cabecera del foco crítico */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <span className="absolute w-8 h-8 rounded-full bg-rose-500/30 animate-ping" />
            <div className="w-8 h-8 rounded-xl bg-rose-950/80 border border-rose-500/60 flex items-center justify-center text-rose-500 shadow-lg shadow-rose-950/50">
              <Flame className="w-5 h-5 fill-rose-500" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-extrabold tracking-wide text-rose-500">FOCO CRÍTICO</h2>
              <button
                type="button"
                onClick={() => setMostrarInfo(!mostrarInfo)}
                aria-label="Ver leyenda de severidad térmica"
                className="text-[#8C9BAA] hover:text-white transition p-0.5 rounded-full hover:bg-[#2D3B48]"
                title="Información de niveles y anomalías térmicas"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#8C9BAA] font-medium">
              Probabilidad <span className="font-bold text-white">{probabilidad.toFixed(1)}%</span>
            </p>
          </div>
        </div>

        {onVerProyeccion && (
          <button
            type="button"
            onClick={onVerProyeccion}
            className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2 py-1 rounded-lg transition"
            title="Ver proyección IA a 72 semanas"
          >
            IA 72 sem
          </button>
        )}
      </div>

      {/* Popover Tooltip de Leyenda Térmica (Imagen 4) */}
      {mostrarInfo && (
        <div
          role="dialog"
          aria-label="Leyenda de severidad térmica"
          className="absolute top-12 left-2 z-50 w-72 rounded-xl border border-[#3A4B5C] bg-[#0E141B]/95 p-3.5 shadow-2xl backdrop-blur-md animate-in fade-in duration-150 text-xs"
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#2D3B48]">
            <span className="font-bold text-white text-[11px] tracking-wider uppercase">
              Escala de Severidad Térmica
            </span>
            <button
              type="button"
              onClick={() => setMostrarInfo(false)}
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

      {/* Grid 2x2 de métricas predictivas (Temperatura, Humedad, Viento, Pendiente) */}
      <div className="grid grid-cols-2 gap-2 mt-3.5 pt-3 border-t border-[#2D3B48]/80 text-center">
        {/* Temperatura */}
        <div className="rounded-xl bg-[#0B0F14]/70 border border-[#232F3B] p-2">
          <div className="text-base font-bold text-white">{temp.toFixed(1)}°C</div>
          <div className="text-[11px] text-[#8C9BAA] flex items-center justify-center gap-1 mt-0.5">
            <Thermometer className="w-3 h-3 text-rose-400" />
            <span>Temperatura</span>
          </div>
        </div>

        {/* Humedad Relativa */}
        <div className="rounded-xl bg-[#0B0F14]/70 border border-[#232F3B] p-2">
          <div className="text-base font-bold text-white">{hum.toFixed(0)}%</div>
          <div className="text-[11px] text-[#8C9BAA] flex items-center justify-center gap-1 mt-0.5">
            <Droplets className="w-3 h-3 text-cyan-400" />
            <span>Humedad rel.</span>
          </div>
        </div>

        {/* Viento */}
        <div className="rounded-xl bg-[#0B0F14]/70 border border-[#232F3B] p-2">
          <div className="text-base font-bold text-white">{viento.toFixed(1)}</div>
          <div className="text-[11px] text-[#8C9BAA] flex items-center justify-center gap-1 mt-0.5">
            <Wind className="w-3 h-3 text-teal-400" />
            <span>Viento (Km/Hr)</span>
          </div>
        </div>

        {/* Pendiente topográfica */}
        <div className="rounded-xl bg-[#0B0F14]/70 border border-[#232F3B] p-2">
          <div className="text-base font-bold text-white">{pendiente}° (&lt;3°)</div>
          <div className="text-[11px] text-[#8C9BAA] flex items-center justify-center gap-1 mt-0.5">
            <Mountain className="w-3 h-3 text-amber-400" />
            <span>Pendiente</span>
          </div>
        </div>
      </div>
    </div>
  );
}
