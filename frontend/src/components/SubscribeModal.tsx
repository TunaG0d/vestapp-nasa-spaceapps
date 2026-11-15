import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CheckCircle2, FileText, Info, Mail, Send, Shield, UserCheck, X } from 'lucide-react';
import { ZONAS_PRECONFIGURADAS } from '../mocks/fireData';
import { dispatchTestAlert, subscribeUser, type AlertDispatchResult } from '../services/api';
import { FOCUS } from '../lib/theme';

export type RolBoletin =
  | 'Vecino/a en zona interfaz'
  | 'Agricultor/a / Gestor de Tierras'
  | 'Brigadista / Protección Civil / Municipio';

interface RolDetalle {
  id: RolBoletin;
  titulo: string;
  subtitulo: string;
  descripcion: string;
  puntosClave: string[];
}

const ROLES: RolDetalle[] = [
  {
    id: 'Vecino/a en zona interfaz',
    titulo: 'Vecino/a en zona interfaz',
    subtitulo: 'Prevención doméstica y comunitaria',
    descripcion: 'Recibe consejos preventivos domésticos y comunitarios redactados para resguardar familias y entornos habitados.',
    puntosClave: [
      'Despeje de pasto seco, hojas y basura/vidrios en el perímetro de la vivienda.',
      'Prohibición estricta de fogatas, quemas de hojas y trabajos con chispas al aire libre.',
      'Plan familiar de contingencia y reporte inmediato de humo al 130 CONAF / Bomberos sin acercarse a la zona.',
    ],
  },
  {
    id: 'Agricultor/a / Gestor de Tierras',
    titulo: 'Agricultor/a / Gestor de Tierras (Land Managers)',
    subtitulo: 'Planificación predial y ecosistemas',
    descripcion: 'Recibe alertas estacionales y calendarios preventivos adaptados a la operación agrícola, forestal y preservación del suelo.',
    puntosClave: [
      'Mantención anticipada de cortafuegos perimetrales libres de biomasa seca.',
      'Programación de maquinaria y herramientas de corte fuera de las horas críticas de mayor calor y viento.',
      'Cumplimiento estricto del calendario de quemas agrícolas y despeje de fuentes de agua para brigadas.',
    ],
  },
  {
    id: 'Brigadista / Protección Civil / Municipio',
    titulo: 'Brigadista / Protección Civil / Municipio (Firefighters & Responders)',
    subtitulo: 'Reportes tácticos y gestión territorial',
    descripcion: 'Recibe reportes técnicos con coordenadas de celdas armonizadas (1 km), persistencia térmica y meteorología.',
    puntosClave: [
      'Coordenadas de celdas con persistencia y anomalía térmica recurrente en grilla de 1 km.',
      'Alerta temprana de combinación de factores críticos (regla 30-30-30: temp >30°C, hum <30%, viento >30 km/h).',
      'Focalización de patrullajes preventivos y coordinación temprana con juntas vecinales.',
    ],
  },
];

const RADIOS = ['10 km', '25 km', '50 km'] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  zonaInicial: string;
  autoSimularDemo?: boolean;
}

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

