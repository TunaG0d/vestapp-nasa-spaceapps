import { useEffect, useRef, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Database,
  Flame,
  Layers,
  Mail,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Wind,
  X,
  Zap,
} from 'lucide-react';
import { FOCUS } from '../lib/theme';

export interface EscenaShowcase {
  id: number;
  nombreCorto: string;
  titulo: string;
  subtitulo: string;
  badge: string;
  requisitoNASA: string;
  duracionSegundos: number;
}

export const ESCENAS_PITCH: EscenaShowcase[] = [
  {
    id: 1,
    nombreCorto: '1. Armonización',
    titulo: 'Armonización MODIS + VIIRS (Desafío Central NASA)',
    subtitulo:
      'La página alterna automáticamente entre focos crudos dispersos y celdas consolidadas de 1 km², eliminando el sesgo de doble conteo.',
    badge: '67.01% Duplicados Eliminados',
    requisitoNASA: 'Requisito NASA: Grilla fija de 1 km que fusiona VIIRS (375m) + MODIS (1km) sin duplicar incendios.',
    duracionSegundos: 8,
  },
  {
    id: 2,
    nombreCorto: '2. Alerta 30-30-30',
    titulo: 'Alerta Temprana en Vivo & Cono Táctico de Propagación',
    subtitulo:
      'Vuelo suave al foco crítico. Dibuja el frente de fuego inmediato (2.5 km) y el cono extendido a 3 horas con vector de viento a 38 km/h.',
    badge: 'FRP 420.5 MW · Azimut 135° SE',
    requisitoNASA: 'Requisito Táctico: Detección temprana en Near Real-Time (NRT) con cálculo físico de avance.',
    duracionSegundos: 9,
  },
  {
    id: 3,
    nombreCorto: '3. Diagnóstico IA',
    titulo: 'Diagnóstico Preventivo de Riesgo con Regla 30-30-30',
    subtitulo:
      'Evaluación simultánea de Temperatura 33.5°C, Humedad 21% y Viento 38 km/h, disparando probabilidad estimada del 78.4% (Riesgo Alto).',
    badge: 'Probabilidad Estimada 78.4%',
    requisitoNASA: 'Requisito Predictivo: Fusión de telemetría de satélites con condiciones meteorológicas de superficie.',
    duracionSegundos: 9,
  },
  {
    id: 4,
    nombreCorto: '4. Calendario 26 Años',
    titulo: 'Matriz Diaria Histórica de 26 Años (2000–2026)',
    subtitulo:
      'Navega a la Pestaña 2: Inspección día a día de incendios durante 26 años completos frente a la mediana histórica multianual.',
    badge: '2000–2026 Completos',
    requisitoNASA: 'Requisito Histórico: Series multianuales continuas de 26 años para análisis estacional.',
    duracionSegundos: 8,
  },
  {
    id: 5,
    nombreCorto: '5. Exportación CSV',
    titulo: 'Descarga de Datos Consolidados y CSV Customizado',
    subtitulo:
      'Navega a la Pestaña 3: Tabla paginada con filtros por sensor (MODIS / VIIRS), intensidad térmica y descarga directa en Excel/CSV.',
    badge: 'Filtros Dinámicos + CSV',
    requisitoNASA: 'Requisito de Datos Abiertos: Exportación transparente con atributos satelitales y coordenadas.',
    duracionSegundos: 8,
  },
  {
    id: 6,
    nombreCorto: '6. Despacho Real',
    titulo: 'Avisos Preventivos Segmentados por Rol con Envío Real',
    subtitulo:
      'Abre la ventana de alertas segmentadas. El mismo fuego se traduce en 3 lenguajes: Vecinos, Agricultores y Brigadistas con entrega SMTP.',
    badge: 'Entrega SMTP en Vivo',
    requisitoNASA: 'Requisito de Impacto Comunitario: Alertas accionables sin pánico vecinal y con datos para brigadas.',
    duracionSegundos: 14,
  },
];

interface Props {
  activo: boolean;
  onCerrar: () => void;
  onEjecutarEscena: (escenaId: number) => void;
}

