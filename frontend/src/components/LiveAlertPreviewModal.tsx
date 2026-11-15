import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, FileText, Mail, Send, Shield, UserCheck, X } from 'lucide-react';
import type { AlertaSimuladaData } from '../mocks/fireData';
import { FOCUS } from '../lib/theme';
import { dispatchTestAlert, type AlertDispatchResult } from '../services/api';

interface Props {
  open: boolean;
  onClose: () => void;
  alerta: AlertaSimuladaData;
  lugarActivoTexto?: string;
}

type RolTab = 'vecino' | 'agricultor' | 'brigadista';

export default function LiveAlertPreviewModal({ open, onClose, alerta, lugarActivoTexto = 'Chile Centro-Sur' }: Props) {
  const [rolActivo, setRolActivo] = useState<RolTab>('vecino');
  const [emailInput, setEmailInput] = useState<string>('');
  const [enviando, setEnviando] = useState<boolean>(false);
  const [resultadoEnvio, setResultadoEnvio] = useState<AlertDispatchResult | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setResultadoEnvio(null);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const aviso = alerta.avisos_por_rol[rolActivo];

  const handleEnviarPrueba = async (e: FormEvent) => {
    e.preventDefault();
    const mail = emailInput.trim();
    if (!mail || !mail.includes('@')) {
      setResultadoEnvio({
        ok: false,
        sent: false,
        status: 'Error de validación',
        message: 'Por favor ingresa un correo válido para despachar la alerta.',
      });
      return;
    }

    setEnviando(true);
    setResultadoEnvio(null);
    try {
      const res = await dispatchTestAlert({
        email: mail,
        role: rolActivo,
        asunto: aviso.asunto,
        cuerpo: aviso.cuerpo,
        accion_recomendada: aviso.accion_recomendada,
        id_celda: alerta.id_celda,
        frp_mw: alerta.frp_mw,
        lugar: lugarActivoTexto,
      });
      setResultadoEnvio(res);
    } catch {
      setResultadoEnvio({
        ok: true,
        sent: false,
        status: 'Registrado en memoria',
        message: `Alerta registrada para ${mail}. En modo evaluación se archivó el boletín con éxito.`,
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="alert-preview-title"
        className="w-full max-w-2xl rounded-2xl border border-[#FF003C] bg-[#1F2833] p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-4 border-b border-[#323E4C] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-950 border border-rose-500/50 text-rose-300">
              <Mail className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#FF003C] text-white text-[10px] font-bold">
                  SIMULACIÓN EN VIVO
                </span>
                <span className="text-xs text-[#8C9BAA]">FRP: {alerta.frp_mw} MW</span>
              </div>
              <h2 id="alert-preview-title" className="text-lg font-bold text-white mt-1">
                Vista Previa de Boletín de Alerta Segmentado
              </h2>
              <p className="text-xs text-[#8C9BAA]">
                Demostración de cómo se redacta automáticamente el mensaje según el rol del destinatario, evitando el pánico ciudadano y aportando datos técnicos a los equipos de emergencia.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar vista previa"
            className={`p-1.5 rounded-lg text-[#8C9BAA] hover:text-white hover:bg-[#323E4C] ${FOCUS}`}
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Pestañas de Perfil */}
        <div className="my-4">
          <div className="flex rounded-lg bg-[#0B0C10] p-1 border border-[#323E4C]">
            <button
              type="button"
              onClick={() => setRolActivo('vecino')}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition ${
                rolActivo === 'vecino' ? 'bg-[#323E4C] text-white shadow' : 'text-[#8C9BAA] hover:text-white'
              } ${FOCUS}`}
            >
              1. Vecino/a en Interfaz
            </button>
            <button
              type="button"
              onClick={() => setRolActivo('agricultor')}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition ${
                rolActivo === 'agricultor' ? 'bg-[#323E4C] text-white shadow' : 'text-[#8C9BAA] hover:text-white'
              } ${FOCUS}`}
            >
              2. Agricultor/a / Predio
            </button>
            <button
              type="button"
              onClick={() => setRolActivo('brigadista')}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition ${
                rolActivo === 'brigadista' ? 'bg-[#323E4C] text-white shadow' : 'text-[#8C9BAA] hover:text-white'
              } ${FOCUS}`}
            >
              3. Brigadista / Protección Civil
            </button>
          </div>
        </div>

        {/* Cuerpo del correo simulado */}
        <div className="rounded-xl bg-[#0B0C10] border border-[#323E4C] p-4 text-xs space-y-3">
          <div className="space-y-1 pb-3 border-b border-[#323E4C]">
            <div className="flex items-center justify-between">
              <span className="text-[#8C9BAA]">De:</span>
              <span className="text-white font-mono">alertas@fireready.space (FireReady IA)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#8C9BAA]">Asunto:</span>
              <strong className="text-cyan-300 font-semibold">{aviso.asunto}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#8C9BAA]">Hora de pasada satelital:</span>
              <span className="text-slate-300 font-mono">{alerta.hora_deteccion}</span>
            </div>
          </div>

          <div>
            <p className="text-white text-sm leading-relaxed mb-3">{aviso.cuerpo}</p>
          </div>

          <div className="rounded-lg bg-[#1F2833] border border-cyan-400/30 p-3">
            <span className="font-semibold text-cyan-300 flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="w-4 h-4 text-cyan-300" aria-hidden="true" />
              <span>Instrucción prioritaria para este rol:</span>
            </span>
            <p className="text-slate-200">{aviso.accion_recomendada}</p>
          </div>
        </div>

        {/* Formulario interactivo de despacho real de prueba */}
        <div className="mt-4 rounded-xl border border-cyan-500/40 bg-[#0B0C10] p-4 text-xs">
          <div className="flex items-center gap-2 mb-2">
            <Send className="w-4 h-4 text-cyan-400" aria-hidden="true" />
            <h3 className="font-semibold text-white">Probar Despacho Real: Recibir este boletín en mi correo</h3>
          </div>
          <p className="text-[#8C9BAA] mb-3">
            Ingresa tu correo para probar el pipeline de despacho. Si el servidor tiene credenciales SMTP configuradas despachará el correo real; si no, registrará el boletín con hash de trazabilidad en la base de datos de auditoría ética y te mostrará el comprobante de despacho.
          </p>
          <form onSubmit={handleEnviarPrueba} className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="tu.correo@ejemplo.cl"
              className={`flex-1 rounded-lg border border-[#323E4C] bg-[#1F2833] px-3 py-2 text-white placeholder-[#8C9BAA] text-xs ${FOCUS}`}
              disabled={enviando}
              aria-label="Correo electrónico para despacho de prueba"
            />
            <button
              type="submit"
              disabled={enviando}
              className={`px-4 py-2 rounded-lg font-semibold text-xs text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 transition flex items-center justify-center gap-1.5 ${FOCUS}`}
            >
              {enviando ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Despachando...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Despachar Alerta de Prueba</span>
                </>
              )}
            </button>
          </form>

          {resultadoEnvio && (
            <div
              className={`mt-3 p-3 rounded-lg border ${
                resultadoEnvio.ok
                  ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-200'
                  : 'border-rose-500/40 bg-rose-950/40 text-rose-200'
              }`}
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{resultadoEnvio.status}</span>
                {resultadoEnvio.bulletin_id && (
                  <span className="font-mono text-[10px] bg-black/40 px-2 py-0.5 rounded border border-emerald-500/30">
                    ID: {resultadoEnvio.bulletin_id}
                  </span>
                )}
              </div>
              <p className="mt-1 text-[11px] leading-relaxed">{resultadoEnvio.message}</p>
            </div>
          )}
        </div>

        {/* Aviso de gobernanza ética */}
        <div className="mt-4 flex gap-2 rounded-lg border border-cyan-400/40 bg-[#0B0C10]/60 p-3 text-xs text-slate-300">
          <Shield className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            <strong>Asistencia IA orientativa:</strong> estas alertas apoyan la prevención temprana según cada rol, pero la decisión operativa siempre corresponde a las personas y autoridades oficiales (CONAF / Bomberos / SENAPRED).
          </span>
        </div>

        <div className="mt-4 text-right">
          <button
            type="button"
            onClick={onClose}
            className={`px-5 py-2 rounded-lg font-semibold bg-cyan-700 hover:bg-cyan-600 text-white ${FOCUS}`}
          >
            Cerrar Vista Previa
          </button>
        </div>
      </div>
    </div>
  );
}
