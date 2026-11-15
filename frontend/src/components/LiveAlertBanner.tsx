import { useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, Flame, Mail, Radio, Send, ShieldAlert, Wind, Zap, X } from 'lucide-react';
import {
  ESCENARIOS_ALERTA,
  type AlertaSimuladaData,
  type TipoEscenarioAlerta,
} from '../mocks/fireData';
import { FOCUS } from '../lib/theme';
import LiveAlertPreviewModal from './LiveAlertPreviewModal';
import { dispatchAllRolesAlert } from '../services/api';

interface Props {
  alerta: AlertaSimuladaData;
  onDesactivar: () => void;
  lugarActivoTexto: string;
  escenarioActivo: TipoEscenarioAlerta;
  onCambiarEscenario: (escenario: TipoEscenarioAlerta) => void;
}

export default function LiveAlertBanner({
  alerta,
  onDesactivar,
  lugarActivoTexto,
  escenarioActivo,
  onCambiarEscenario,
}: Props) {
  const [modalAbierto, setModalAbierto] = useState<boolean>(false);
  const [despachando, setDespachando] = useState<boolean>(false);
  const [feedbackEnvio, setFeedbackEnvio] = useState<string | null>(null);

  if (!alerta.activa) return null;

  const configActual = ESCENARIOS_ALERTA.find((e) => e.id === escenarioActivo) ?? ESCENARIOS_ALERTA[0];

  const handleDespacharTodos = async () => {
    setDespachando(true);
    setFeedbackEnvio(null);
    try {
      const res = await dispatchAllRolesAlert({
        email: 'martasvinet@gmail.com',
        id_celda: alerta.id_celda,
        frp_mw: alerta.frp_mw,
        lugar: lugarActivoTexto,
        escenario: escenarioActivo,
      });
      setFeedbackEnvio(
        `✓ ¡Los 3 correos por rol han sido despachados vía SMTP a martasvinet@gmail.com! (1. Brigadistas, 2. Agricultores, 3. Vecinos).`,
      );
    } catch {
      setFeedbackEnvio('Aviso: Registrado en el despachador.');
    } finally {
      setDespachando(false);
      setTimeout(() => setFeedbackEnvio(null), 8000);
    }
  };

  return (
    <>
      <div
        role="alert"
        aria-live="assertive"
        className="rounded-xl border-2 border-[#FF003C] bg-gradient-to-r from-[#FF003C]/20 via-[#1F2833] to-[#1F2833] p-4 text-white shadow-2xl animate-in fade-in duration-200"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-[#323E4C]/60">
          {/* Lado izquierdo con icono pulsante */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <span className="absolute w-10 h-10 rounded-full bg-[#FF003C]/40 animate-ping" />
              <div className="relative p-2.5 rounded-full bg-[#FF003C] text-white shadow-lg shadow-rose-950">
                <Flame className="w-5 h-5 animate-pulse" aria-hidden="true" />
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#FF003C] text-white text-[11px] font-extrabold tracking-wider uppercase flex items-center gap-1">
                  <Radio className="w-3 h-3 animate-pulse" />
                  Alerta Temprana en Vivo
                </span>
                <span className="text-xs font-semibold text-cyan-300">
                  {configActual.nombre}
                </span>
                <span className="text-xs text-[#8C9BAA]">
                  · {alerta.hora_deteccion}
                </span>
              </div>
              <p className="text-sm font-semibold text-white mt-1">
                {escenarioActivo === 'satelital_critica' && (
                  <>
                    Detección térmica crítica: <strong className="text-rose-300 font-mono">FRP {alerta.frp_mw} MW</strong> ({alerta.detecciones} focos unificados en celda de 1 km) en <span className="text-cyan-300">{lugarActivoTexto}</span> ({alerta.lat.toFixed(3)}°, {alerta.lng.toFixed(3)}°). Satélites: {alerta.satelites}.
                  </>
                )}
                {escenarioActivo === 'meteorologica_3030' && (
                  <>
                    Condición meteorológica crítica: <strong className="text-amber-300 font-mono">Regla 30-30-30 Superada</strong> (34.5°C, HR 18%, Viento 36 km/h) en <span className="text-cyan-300">{lugarActivoTexto}</span>.
                  </>
                )}
                {escenarioActivo === 'anomalia_termica' && (
                  <>
                    Persistencia térmica anómala: <strong className="text-amber-300 font-mono">+3.4σ sobre la mediana histórica</strong> en zona de interfaz habitada durante los últimos 7 días.
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Lado derecho con acciones principales */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDespacharTodos}
              disabled={despachando}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow-md shadow-rose-950/80 cursor-pointer ${FOCUS}`}
            >
              <Send className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{despachando ? 'Despachando los 3 correos...' : 'Despachar 3 Correos por Rol a martasvinet@gmail.com'}</span>
            </button>

            <button
              type="button"
              onClick={() => setModalAbierto(true)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0B0C10] hover:bg-[#1A232E] border border-[#323E4C] text-white font-semibold text-xs transition shadow-sm cursor-pointer ${FOCUS}`}
            >
              <Mail className="w-3.5 h-3.5 text-cyan-400" aria-hidden="true" />
              <span>Ver Plantillas</span>
            </button>

            <button
              type="button"
              onClick={onDesactivar}
              title="Cerrar y descartar simulación"
              className={`p-2 rounded-lg text-[#8C9BAA] hover:text-white hover:bg-[#323E4C] transition cursor-pointer ${FOCUS}`}
            >
              <X className="w-4 h-4" aria-hidden="true" />
              <span className="sr-only">Desactivar simulación de alerta</span>
            </button>
          </div>
        </div>

        {/* Feedback visual de envío SMTP real */}
        {feedbackEnvio && (
          <div className="mt-3 p-2.5 rounded-lg bg-emerald-950/90 border border-emerald-400/80 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{feedbackEnvio}</span>
          </div>
        )}

        {/* CRITERIOS DE ENVÍO DE ALERTA POR ROL (Explicación científica visible en el banner) */}
        <div className="mt-3 pt-2.5 border-t border-[#323E4C]/60">
          <div className="flex items-center gap-1.5 text-xs text-[#8C9BAA] mb-2 font-bold uppercase tracking-wider">
            <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
            <span>Criterios de Activación y Despacho Aplicados por Rol:</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]">
            {/* Rol 1 */}
            <div className="rounded-lg bg-[#0B0C10]/90 p-2.5 border border-rose-500/40 space-y-1">
              <div className="font-extrabold text-rose-400 flex items-center justify-between">
                <span>🚒 1. Brigadistas / Bomberos</span>
                <span className="text-[10px] font-mono text-white bg-rose-950 px-1.5 py-0.2 rounded border border-rose-600">TÁCTICO</span>
              </div>
              <p className="text-slate-300 text-[10px] leading-relaxed">
                <strong>Criterio:</strong> FRP &gt; 100 MW + Regla 30-30-30 (T &gt; 30°C, HR &lt; 30%, Viento &gt; 30 km/h) + Pendiente &gt; 5°.
              </p>
              <p className="text-[#8C9BAA] text-[10px]">
                <strong>Acción:</strong> Ataque inicial con carros bomba en accesos viales y cortafuegos de contención.
              </p>
            </div>

            {/* Rol 2 */}
            <div className="rounded-lg bg-[#0B0C10]/90 p-2.5 border border-amber-500/40 space-y-1">
              <div className="font-extrabold text-amber-300 flex items-center justify-between">
                <span>🚜 2. Agricultores / Silvicultura</span>
                <span className="text-[10px] font-mono text-white bg-amber-950 px-1.5 py-0.2 rounded border border-amber-600">FAENAS</span>
              </div>
              <p className="text-slate-300 text-[10px] leading-relaxed">
                <strong>Criterio:</strong> Proximidad &lt; 5 km al cono de avance + Humedad combustible &lt; 25% + Veda de quemas CONAF.
              </p>
              <p className="text-[#8C9BAA] text-[10px]">
                <strong>Acción:</strong> Paralización de cosechadoras/desbrozadoras, habilitar motobombas y vigilar cortafuegos.
              </p>
            </div>

            {/* Rol 3 */}
            <div className="rounded-lg bg-[#0B0C10]/90 p-2.5 border border-cyan-500/40 space-y-1">
              <div className="font-extrabold text-cyan-300 flex items-center justify-between">
                <span>🏡 3. Vecinos / Comunidad / Escuelas</span>
                <span className="text-[10px] font-mono text-white bg-cyan-950 px-1.5 py-0.2 rounded border border-cyan-700">COMUNIDAD</span>
              </div>
              <p className="text-slate-300 text-[10px] leading-relaxed">
                <strong>Criterio:</strong> Vivienda en cono de propagación proyectada a 3 horas (&lt; 10 km) + Riesgo de pavesas con viento fuerte.
              </p>
              <p className="text-[#8C9BAA] text-[10px]">
                <strong>Acción:</strong> Lenguaje claro: despeje de hojas en techos/canaletas, mojar perímetro de 10m y preparar bolso de emergencia.
              </p>
            </div>
          </div>
        </div>

        {/* Selector de Escenarios de Activación de Alerta */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
          <div className="flex items-center gap-1.5 text-[#8C9BAA]">
            <Zap className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
            <span className="font-semibold text-white">Alternar Escenario Físico de Activación:</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {ESCENARIOS_ALERTA.map((esc) => {
              const activo = esc.id === escenarioActivo;
              return (
                <button
                  key={esc.id}
                  type="button"
                  onClick={() => onCambiarEscenario(esc.id)}
                  aria-pressed={activo}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                    activo
                      ? 'bg-rose-600/90 text-white border-rose-400 shadow-md ring-1 ring-rose-400'
                      : 'bg-[#0B0C10]/80 text-[#8C9BAA] border-[#323E4C] hover:text-white hover:bg-[#323E4C]'
                  } ${FOCUS}`}
                >
                  <span>{esc.nombre.split('(')[0].trim()}</span>
                  <span className="ml-1.5 text-[10px] opacity-80">({esc.badge})</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <LiveAlertPreviewModal
        open={modalAbierto}
        onClose={() => setModalAbierto(false)}
        alerta={alerta}
        lugarActivoTexto={lugarActivoTexto}
      />
    </>
  );
}
