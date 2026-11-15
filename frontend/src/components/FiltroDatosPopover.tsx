import { useState } from 'react';
import { Layers, Calendar, Table, Sparkles, X } from 'lucide-react';

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  modisActivo: boolean;
  setModisActivo: (v: boolean) => void;
  viirsActivo: boolean;
  setViirsActivo: (v: boolean) => void;
  vientoActivo: boolean;
  setVientoActivo: (v: boolean) => void;
  prediccionActiva: boolean;
  setPrediccionActiva: (v: boolean) => void;
  rangoAnios: number;
  setRangoAnios: (n: number) => void;
}

export default function FiltroDatosPopover({
  abierto,
  onCerrar,
  modisActivo,
  setModisActivo,
  viirsActivo,
  setViirsActivo,
  vientoActivo,
  setVientoActivo,
  prediccionActiva,
  setPrediccionActiva,
  rangoAnios,
  setRangoAnios,
}: Props) {
  if (!abierto) return null;

  return (
    <div
      role="dialog"
      aria-label="Filtro de capas y datos satelitales"
      className="absolute top-16 right-36 z-50 w-72 rounded-2xl border border-[#2D3B48] bg-[#141B22]/95 backdrop-blur-md p-4 shadow-2xl text-white animate-in fade-in duration-150 text-xs"
    >
      <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#2D3B48]">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h3 className="font-extrabold text-sm text-slate-100 tracking-wide">FILTRO DE DATOS</h3>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          className="p-1 text-[#8C9BAA] hover:text-white rounded-lg"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Checkboxes de fuentes y capas (Imagen 5) */}
      <div className="space-y-2.5">
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={modisActivo}
            onChange={(e) => setModisActivo(e.target.checked)}
            className="w-4 h-4 accent-cyan-500 rounded"
          />
          <span className="font-medium text-slate-200">MODIS (Satélite NASA)</span>
        </label>

        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={viirsActivo}
            onChange={(e) => setViirsActivo(e.target.checked)}
            className="w-4 h-4 accent-cyan-500 rounded"
          />
          <span className="font-medium text-slate-200">VIIRS (Satélite NASA)</span>
        </label>

        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={vientoActivo}
            onChange={(e) => setVientoActivo(e.target.checked)}
            className="w-4 h-4 accent-cyan-500 rounded"
          />
          <span className="font-medium text-slate-200">Viento (Meteomatics)</span>
        </label>

        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={prediccionActiva}
            onChange={(e) => setPrediccionActiva(e.target.checked)}
            className="w-4 h-4 accent-cyan-500 rounded"
          />
          <span className="font-medium text-slate-200">Predicción de riesgo (IA)</span>
        </label>
      </div>

      {/* Slider: Rango de Tiempo (Años) (Imagen 5) */}
      <div className="mt-4 pt-3 border-t border-[#2D3B48]">
        <div className="flex items-center justify-between text-[11px] mb-1.5 font-bold text-[#8C9BAA]">
          <span>RANGO DE TIEMPO (AÑOS)</span>
          <span className="text-cyan-400 font-mono text-xs">{rangoAnios} años</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#8C9BAA]">1</span>
          <input
            type="range"
            min={1}
            max={26}
            value={rangoAnios}
            onChange={(e) => setRangoAnios(Number(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#0B0F14] rounded-lg"
          />
          <span className="text-[10px] text-[#8C9BAA]">26</span>
        </div>
      </div>
    </div>
  );
}