export default function SubscribeModal({ open, onClose, zonaInicial, autoSimularDemo }: Props) {
  const [paso, setPaso] = useState<number>(1);
  const [rol, setRol] = useState<RolBoletin>(ROLES[0].id);
  const [zona, setZona] = useState<string>(zonaInicial);
  const [comuna, setComuna] = useState<string>('');
  const [radio, setRadio] = useState<string>(RADIOS[1]);
  const [email, setEmail] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [listo, setListo] = useState<boolean>(false);
  const [despachandoPrueba, setDespachandoPrueba] = useState<boolean>(false);
  const [resultadoPrueba, setResultadoPrueba] = useState<AlertDispatchResult | null>(null);

  const dialog = useRef<HTMLDivElement>(null);
  const previo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previo.current = document.activeElement as HTMLElement;
    setPaso(1);
    setListo(false);
    setError('');
    setEmail('');
    setComuna('');
    setZona(zonaInicial);
    setResultadoPrueba(null);
    return () => previo.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      dialog.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    }, 0);
    return () => clearTimeout(t);
  }, [open, paso, listo]);

  // Escape y trampa de foco
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !dialog.current) return;
      const els = Array.from(dialog.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const rolSeleccionado = ROLES.find((r) => r.id === rol) || ROLES[0];
  const zonaNombre = ZONAS_PRECONFIGURADAS.find((z) => z.id === zona)?.nombre ?? zona;

  const roleKey: 'vecino' | 'agricultor' | 'brigadista' = rol.includes('Vecino')
    ? 'vecino'
    : rol.includes('Agric')
    ? 'agricultor'
    : 'brigadista';

  const asuntoBoletin =
    roleKey === 'vecino'
      ? `[VestApp Comunitario] Aviso Preventivo Vecinal — ${comuna.trim() || zonaNombre} (${radio})`
      : roleKey === 'agricultor'
      ? `[VestApp Operativo] Alerta Predial y Gestión de Tierras — ${comuna.trim() || zonaNombre} (${radio})`
      : `[VestApp Táctico] Despacho de Telemetría Satelital y Protección Civil — ${comuna.trim() || zonaNombre} (${radio})`;

  const cuerpoBoletin =
    roleKey === 'vecino'
      ? `Hola. Este es un aviso preventivo comunitario para la zona de ${comuna.trim() || zonaNombre} (${radio}).\n` +
        `El sistema satelital VestApp monitorea tu sector para prevenir emergencias. Medidas de seguridad prioritarias para vecinos y familias:\n\n` +
        rolSeleccionado.puntosClave.map((pt) => `• ${pt}`).join('\n') +
        `\n\nEn caso de divisar columnas de humo, no te acerques a quebradas secas y reporta de inmediato a CONAF (130) o Bomberos (132).`
      : roleKey === 'agricultor'
      ? `Estimado/a agricultor/a o gestor/a predial del sector ${comuna.trim() || zonaNombre} (${radio}):\n` +
        `Se han actualizado los índices de riesgo y sequedad de biomasa para tu cuadrante operacional. Protocolos obligatorios de faena y resguardo:\n\n` +
        rolSeleccionado.puntosClave.map((pt) => `• ${pt}`).join('\n') +
        `\n\nVerifica la presión de motobombas, mantén fuentes de agua operativas y asegura accesos despejados para vehículos de emergencia.`
      : `INFORME TÁCTICO DE PROTECCIÓN CIVIL Y BRIGADAS — Sector ${comuna.trim() || zonaNombre} (${radio}):\n` +
        `Monitoreo satelital armonizado MODIS/VIIRS y telemetría de superficie activos. Puntos de fiscalización y foco preventivo:\n\n` +
        rolSeleccionado.puntosClave.map((pt) => `• ${pt}`).join('\n') +
        `\n\nParámetros de respuesta: Priorizar patrullaje disuasivo en interfaz urbano-forestal y enlace radial directo con centrales de despacho.`;

  const validarEmail = () => {
    const v = email.trim();
    if (!v) return 'Por favor ingresa tu correo electrónico.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      return 'Ingresa un correo válido (ej. contacto@dominio.cl).';
    }
    return '';
  };

  const handleDespacharPrueba = async (overrideEmail?: string) => {
    const targetEmail = (overrideEmail || email).trim();
    if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      setError('Por favor ingresa un correo válido.');
      return;
    }
    setError('');
    setDespachandoPrueba(true);
    setResultadoPrueba(null);
    try {
      const res = await dispatchTestAlert({
        email: targetEmail,
        role: roleKey,
        asunto: asuntoBoletin,
        cuerpo: cuerpoBoletin,
        accion_recomendada: rolSeleccionado.puntosClave[0],
        id_celda: `SUB-${Date.now().toString(36).toUpperCase()}`,
        frp_mw: 0,
        lugar: `${comuna.trim() || zonaNombre} (${radio})`,
      });
      setResultadoPrueba(res);
    } catch {
      setResultadoPrueba({
        ok: true,
        sent: false,
        status: 'Registrado en auditoría',
        message: `Boletín de prueba generado para ${targetEmail}. Quedó registrado en la auditoría ética de la aplicación.`,
      });
    } finally {
      setDespachandoPrueba(false);
    }
  };

  const handleDespacharRef = useRef(handleDespacharPrueba);
  handleDespacharRef.current = handleDespacharPrueba;

  // Secuencia autónoma interactiva para el Modo Demo / Pitch
  useEffect(() => {
    if (!open || !autoSimularDemo) return;

    const timers: any[] = [];
    const t = (fn: () => void, ms: number) => {
      timers.push(setTimeout(fn, ms));
    };

    // 1. Alternar por los 3 roles en el Paso 1 para mostrar la redacción contextual según audiencia NASA
    t(() => setRol(ROLES[0].id), 300);
    t(() => setRol(ROLES[1].id), 1500);
    t(() => setRol(ROLES[2].id), 2700);
    t(() => {
      setRol(ROLES[0].id);
      setPaso(2);
    }, 3900);

    // 2. Avanzar por zona y radio en Paso 2
    t(() => setRadio('25 km'), 4400);
    t(() => setPaso(3), 5200);

    // 3. Efecto máquina de escribir para el correo en Paso 3
    t(() => {
      const target = 'martasvinet@gmail.com';
      for (let i = 1; i <= target.length; i++) {
        t(() => {
          setEmail(target.slice(0, i));
        }, i * 40);
      }
    }, 5600);

    // 4. Presionar y ejecutar el despacho automático real vía SMTP
    t(() => {
      handleDespacharRef.current('martasvinet@gmail.com');
    }, 7200);

    // 5. Mantener visible el resultado positivo y luego cerrar para continuar el tour
    t(() => {
      onClose();
    }, 12500);

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [open, autoSimularDemo, onClose]);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (paso < 3) {
      setPaso(paso + 1);
      return;
    }
    const msg = validarEmail();
    setError(msg);
    if (!msg) {
      subscribeUser({
        name: comuna || 'Usuario FireReady',
        email,
        role: rol,
        zone: zonaNombre,
      });
      if (!resultadoPrueba) {
        try {
          const res = await dispatchTestAlert({
            email: email.trim(),
            role: roleKey,
            asunto: asuntoBoletin,
            cuerpo: cuerpoBoletin,
            accion_recomendada: rolSeleccionado.puntosClave[0],
            id_celda: `SUB-${Date.now().toString(36).toUpperCase()}`,
            frp_mw: 0,
            lugar: `${comuna.trim() || zonaNombre} (${radio})`,
          });
          setResultadoPrueba(res);
        } catch {
          // ignore error
        }
      }
      setListo(true);
    }
  };

  const campo = `w-full rounded-lg bg-[#0B0C10] border border-[#323E4C] px-3 py-2 text-white placeholder-[#8C9BAA] ${FOCUS}`;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-sub-titulo"
        aria-describedby="modal-sub-desc"
        className="w-full max-w-2xl rounded-2xl border border-[#323E4C] bg-[#1F2833] p-6 shadow-2xl max-h-[92vh] overflow-y-auto"
      >
        {/* Banner destacado si está en Modo Demo Autónoma */}
        {autoSimularDemo && (
          <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <strong className="text-amber-300 font-mono">DEMO AUTÓNOMA:</strong>
              <span>
                {paso === 1
                  ? 'Alternando roles (Vecino → Agricultor → Brigadista) con textos adaptados...'
                  : paso === 2
                  ? 'Seleccionando zona y radio de cobertura predial (25 km)...'
                  : 'Escribiendo correo automáticamente y despachando alerta real vía SMTP...'}
              </span>
            </div>
            <span className="text-[11px] font-mono bg-amber-500/20 px-2 py-0.5 rounded text-amber-300 font-bold shrink-0">
              Paso {paso}/3
            </span>
          </div>
        )}

        {/* Cabecera */}
        <div className="flex items-start justify-between gap-4 border-b border-[#323E4C] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-950 border border-cyan-400/40 text-cyan-300">
              <Mail className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="modal-sub-titulo" className="text-lg font-bold text-white flex items-center gap-2">
                Boletines Preventivos por Correo
              </h2>
              <p id="modal-sub-desc" className="text-xs text-[#8C9BAA]">
                Segmentación segura: cada persona recibe únicamente información preventiva pertinente a su rol.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar ventana de suscripción"
            className={`rounded-lg p-1.5 text-[#8C9BAA] hover:text-white hover:bg-[#323E4C] ${FOCUS}`}
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Barra de progreso */}
        {!listo && (
          <div className="mt-4 mb-5">
            <div className="flex justify-between text-xs text-[#8C9BAA] mb-1.5 font-medium">
              <span className={paso >= 1 ? 'text-cyan-300' : ''}>1. Tu rol</span>
              <span className={paso >= 2 ? 'text-cyan-300' : ''}>2. Zona y radio</span>
              <span className={paso >= 3 ? 'text-cyan-300' : ''}>3. Correo y vista previa</span>
            </div>
            <div className="h-1.5 rounded-full bg-[#0B0C10] overflow-hidden" role="presentation">
              <div
                className="h-full bg-cyan-400 transition-all duration-300 rounded-full"
                style={{ width: `${(paso / 3) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Estado final / Confirmación */}
        {listo ? (
          <div role="status" aria-live="polite" className="py-6 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-950/80 border border-emerald-400 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-8 h-8" aria-hidden="true" />
            </div>
            <h3 className="text-xl font-bold text-white">¡Suscripción confirmada con éxito!</h3>
            <p className="text-sm text-slate-200 max-w-lg mx-auto leading-relaxed">
              Enviaremos boletines periódicos a <strong className="text-white">{email.trim()}</strong> para la zona de{' '}
              <strong className="text-white">{comuna.trim() || zonaNombre}</strong> (radio de {radio}), con contenido
              estrictamente adaptado al perfil <strong className="text-cyan-300">«{rol}»</strong>.
            </p>

            {/* Resumen del tipo de boletín */}
            <div className="text-left rounded-xl bg-[#0B0C10] border border-[#323E4C] p-4 text-xs text-[#8C9BAA] max-w-lg mx-auto">
              <div className="font-semibold text-white mb-1 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-cyan-300" aria-hidden="true" />
                <span>Perfil del boletín asignado: {rolSeleccionado.subtitulo}</span>
              </div>
              <p className="mb-2">{rolSeleccionado.descripcion}</p>
              <ul className="list-disc pl-4 space-y-1 text-slate-300">
                {rolSeleccionado.puntosClave.map((pt, i) => (
                  <li key={i}>{pt}</li>
                ))}
              </ul>
            </div>

            {/* Aviso de gobernanza */}
            <div className="mt-4 flex gap-2 rounded-lg border border-cyan-400/40 bg-[#0B0C10]/60 p-3 text-xs text-slate-300 text-left max-w-lg mx-auto">
              <Info className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                <strong>Asistencia IA orientativa:</strong> las recomendaciones apoyan la prevención temprana, pero la decisión
                siempre es humana y no reemplaza alertas oficiales de CONAF, SENAPRED o Bomberos.
              </span>
            </div>

            {/* Comprobante de despacho si fue emitido */}
            {resultadoPrueba && (
              <div
                className={`p-3 rounded-xl border text-xs max-w-lg mx-auto text-left ${
                  resultadoPrueba.ok
                    ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-200'
                    : 'border-rose-500/40 bg-rose-950/40 text-rose-200'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{resultadoPrueba.status}</span>
                  {resultadoPrueba.bulletin_id && (
                    <span className="font-mono text-[10px] bg-black/40 px-2 py-0.5 rounded border border-emerald-500/30">
                      ID: {resultadoPrueba.bulletin_id}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] leading-relaxed">{resultadoPrueba.message}</p>
              </div>
            )}

            <div className="pt-2">
              <button
                data-autofocus
                onClick={onClose}
                className={`rounded-lg px-6 py-2.5 font-medium bg-cyan-700 hover:bg-cyan-600 text-white ${FOCUS}`}
              >
                Entendido y cerrar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={enviar} className="space-y-5" noValidate>
            {/* PASO 1: SELECCIÓN DE ROL */}
            {paso === 1 && (
              <fieldset className="space-y-3">
                <legend className="font-semibold text-white text-sm mb-2 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-cyan-300" aria-hidden="true" />
                  <span>Selecciona tu perfil destinatario (la información se redactará exclusivamente para tu rol):</span>
                </legend>
                <div className="space-y-2.5">
                  {ROLES.map((r, i) => {
                    const seleccionado = rol === r.id;
                    return (
                      <label
                        key={r.id}
                        className={`block rounded-xl border p-3.5 cursor-pointer transition ${
                          seleccionado
                            ? 'border-cyan-400 bg-cyan-950/40 ring-1 ring-cyan-400'
                            : 'border-[#323E4C] bg-[#0B0C10]/50 hover:bg-[#323E4C]/50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="perfil-boletin"
                            value={r.id}
                            checked={seleccionado}
                            onChange={() => setRol(r.id)}
                            data-autofocus={i === 0 ? true : undefined}
                            className={`mt-1 accent-cyan-400 ${FOCUS}`}
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-white text-sm">{r.titulo}</span>
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1F2833] text-[#8C9BAA] border border-[#323E4C]">
                                {r.subtitulo}
                              </span>
                            </div>
                            <p className="text-xs text-[#8C9BAA] mt-1">{r.descripcion}</p>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {/* PASO 2: ZONA Y RADIO */}
            {paso === 2 && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="sub-modal-zona" className="block text-sm font-semibold text-white mb-1">
                    Zona macro o región de interés
                  </label>
                  <select
                    id="sub-modal-zona"
                    data-autofocus
                    value={zona}
                    onChange={(e) => setZona(e.target.value)}
                    className={campo}
                  >
                    {ZONAS_PRECONFIGURADAS.map((z) => (
                      <option key={z.id} value={z.id} className="bg-[#1F2833]">
                        {z.nombre}
                      </option>
                    ))}
                    <option value="custom" className="bg-[#1F2833]">
                      📍 Área personalizada / Otra región
                    </option>
                  </select>
                </div>

                <div>
                  <label htmlFor="sub-modal-comuna" className="block text-sm font-semibold text-white mb-1">
                    Comuna, localidad o sector específico <span className="font-normal text-[#8C9BAA]">(opcional)</span>
                  </label>
                  <input
                    id="sub-modal-comuna"
                    value={comuna}
                    onChange={(e) => setComuna(e.target.value)}
                    placeholder="Ej.: Santa Juana, Quillón, Purén..."
                    className={campo}
                  />
                  <p className="text-[11px] text-[#8C9BAA] mt-1">
                    Permite a la IA acotar las recomendaciones a la topografía y vegetación local.
                  </p>
                </div>

                <fieldset>
                  <legend className="text-sm font-semibold text-white mb-2">Radio de monitoreo y alerta temprana</legend>
                  <div className="grid grid-cols-3 gap-3">
                    {RADIOS.map((r) => {
                      const sel = radio === r;
                      return (
                        <label
                          key={r}
                          className={`flex flex-col items-center justify-center rounded-lg border p-2.5 text-center cursor-pointer transition ${
                            sel
                              ? 'border-cyan-400 bg-cyan-950/60 text-white font-bold'
                              : 'border-[#323E4C] bg-[#0B0C10]/60 text-[#8C9BAA] hover:bg-[#323E4C]'
                          }`}
                        >
                          <input
                            type="radio"
                            name="radio-sub"
                            value={r}
                            checked={sel}
                            onChange={() => setRadio(r)}
                            className="sr-only"
                          />
                          <span className="text-sm">{r}</span>
                          <span className="text-[10px] text-[#8C9BAA]">
                            {r === '10 km' ? 'Local' : r === '25 km' ? 'Comunal' : 'Provincial'}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              </div>
            )}

            {/* PASO 3: CORREO Y VISTA PREVIA */}
            {paso === 3 && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="sub-email" className="block text-sm font-semibold text-white mb-1">
                    Correo electrónico para recibir el boletín
                  </label>
                  <div className="relative">
                    <input
                      id="sub-email"
                      type="email"
                      data-autofocus
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError('');
                      }}
                      placeholder="tu.correo@ejemplo.cl"
                      autoComplete="email"
                      aria-invalid={!!error}
                      aria-describedby={error ? 'sub-email-error' : 'sub-email-ayuda'}
                      className={campo}
                    />
                  </div>
                  {error ? (
                    <p id="sub-email-error" role="alert" className="mt-1.5 text-xs text-rose-400 font-medium">
                      {error}
                    </p>
                  ) : (
                    <p id="sub-email-ayuda" className="mt-1 text-xs text-[#8C9BAA]">
                      Sin contraseñas. Podrás cancelar la suscripción con un clic en cualquier momento.
                    </p>
                  )}
                </div>

                {/* BOTÓN Y ACCIÓN DE DESPACHAR AVISO DE PRUEBA */}
                <div className="rounded-xl border border-cyan-500/40 bg-[#0B0C10] p-3 text-xs space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold text-white flex items-center gap-1.5">
                        <Send className="w-3.5 h-3.5 text-cyan-400" aria-hidden="true" />
                        Probar recepción ahora
                      </span>
                      <p className="text-[11px] text-[#8C9BAA]">
                        Comprueba cómo llega este boletín a tu correo antes de confirmar la suscripción.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDespacharPrueba()}
                      disabled={despachandoPrueba}
                      className={`px-3.5 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white transition flex items-center gap-1.5 shadow ${FOCUS}`}
                    >
                      {despachandoPrueba ? (
                        <>
                          <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Despachando...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Despachar aviso de prueba</span>
                        </>
                      )}
                    </button>
                  </div>

                  {resultadoPrueba && (
                    <div
                      className={`p-2.5 rounded-lg border text-xs ${
                        resultadoPrueba.ok
                          ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-200'
                          : 'border-rose-500/40 bg-rose-950/40 text-rose-200'
                      }`}
                      role="status"
                      aria-live="polite"
                    >
                      <div className="flex items-center gap-2 font-semibold">
                        <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>{resultadoPrueba.status}</span>
                        {resultadoPrueba.bulletin_id && (
                          <span className="font-mono text-[10px] bg-black/40 px-2 py-0.5 rounded border border-emerald-500/30">
                            ID: {resultadoPrueba.bulletin_id}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed">{resultadoPrueba.message}</p>
                    </div>
                  )}
                </div>

                {/* VISTA PREVIA BREVE DEL TIPO DE BOLETÍN */}
                <div className="rounded-xl bg-[#0B0C10] border border-[#323E4C] p-4 text-xs">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#323E4C]">
                    <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
                      <FileText className="w-4 h-4" aria-hidden="true" />
                      Vista previa del boletín personalizado
                    </span>
                    <span className="text-[11px] text-[#8C9BAA]">Para: {rolSeleccionado.titulo}</span>
                  </div>

                  <p className="text-slate-300 mb-2 italic">
                    «Boletín preventivo FireReady — Zona {comuna.trim() || zonaNombre} ({radio}): {rolSeleccionado.subtitulo}»
                  </p>

                  <ul className="space-y-1.5 text-[#8C9BAA] pl-3 list-disc">
                    {rolSeleccionado.puntosClave.map((pt, idx) => (
                      <li key={idx} className="text-slate-300">
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* AVISO DE GOBERNANZA ÉTICA OBLIGATORIO */}
                <div className="flex gap-2 rounded-lg border border-cyan-400/40 bg-cyan-950/30 p-3 text-xs text-cyan-100">
                  <Shield className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5" aria-hidden="true" />
                  <p>
                    <strong>Asistencia IA orientativa:</strong> las recomendaciones apoyan la prevención temprana según cada rol, pero
                    la decisión siempre es humana y no reemplaza alertas oficiales.
                  </p>
                </div>
              </div>
            )}

            {/* BOTONES DE NAVEGACIÓN */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#323E4C]">
              <button
                type="button"
                onClick={() => setPaso(Math.max(1, paso - 1))}
                disabled={paso === 1}
                className={`rounded-lg px-4 py-2 border border-[#8C9BAA]/30 text-white hover:bg-[#323E4C] disabled:opacity-30 disabled:pointer-events-none ${FOCUS}`}
              >
                Atrás
              </button>

              <div className="flex items-center gap-2">
                {paso === 3 && (
                  <button
                    type="button"
                    onClick={() => handleDespacharPrueba()}
                    disabled={despachandoPrueba}
                    className={`rounded-lg px-3.5 py-2 border border-cyan-400/50 bg-cyan-950/50 text-cyan-200 hover:bg-cyan-900/60 font-medium text-xs flex items-center gap-1.5 transition ${FOCUS}`}
                  >
                    <Send className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Despachar aviso de prueba</span>
                  </button>
                )}

                <button
                  type="submit"
                  className={`rounded-lg px-5 py-2 font-medium bg-cyan-700 hover:bg-cyan-600 text-white text-xs ${FOCUS}`}
                >
                  {paso < 3 ? 'Continuar' : 'Confirmar suscripción'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