export default function LivePitchShowcase({ activo, onCerrar, onEjecutarEscena }: Props) {
  const [escenaIndex, setEscenaIndex] = useState<number>(0);
  const [reproduciendo, setReproduciendo] = useState<boolean>(true);
  const [progreso, setProgreso] = useState<number>(0);

  const escenaActual = ESCENAS_PITCH[escenaIndex];
  const intervaloRef = useRef<any>(null);

  // Al activar el showcase, reinicia a escena 0 y ejecuta
  useEffect(() => {
    if (!activo) {
      setProgreso(0);
      return;
    }
    setEscenaIndex(0);
    setReproduciendo(true);
    setProgreso(0);
    onEjecutarEscena(ESCENAS_PITCH[0].id);
  }, [activo]);

  // Manejador del avance automático con temporizador
  useEffect(() => {
    if (!activo || !reproduciendo) {
      if (intervaloRef.current) clearInterval(intervaloRef.current);
      return;
    }

    const duracionMs = escenaActual.duracionSegundos * 1000;
    const tickMs = 100;
    const deltaProgreso = (tickMs / duracionMs) * 100;

    intervaloRef.current = setInterval(() => {
      setProgreso((prev) => {
        if (prev >= 100) {
          // Avanzar a la siguiente escena
          setEscenaIndex((actual) => {
            const siguiente = (actual + 1) % ESCENAS_PITCH.length;
            onEjecutarEscena(ESCENAS_PITCH[siguiente].id);
            return siguiente;
          });
          return 0;
        }
        return prev + deltaProgreso;
      });
    }, tickMs);

    return () => {
      if (intervaloRef.current) clearInterval(intervaloRef.current);
    };
  }, [activo, reproduciendo, escenaIndex, escenaActual]);

  if (!activo) return null;

  const cambiarEscenaManual = (index: number) => {
    setProgreso(0);
    setEscenaIndex(index);
    onEjecutarEscena(ESCENAS_PITCH[index].id);
  };

  const siguiente = () => {
    const nxt = (escenaIndex + 1) % ESCENAS_PITCH.length;
    cambiarEscenaManual(nxt);
  };

  const anterior = () => {
    const prev = escenaIndex === 0 ? ESCENAS_PITCH.length - 1 : escenaIndex - 1;
    cambiarEscenaManual(prev);
  };

  return (
    <aside
      aria-label="Panel de Demostración Automática para el Jurado"
      className="w-full bg-[#0B0C10] border-b-2 border-amber-400 px-4 py-2.5 shadow-xl text-white relative z-20"
    >
      {/* Barra de progreso de la escena actual en la parte inferior de la cinta */}
      <div className="absolute bottom-0 inset-x-0 h-1 bg-[#1F2833] overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-400 via-rose-500 to-cyan-400 transition-all duration-100"
          style={{ width: `${Math.min(100, Math.max(0, progreso))}%` }}
        />
      </div>

      <div className="mx-auto max-w-[1600px] flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Izquierda: Indicador en vivo + Título y acción */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <span className="text-[11px] font-black tracking-wider uppercase bg-amber-400 text-black px-2 py-0.5 rounded font-mono">
              DEMO EN VIVO
            </span>
            <span className="font-bold text-amber-300 font-mono">
              {escenaIndex + 1}/{ESCENAS_PITCH.length}
            </span>
          </div>

          <div className="flex items-center gap-2 truncate">
            <strong className="text-white font-semibold text-sm truncate">
              {escenaActual.titulo}
            </strong>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 border border-cyan-400/40 text-cyan-300 shrink-0">
              {escenaActual.badge}
            </span>
            <span className="hidden lg:inline text-[#8C9BAA] text-xs truncate">
              — {escenaActual.subtitulo}
            </span>
          </div>
        </div>

        {/* Derecha: Píldoras de escenas + Controles de reproducción + Salir */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden md:flex items-center gap-1">
            {ESCENAS_PITCH.map((esc, i) => {
              const activa = i === escenaIndex;
              return (
                <button
                  key={esc.id}
                  type="button"
                  onClick={() => cambiarEscenaManual(i)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition border ${
                    activa
                      ? 'bg-amber-400 text-black border-amber-300 font-bold shadow-sm'
                      : 'bg-[#1F2833] text-[#8C9BAA] border-[#323E4C] hover:text-white hover:bg-[#323E4C]'
                  } ${FOCUS}`}
                >
                  {esc.id}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1 pl-2 border-l border-[#323E4C]">
            <button
              type="button"
              onClick={() => setReproduciendo(!reproduciendo)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition border ${
                reproduciendo
                  ? 'bg-amber-500/20 text-amber-300 border-amber-400/50 hover:bg-amber-500/30'
                  : 'bg-emerald-600 text-white border-emerald-400 hover:bg-emerald-500'
              } ${FOCUS}`}
              title={reproduciendo ? 'Pausar demostración automática' : 'Continuar reproducción automática'}
            >
              {reproduciendo ? (
                <>
                  <Pause className="w-3 h-3" />
                  <span>Pausar</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 fill-white" />
                  <span>Reanudar</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={anterior}
              title="Escena anterior"
              className={`p-1 rounded text-[#8C9BAA] hover:text-white hover:bg-[#323E4C] transition ${FOCUS}`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={siguiente}
              title="Siguiente escena"
              className={`p-1 rounded text-[#8C9BAA] hover:text-white hover:bg-[#323E4C] transition ${FOCUS}`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onCerrar}
              title="Salir del Modo Demo"
              className={`p-1 rounded text-[#8C9BAA] hover:text-rose-400 hover:bg-rose-950/40 transition ml-1 ${FOCUS}`}
            >
              <X className="w-4 h-4" />
              <span className="sr-only">Cerrar demo</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
