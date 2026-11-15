import { useEffect, useRef, useState } from 'react';
import {
  Check,
  Eye,
  Keyboard,
  Languages,
  MinusCircle,
  Sliders,
  Sparkles,
  SunMedium,
  Type,
  X,
  ZapOff,
} from 'lucide-react';
import { FOCUS } from '../lib/theme';

interface Props {
  daltonico: boolean;
  setDaltonico: React.Dispatch<React.SetStateAction<boolean>>;
  textoGrande: boolean;
  setTextoGrande: React.Dispatch<React.SetStateAction<boolean>>;
  claro: boolean;
  setClaro: React.Dispatch<React.SetStateAction<boolean>>;
  altoContraste?: boolean;
  setAltoContraste?: React.Dispatch<React.SetStateAction<boolean>>;
  reducirMovimiento?: boolean;
  setReducirMovimiento?: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function AccessibilityMenu({
  daltonico,
  setDaltonico,
  textoGrande,
  setTextoGrande,
  claro,
  setClaro,
  altoContraste = false,
  setAltoContraste,
  reducirMovimiento = false,
  setReducirMovimiento,
}: Props) {
  const [abierto, setAbierto] = useState<boolean>(false);
  const [verAtajos, setVerAtajos] = useState<boolean>(false);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);

  // Cerrar con Escape o clic afuera; atajos de teclado Alt+A y Alt+C
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Alt+A: abrir/cerrar menú de accesibilidad
      if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        setAbierto((prev) => !prev);
      }
      // Alt+C: alternar modo lenguaje claro directamente
      if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        setClaro((prev) => !prev);
      }
      // Escape: cerrar
      if (e.key === 'Escape' && abierto) {
        setAbierto(false);
        botonRef.current?.focus();
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (abierto && contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [abierto, setClaro]);

  const activosCount = [
    daltonico,
    textoGrande,
    claro,
    altoContraste,
    reducirMovimiento,
  ].filter(Boolean).length;

  return (
    <div className="relative" ref={contenedorRef}>
      <button
        ref={botonRef}
        type="button"
        onClick={() => setAbierto((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-label={`Opciones de accesibilidad y lenguaje. ${activosCount} activadas. Atajo: Alt+A`}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition border ${
          abierto || activosCount > 0
            ? 'bg-[#1F2833] border-cyan-400 text-white ring-1 ring-cyan-400'
            : 'bg-transparent border-transparent text-[#8C9BAA] hover:text-white hover:bg-[#1A232E]'
        }`}
      >
        <div className="w-5 h-5 rounded-full border border-cyan-500/60 bg-cyan-950/40 flex items-center justify-center text-cyan-400">
          <Sliders className="w-3 h-3" />
        </div>
        <span className="tracking-wide text-white">ACCESIBILIDAD</span>
        {activosCount > 0 && (
          <span
            className="w-4 h-4 rounded-full bg-cyan-400 text-[#0B0C10] text-[10px] font-black flex items-center justify-center animate-in zoom-in-75 duration-100"
            aria-label={`${activosCount} ajustes activos`}
          >
            {activosCount}
          </span>
        )}
      </button>

      {/* POPOVER AGRUPADO */}
      {abierto && (
        <div
          role="dialog"
          aria-label="Panel de opciones de accesibilidad universal y lenguaje claro"
          className="absolute right-0 top-full mt-2 w-92 rounded-2xl border border-[#2D3B48] bg-[#141B22]/98 backdrop-blur-md p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 text-white"
        >
          <div className="flex items-center justify-between pb-3 border-b border-[#2D3B48]">
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-white text-sm">Accesibilidad Universal</h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  WCAG 2.1 AAA
                </span>
              </div>
              <p className="text-[11px] text-[#8C9BAA]">Inclusión visual, motora y cognitiva</p>
            </div>
            <button
              onClick={() => setAbierto(false)}
              aria-label="Cerrar panel de accesibilidad (Esc)"
              className={`p-1 rounded-lg text-[#8C9BAA] hover:text-white hover:bg-[#2D3B48] ${FOCUS}`}
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <div className="py-3 space-y-2.5 max-h-[70vh] overflow-y-auto pr-1">
            {/* 1. MODO LENGUAJE CLARO (DESTACADO PRINCIPAL) */}
            <div className={`rounded-lg border p-3 transition ${
              claro ? 'bg-cyan-950/40 border-cyan-400/60' : 'bg-[#0B0C10]/60 border-[#323E4C]'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Languages className="w-4 h-4 text-cyan-300" aria-hidden="true" />
                  <span>Modo Lenguaje Claro</span>
                  <span className="text-[10px] text-cyan-400 font-mono">(Alt+C)</span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={claro}
                  onClick={() => setClaro((v) => !v)}
                  className={`w-10 h-5 rounded-full transition-colors relative p-0.5 ${
                    claro ? 'bg-cyan-600' : 'bg-[#323E4C]'
                  } ${FOCUS}`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      claro ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                  <span className="sr-only">Activar lenguaje claro ciudadano</span>
                </button>
              </div>
              <p className="text-[11px] text-[#8C9BAA] leading-relaxed">
                {claro
                  ? '✓ Activo: Traduce la jerga técnica (FRP en MW, Bounding Box, sigmas) a explicaciones comprensibles para cualquier persona, familia o junta de vecinos.'
                  : 'Desactivado: Presenta la terminología técnica satelital original de MODIS y VIIRS.'}
              </p>
            </div>

            {/* 2. PALETA DALTONISMO OKABE-ITO */}
            <div className={`rounded-lg border p-3 transition ${
              daltonico ? 'bg-cyan-950/30 border-cyan-400/50' : 'bg-[#0B0C10]/60 border-[#323E4C]'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-cyan-300" aria-hidden="true" />
                  <span>Paleta Daltonismo (Okabe-Ito)</span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={daltonico}
                  onClick={() => setDaltonico((v) => !v)}
                  className={`w-10 h-5 rounded-full transition-colors relative p-0.5 ${
                    daltonico ? 'bg-cyan-600' : 'bg-[#323E4C]'
                  } ${FOCUS}`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      daltonico ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                  <span className="sr-only">Activar paleta accesible para daltonismo</span>
                </button>
              </div>
              <p className="text-[11px] text-[#8C9BAA] mb-2">
                Reemplaza la rampa térmica roja por tonos perceptibles universales (celeste #56B4E9, ámbar #E69F00, rosa #CC79A7) con doble codificación de formas.
              </p>
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="text-[#8C9BAA]">Muestra:</span>
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: daltonico ? '#56B4E9' : '#FFD700' }}
                  title="Moderado"
                />
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: daltonico ? '#E69F00' : '#FF6B00' }}
                  title="Alto"
                />
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: daltonico ? '#CC79A7' : '#FF003C' }}
                  title="Extremo"
                />
              </div>
            </div>

            {/* 3. TAMAÑO DE TEXTO A / A+ */}
            <div className={`rounded-lg border p-3 transition ${
              textoGrande ? 'bg-cyan-950/30 border-cyan-400/50' : 'bg-[#0B0C10]/60 border-[#323E4C]'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-cyan-300" aria-hidden="true" />
                  <span>Tamaño de Texto (A / A+)</span>
                </span>
                <div className="flex rounded-md border border-[#323E4C] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setTextoGrande(false)}
                    aria-pressed={!textoGrande}
                    className={`px-2.5 py-0.5 text-xs font-bold transition ${
                      !textoGrande ? 'bg-cyan-800 text-white' : 'bg-[#1F2833] text-[#8C9BAA]'
                    } ${FOCUS}`}
                  >
                    A
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextoGrande(true)}
                    aria-pressed={textoGrande}
                    className={`px-2.5 py-0.5 text-xs font-bold transition ${
                      textoGrande ? 'bg-cyan-800 text-white' : 'bg-[#1F2833] text-[#8C9BAA]'
                    } ${FOCUS}`}
                  >
                    A+
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-[#8C9BAA]">
                Escala la tipografía base al 125% para facilitar la lectura en terreno o para personas con visión reducida.
              </p>
            </div>

            {/* 4. MODO ALTO CONTRASTE (WCAG AAA) */}
            {setAltoContraste && (
              <div className={`rounded-lg border p-3 transition ${
                altoContraste ? 'bg-cyan-950/30 border-cyan-400/50' : 'bg-[#0B0C10]/60 border-[#323E4C]'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <SunMedium className="w-3.5 h-3.5 text-cyan-300" aria-hidden="true" />
                    <span>Alto Contraste (WCAG AAA)</span>
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={altoContraste}
                    onClick={() => setAltoContraste((v) => !v)}
                    className={`w-10 h-5 rounded-full transition-colors relative p-0.5 ${
                      altoContraste ? 'bg-cyan-600' : 'bg-[#323E4C]'
                    } ${FOCUS}`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                        altoContraste ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                    <span className="sr-only">Activar alto contraste</span>
                  </button>
                </div>
                <p className="text-[11px] text-[#8C9BAA]">
                  Aumenta la saturación, refuerza los bordes luminosos y garantiza una relación de contraste mínima de 7:1.
                </p>
              </div>
            )}

            {/* 5. REDUCCIÓN DE MOVIMIENTO */}
            {setReducirMovimiento && (
              <div className={`rounded-lg border p-3 transition ${
                reducirMovimiento ? 'bg-cyan-950/30 border-cyan-400/50' : 'bg-[#0B0C10]/60 border-[#323E4C]'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <ZapOff className="w-3.5 h-3.5 text-cyan-300" aria-hidden="true" />
                    <span>Reducir Animaciones</span>
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={reducirMovimiento}
                    onClick={() => setReducirMovimiento((v) => !v)}
                    className={`w-10 h-5 rounded-full transition-colors relative p-0.5 ${
                      reducirMovimiento ? 'bg-cyan-600' : 'bg-[#323E4C]'
                    } ${FOCUS}`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                        reducirMovimiento ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                    <span className="sr-only">Desactivar pulsaciones y animaciones</span>
                  </button>
                </div>
                <p className="text-[11px] text-[#8C9BAA]">
                  Detiene los pulsos térmicos del mapa y transiciones para evitar mareos o sobreestimulación visual.
                </p>
              </div>
            )}

            {/* 6. GUÍA DE ATAJOS DE TECLADO ACCESIBLES */}
            <div className="rounded-lg bg-[#0B0C10]/60 border border-[#323E4C] p-2.5">
              <button
                type="button"
                onClick={() => setVerAtajos((v) => !v)}
                className="w-full flex items-center justify-between text-xs text-[#8C9BAA] hover:text-white"
              >
                <span className="flex items-center gap-1.5 font-semibold">
                  <Keyboard className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Atajos de Teclado Rápidos</span>
                </span>
                <span className="text-[11px] font-mono text-cyan-400">
                  {verAtajos ? 'Ocultar' : 'Ver lista'}
                </span>
              </button>
              {verAtajos && (
                <div className="mt-2 pt-2 border-t border-[#323E4C] space-y-1.5 text-[11px] font-mono text-slate-300">
                  <div className="flex justify-between">
                    <span>Cambiar a Pestaña 1 / 2 / 3</span>
                    <strong className="text-cyan-300">Teclas 1, 2, 3</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Alternar Lenguaje Claro</span>
                    <strong className="text-cyan-300">Alt + C</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Abrir/Cerrar Accesibilidad</span>
                    <strong className="text-cyan-300">Alt + A</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Cerrar ventanas y menús</span>
                    <strong className="text-cyan-300">Escape</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Navegar controles</span>
                    <strong className="text-cyan-300">Tab / Shift+Tab</strong>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2.5 border-t border-[#323E4C] flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                setDaltonico(false);
                setTextoGrande(false);
                setClaro(false);
                if (setAltoContraste) setAltoContraste(false);
                if (setReducirMovimiento) setReducirMovimiento(false);
              }}
              className="text-[11px] text-[#8C9BAA] hover:text-white underline underline-offset-2"
            >
              Restablecer todo
            </button>
            <span className="text-[10px] text-[#8C9BAA]">Atajo: Alt+A</span>
          </div>
        </div>
      )}
    </div>
  );
}
