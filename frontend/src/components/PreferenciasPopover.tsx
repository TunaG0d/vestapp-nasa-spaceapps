import { useState } from 'react';
import { Settings, Eye, MessageSquare, MapPin, Type, SunMedium, ZapOff, X } from 'lucide-react';

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  paletaAccesible: boolean;
  setPaletaAccesible: (v: boolean) => void;
  lenguajeTecnico: boolean;
  setLenguajeTecnico: (v: boolean) => void;
  activarUbicacion: boolean;
  onToggleUbicacion: () => void;
  tamanioTexto: number;
  setTamanioTexto: (n: number) => void;
  altoContraste?: boolean;
  setAltoContraste?: (v: boolean) => void;
  reducirMovimiento?: boolean;
  setReducirMovimiento?: (v: boolean) => void;
}

export default function PreferenciasPopover({
  abierto,
  onCerrar,
  paletaAccesible,
  setPaletaAccesible,
  lenguajeTecnico,
  setLenguajeTecnico,
  activarUbicacion,
  onToggleUbicacion,
  tamanioTexto,
  setTamanioTexto,
  altoContraste = false,
  setAltoContraste,
  reducirMovimiento = false,
  setReducirMovimiento,
}: Props) {
  if (!abierto) return null;

  return (
    <div
      role="dialog"
      aria-label="Panel de Preferencias y Accesibilidad"
      className="absolute top-16 right-4 z-50 w-80 rounded-2xl border border-[#2D3B48] bg-[#141B22]/98 backdrop-blur-md p-4 shadow-2xl text-white animate-in fade-in duration-150 text-xs"
    >
      <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#2D3B48]">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-rose-500" />
          <h3 className="font-extrabold text-sm text-slate-100 tracking-wide uppercase">PREFERENCIAS & ACCESIBILIDAD</h3>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          className="p-1 text-[#8C9BAA] hover:text-white rounded-lg"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Switches de preferencias (Imagen 6) */}
      <div className="space-y-3">
        {/* Paleta Accesible */}
        <label className="flex items-center justify-between cursor-pointer select-none">
          <span className="flex items-center gap-2 text-slate-200">
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span>Paleta Accesible (Okabe-Ito)</span>
          </span>
          <div className="relative inline-flex items-center">
            <input
              type="checkbox"
              checked={paletaAccesible}
              onChange={(e) => setPaletaAccesible(e.target.checked)}
              className="sr-only"
            />
            <div
              className={`w-8 h-4 rounded-full transition-colors ${
                paletaAccesible ? 'bg-cyan-500' : 'bg-[#3A4B5C]'
              }`}
            />
            <div
              className={`absolute left-0.5 top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                paletaAccesible ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </div>
        </label>

        {/* Lenguaje Técnico */}
        <label className="flex items-center justify-between cursor-pointer select-none">
          <span className="flex items-center gap-2 text-slate-200">
            <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
            <span>Lenguaje técnico científico</span>
          </span>
          <div className="relative inline-flex items-center">
            <input
              type="checkbox"
              checked={lenguajeTecnico}
              onChange={(e) => setLenguajeTecnico(e.target.checked)}
              className="sr-only"
            />
            <div
              className={`w-8 h-4 rounded-full transition-colors ${
                lenguajeTecnico ? 'bg-cyan-500' : 'bg-[#3A4B5C]'
              }`}
            />
            <div
              className={`absolute left-0.5 top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                lenguajeTecnico ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </div>
        </label>

        {/* Alto Contraste */}
        {setAltoContraste && (
          <label className="flex items-center justify-between cursor-pointer select-none">
            <span className="flex items-center gap-2 text-slate-200">
              <SunMedium className="w-3.5 h-3.5 text-yellow-400" />
              <span>Alto Contraste (WCAG AAA)</span>
            </span>
            <div className="relative inline-flex items-center">
              <input
                type="checkbox"
                checked={altoContraste}
                onChange={(e) => setAltoContraste(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`w-8 h-4 rounded-full transition-colors ${
                  altoContraste ? 'bg-cyan-500' : 'bg-[#3A4B5C]'
                }`}
              />
              <div
                className={`absolute left-0.5 top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                  altoContraste ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </div>
          </label>
        )}

        {/* Reducir Animaciones */}
        {setReducirMovimiento && (
          <label className="flex items-center justify-between cursor-pointer select-none">
            <span className="flex items-center gap-2 text-slate-200">
              <ZapOff className="w-3.5 h-3.5 text-indigo-400" />
              <span>Reducir Animaciones</span>
            </span>
            <div className="relative inline-flex items-center">
              <input
                type="checkbox"
                checked={reducirMovimiento}
                onChange={(e) => setReducirMovimiento(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`w-8 h-4 rounded-full transition-colors ${
                  reducirMovimiento ? 'bg-cyan-500' : 'bg-[#3A4B5C]'
                }`}
              />
              <div
                className={`absolute left-0.5 top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                  reducirMovimiento ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </div>
          </label>
        )}

        {/* Activar Ubicación */}
        <label className="flex items-center justify-between cursor-pointer select-none">
          <span className="flex items-center gap-2 text-slate-200">
            <MapPin className="w-3.5 h-3.5 text-teal-400" />
            <span>Activar geolocalización</span>
          </span>
          <div className="relative inline-flex items-center">
            <input
              type="checkbox"
              checked={activarUbicacion}
              onChange={onToggleUbicacion}
              className="sr-only"
            />
            <div
              className={`w-8 h-4 rounded-full transition-colors ${
                activarUbicacion ? 'bg-cyan-500' : 'bg-[#3A4B5C]'
              }`}
            />
            <div
              className={`absolute left-0.5 top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                activarUbicacion ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </div>
        </label>
      </div>

      {/* Slider: Tamaño del texto Tt (Imagen 6) */}
      <div className="mt-4 pt-3 border-t border-[#2D3B48]">
        <div className="flex items-center justify-between text-[11px] mb-1.5 font-bold text-[#8C9BAA]">
          <span className="flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5 text-white" />
            <span>TAMAÑO DEL TEXTO Tt</span>
          </span>
          <span className="text-cyan-400 font-mono text-xs">{tamanioTexto} pt</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#8C9BAA]">1</span>
          <input
            type="range"
            min={1}
            max={20}
            value={tamanioTexto}
            onChange={(e) => setTamanioTexto(Number(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#0B0F14] rounded-lg"
          />
          <span className="text-[10px] text-[#8C9BAA]">20</span>
        </div>
      </div>
    </div>
  );
}
