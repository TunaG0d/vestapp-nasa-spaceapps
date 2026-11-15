import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BellRing,
  Calendar as CalendarIcon,
  Compass,
  FileSpreadsheet,
  Flame,
  Layers,
  MapPin,
  Radio,
  Satellite,
  ShieldAlert,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  ANIOS_DISPONIBLES,
  MOCK_RISK,
  ZONAS_PRECONFIGURADAS,
  generarFocosCrudos,
  getAlertaSimulada,
  getAreaActivaTexto,
  getMockCalendar,
  getMockHotspots,
  type AlertaSimuladaData,
  type TipoEscenarioAlerta,
  type CalendarMes,
  type HotspotsResponse,
  type Intensidad,
  type RiskResponse,
  type Sensor,
  type Zona,
} from './mocks/fireData';
import { dispatchAllRolesAlert, fetchCalendar, fetchHotspots, fetchRisk, syncFirmsLive } from './services/api';
import { FOCUS, PALETAS, intensitySvg } from './lib/theme';
import { nivelLabel, textos } from './lib/lang';
import FireMap, { type Vista } from './components/FireMap';
import BurningCalendar from './components/BurningCalendar';
import RiskAssistant from './components/RiskAssistant';
import SubscribeModal from './components/SubscribeModal';
import GeospatialBar from './components/GeospatialBar';
import DataTableTab from './components/DataTableTab';
import LiveAlertBanner from './components/LiveAlertBanner';
import HeaderNav from './components/HeaderNav';
import CoordenadasModal from './components/CoordenadasModal';
import FiltroDatosPopover from './components/FiltroDatosPopover';
import PreferenciasPopover from './components/PreferenciasPopover';

export type TabFlujo = 'tactico' | 'calendario' | 'datos';

export default function App() {
  // 1. Pestaña activa del flujo de trabajo de la NASA
  const [tabActiva, setTabActiva] = useState<TabFlujo>('tactico');

  // 2. Filtros geoespaciales globales
  const [zonaId, setZonaId] = useState<string>(ZONAS_PRECONFIGURADAS[0].id);
  const [customCenter, setCustomCenter] = useState<[number, number]>([-36.8, -72.2]);
  const [customLatInput, setCustomLatInput] = useState<string>('-36.80');
  const [customLngInput, setCustomLngInput] = useState<string>('-72.20');
  const [customRadioInput, setCustomRadioInput] = useState<string>('50');

  const [anio, setAnio] = useState<number>(2026);
  const [fechaDesde, setFechaDesde] = useState<string>('2026-01-01');
  const [fechaHasta, setFechaHasta] = useState<string>('2026-12-31');

  // 3. Filtros de visualización y sensores
  const [vista, setVista] = useState<Vista>('celdas');
  const [sensorFiltro, setSensorFiltro] = useState<'TODOS' | Sensor>('TODOS');

  // 4. Modales y popovers del diseño
  const [buscarModalAbierto, setBuscarModalAbierto] = useState<boolean>(false);
  const [navegacionPopoverAbierto, setNavegacionPopoverAbierto] = useState<boolean>(false);
  const [ajustesPopoverAbierto, setAjustesPopoverAbierto] = useState<boolean>(false);

  // 5. Alertas Tempranas y Avisos Preventivos
  const [modalAvisos, setModalAvisos] = useState<boolean>(false);
  const [vistaForzadaRisk, setVistaForzadaRisk] = useState<'inmediato' | 'proyeccion72' | 'completa'>('completa');
  const [autoSimularDespachoDemo, setAutoSimularDespachoDemo] = useState<boolean>(false);

  // 6. Simulador de alerta satelital en vivo con cono de viento
  const [alertaSimulada, setAlertaSimulada] = useState<AlertaSimuladaData | null>(null);
  const [escenarioAlerta, setEscenarioAlerta] = useState<TipoEscenarioAlerta>('satelital_critica');

  // 7. Capas activas de satélites
  const [modisActivo, setModisActivo] = useState<boolean>(true);
  const [viirsActivo, setViirsActivo] = useState<boolean>(true);
  const [vientoActivo, setVientoActivo] = useState<boolean>(true);
  const [prediccionActiva, setPrediccionActiva] = useState<boolean>(true);
  const [rangoAnios, setRangoAnios] = useState<number>(26);

  // 8. Estados de accesibilidad WCAG universales
  const [daltonico, setDaltonico] = useState<boolean>(false);
  const [claro, setClaro] = useState<boolean>(false);
  const [tamanioTexto, setTamanioTexto] = useState<number>(16);
  const [textoGrande, setTextoGrande] = useState<boolean>(false);
  const [altoContraste, setAltoContraste] = useState<boolean>(false);
  const [reducirMovimiento, setReducirMovimiento] = useState<boolean>(false);
  const [activarUbicacion, setActivarUbicacion] = useState<boolean>(false);

  // Atajos de teclado accesibles: 1, 2, 3 para alternar pestañas
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === '1') setTabActiva('tactico');
      if (e.key === '2') setTabActiva('calendario');
      if (e.key === '3') setTabActiva('datos');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Escala de texto accesible
  useEffect(() => {
    document.documentElement.style.fontSize = `${tamanioTexto}px`;
  }, [tamanioTexto]);

  // Sincronización A / A+
  useEffect(() => {
    if (textoGrande) {
      setTamanioTexto(19);
    } else {
      setTamanioTexto(16);
    }
  }, [textoGrande]);

  // Modo Alto Contraste (WCAG AAA)
  useEffect(() => {
    if (altoContraste) {
      document.documentElement.classList.add('alto-contraste');
    } else {
      document.documentElement.classList.remove('alto-contraste');
    }
  }, [altoContraste]);

  // Reducción de animaciones y movimiento
  useEffect(() => {
    if (reducirMovimiento) {
      document.documentElement.classList.add('reducir-movimiento');
    } else {
      document.documentElement.classList.remove('reducir-movimiento');
    }
  }, [reducirMovimiento]);

  // Sincronización en vivo NASA FIRMS NRT
  const [sincronizando, setSincronizando] = useState<boolean>(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  // Datos satelitales y modelos
  const [hotspots, setHotspots] = useState<HotspotsResponse>(() =>
    getMockHotspots(ZONAS_PRECONFIGURADAS[0].id, 2026),
  );
  const [calendar, setCalendar] = useState<CalendarMes[]>(() => getMockCalendar(2026));
  const [risk, setRisk] = useState<RiskResponse>(MOCK_RISK);

  // Zona activa calculada
  const zonaActiva: Zona = useMemo(() => {
    const radio = Number(customRadioInput) || 50;
    if (zonaId === 'custom') {
      const lat = customCenter[0];
      const lng = customCenter[1];
      const delta = radio / 111;
      return {
        id: 'custom',
        nombre: `Coordenadas Personalizadas`,
        center: customCenter,
        bbox: [
          +(lng - delta).toFixed(3),
          +(lat - delta).toFixed(3),
          +(lng + delta).toFixed(3),
          +(lat + delta).toFixed(3),
        ],
        radio_km: radio,
      };
    }
    const z = ZONAS_PRECONFIGURADAS.find((item) => item.id === zonaId) ?? ZONAS_PRECONFIGURADAS[0];
    return {
      ...z,
      radio_km: radio,
    };
  }, [zonaId, customCenter, customRadioInput]);

  const lugarActivoTexto = useMemo(
    () => getAreaActivaTexto(zonaActiva, Number(customRadioInput) || 50),
    [zonaActiva, customRadioInput],
  );

  const pal = daltonico ? PALETAS.daltonico : PALETAS.standard;
  const t = textos(claro);

  // Carga reactiva de datos al cambiar región, año o fechas
  useEffect(() => {
    let alive = true;
    Promise.all([
      fetchHotspots(
        zonaId,
        anio,
        zonaId === 'custom' ? customCenter : undefined,
        Number(customRadioInput) || 50,
        fechaDesde,
        fechaHasta,
      ),
      fetchCalendar(
        zonaId,
        anio,
        zonaId === 'custom' ? customCenter : undefined,
        Number(customRadioInput) || 50,
      ),
      fetchRisk(zonaId, zonaActiva.center[0], zonaActiva.center[1]),
    ]).then(([h, c, r]) => {
      if (!alive) return;
      setHotspots(h);
      setCalendar(c);
      setRisk(r);
    });
    return () => {
      alive = false;
    };
  }, [zonaId, anio, customCenter, fechaDesde, fechaHasta, customRadioInput]);

  const handleYearChange = (nuevoAnio: number) => {
    setAnio(nuevoAnio);
    setFechaDesde(`${nuevoAnio}-01-01`);
    setFechaHasta(`${nuevoAnio}-12-31`);
  };

  const handleAplicarCustom = () => {
    const lat = parseFloat(customLatInput.replace(',', '.'));
    const lng = parseFloat(customLngInput.replace(',', '.'));
    if (!isNaN(lat) && !isNaN(lng)) {
      setCustomCenter([lat, lng]);
      setZonaId('custom');
      if (alertaSimulada?.activa) {
        setAlertaSimulada(getAlertaSimulada({ ...zonaActiva, center: [lat, lng] }));
      }
    }
  };

  const handleResetFiltros = () => {
    setZonaId(ZONAS_PRECONFIGURADAS[0].id);
    setAnio(2026);
    setFechaDesde('2026-01-01');
    setFechaHasta('2026-12-31');
    setSensorFiltro('TODOS');
    setModisActivo(true);
    setViirsActivo(true);
    setCustomRadioInput('50');
    setAlertaSimulada(null);
  };

  const handleSyncLive = async () => {
    setSincronizando(true);
    setSyncToast('Consultando NASA FIRMS NRT con tu MAP_KEY…');
    try {
      const res = await syncFirmsLive(
        zonaId,
        5,
        zonaId === 'custom' ? customCenter : undefined,
        Number(customRadioInput) || 50,
      );
      if (res.ok) {
        setSyncToast(
          `Sincronización exitosa: ${res.nuevos_focos || 0} detecciones de satélites NASA incorporadas.`,
        );
        const [h, c, r] = await Promise.all([
          fetchHotspots(
            zonaId,
            anio,
            zonaId === 'custom' ? customCenter : undefined,
            Number(customRadioInput) || 50,
            fechaDesde,
            fechaHasta,
          ),
          fetchCalendar(
            zonaId,
            anio,
            zonaId === 'custom' ? customCenter : undefined,
            Number(customRadioInput) || 50,
          ),
          fetchRisk(zonaId, zonaActiva.center[0], zonaActiva.center[1]),
        ]);
        setHotspots(h);
        setCalendar(c);
        setRisk(r);
      } else {
        setSyncToast(res.mensaje || 'Aviso en sincronización');
      }
    } catch {
      setSyncToast('No se pudo conectar con NASA FIRMS NRT.');
    } finally {
      setSincronizando(false);
      setTimeout(() => setSyncToast(null), 6000);
    }
  };

  const handleToggleGeolocalizacion = () => {
    if (!activarUbicacion && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setCustomCenter(coords);
          setZonaId('custom');
          setActivarUbicacion(true);
        },
        () => {
          setActivarUbicacion(false);
        },
      );
    } else {
      setActivarUbicacion(false);
    }
  };

  const handleToggleSimulacionAlerta = () => {
    if (alertaSimulada?.activa) {
      setAlertaSimulada(null);
    } else {
      const alerta = getAlertaSimulada(zonaActiva, escenarioAlerta);
      setAlertaSimulada(alerta);
      // Envío automático de los 3 correos por rol al correo martasvinet@gmail.com
      dispatchAllRolesAlert({
        email: 'martasvinet@gmail.com',
        id_celda: alerta.id_celda,
        frp_mw: alerta.frp_mw,
        lugar: lugarActivoTexto,
        escenario: escenarioAlerta,
      });
    }
  };

  const handleCambiarEscenarioAlerta = (escenario: TipoEscenarioAlerta) => {
    setEscenarioAlerta(escenario);
    const alerta = getAlertaSimulada(zonaActiva, escenario);
    setAlertaSimulada(alerta);
    // Envío automático de los 3 correos por rol para el nuevo escenario
    dispatchAllRolesAlert({
      email: 'martasvinet@gmail.com',
      id_celda: alerta.id_celda,
      frp_mw: alerta.frp_mw,
      lugar: lugarActivoTexto,
      escenario: escenario,
    });
  };

  // Filtrado de puntos según sensores activos
  const puntos = useMemo(() => {
    return hotspots.puntos_armonizados.filter((p) => {
      const matchModis = modisActivo && p.sensores.includes('MODIS');
      const matchViirs = viirsActivo && p.sensores.includes('VIIRS');
      const matchSensorGlobal = matchModis || matchViirs || (modisActivo && viirsActivo);
      const matchSensorFiltro = sensorFiltro === 'TODOS' || p.sensores.includes(sensorFiltro);
      const matchFecha =
        (!fechaDesde || p.fecha >= fechaDesde) && (!fechaHasta || p.fecha <= fechaHasta);
      return matchSensorGlobal && matchSensorFiltro && matchFecha;
    });
  }, [hotspots, modisActivo, viirsActivo, sensorFiltro, fechaDesde, fechaHasta]);

  // Focos crudos desagregados
  const focos = useMemo(
    () =>
      generarFocosCrudos(puntos).filter(
        (f) =>
          (f.sensor === 'MODIS' && modisActivo) || (f.sensor === 'VIIRS' && viirsActivo),
      ),
    [puntos, modisActivo, viirsActivo],
  );

  const vistaCrudos = vista === 'crudos';
  const riesgoForma = risk.nivel_riesgo === 'EXTREMO' ? 'EXTREMO' : risk.nivel_riesgo === 'ALTO' ? 'ALTO' : 'MODERADO';

  return (
    <div className="min-h-screen bg-[#0B0C10] text-white flex flex-col font-sans">
      {/* 1. CABECERA PRINCIPAL VESTAPP (Con llama roja + tabs + botones de diseño) */}
      <HeaderNav
        onToggleBuscar={() => {
          setBuscarModalAbierto(!buscarModalAbierto);
          setNavegacionPopoverAbierto(false);
          setAjustesPopoverAbierto(false);
        }}
        buscarAbierto={buscarModalAbierto}
        onToggleNavegacion={() => {
          setNavegacionPopoverAbierto(!navegacionPopoverAbierto);
          setBuscarModalAbierto(false);
          setAjustesPopoverAbierto(false);
        }}
        navegacionAbierta={navegacionPopoverAbierto}
        onToggleAjustes={() => {
          setAjustesPopoverAbierto(!ajustesPopoverAbierto);
          setBuscarModalAbierto(false);
          setNavegacionPopoverAbierto(false);
        }}
        ajustesAbiertos={ajustesPopoverAbierto}
        claro={claro}
        setClaro={setClaro}
        daltonico={daltonico}
        setDaltonico={setDaltonico}
        textoGrande={textoGrande}
        setTextoGrande={setTextoGrande}
        altoContraste={altoContraste}
        setAltoContraste={setAltoContraste}
        reducirMovimiento={reducirMovimiento}
        setReducirMovimiento={setReducirMovimiento}
      />

      {/* BANNER DE SINCRONIZACIÓN LIVE FIRMS NRT */}
      {syncToast && (
        <div
          role="status"
          aria-live="polite"
          className="bg-cyan-950 border-b border-cyan-400/50 px-4 py-2 text-xs text-cyan-200 transition text-center font-mono"
        >
          {syncToast}
        </div>
      )}

      {/* 2. NAVEGACIÓN PRINCIPAL POR LAS 3 PESTAÑAS OPERATIVAS DE LA NASA */}
      <nav
        aria-label="Flujos de trabajo operativos de FireReady"
        className="bg-[#141B22] border-b border-[#2D3B48] px-4 sticky top-0 z-20 shadow-md"
      >
        <div className="mx-auto max-w-[1600px] flex flex-wrap items-center justify-between gap-2">
          {/* Las 3 Pestañas Centrales */}
          <div className="flex gap-2">
            {/* Pestaña 1 */}
            <button
              type="button"
              role="tab"
              aria-selected={tabActiva === 'tactico'}
              aria-controls="panel-tactico"
              id="tab-tactico"
              onClick={() => setTabActiva('tactico')}
              className={`flex items-center gap-2.5 px-5 py-3 text-sm font-bold border-b-2 transition -mb-px ${FOCUS} ${
                tabActiva === 'tactico'
                  ? 'border-rose-500 text-white bg-[#1F2833]/80'
                  : 'border-transparent text-[#8C9BAA] hover:text-white hover:bg-[#1F2833]/40'
              }`}
            >
              <Activity className="w-4 h-4 text-rose-500" aria-hidden="true" />
              <span>{claro ? '1. Mapa de Calor & Alerta Temprana (72 Semanas)' : '1. Monitoreo Táctico & Predicción IA (72 Semanas)'}</span>
            </button>

            {/* Pestaña 2 */}
            <button
              type="button"
              role="tab"
              aria-selected={tabActiva === 'calendario'}
              aria-controls="panel-calendario"
              id="tab-calendario"
              onClick={() => setTabActiva('calendario')}
              className={`flex items-center gap-2.5 px-5 py-3 text-sm font-bold border-b-2 transition -mb-px ${FOCUS} ${
                tabActiva === 'calendario'
                  ? 'border-amber-400 text-white bg-[#1F2833]/80'
                  : 'border-transparent text-[#8C9BAA] hover:text-white hover:bg-[#1F2833]/40'
              }`}
            >
              <CalendarIcon className="w-4 h-4 text-amber-400" aria-hidden="true" />
              <span>{claro ? '2. Calendario de Incendios Histórico (2000–2026)' : '2. Calendario Diario Histórico 26 Años (2000–2026)'}</span>
            </button>

            {/* Pestaña 3 */}
            <button
              type="button"
              role="tab"
              aria-selected={tabActiva === 'datos'}
              aria-controls="panel-datos"
              id="tab-datos"
              onClick={() => setTabActiva('datos')}
              className={`flex items-center gap-2.5 px-5 py-3 text-sm font-bold border-b-2 transition -mb-px ${FOCUS} ${
                tabActiva === 'datos'
                  ? 'border-cyan-400 text-white bg-[#1F2833]/80'
                  : 'border-transparent text-[#8C9BAA] hover:text-white hover:bg-[#1F2833]/40'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-cyan-400" aria-hidden="true" />
              <span>{claro ? '3. Descarga de Datos (Excel y Planillas)' : '3. Datos Satelitales Consolidados & Exportación CSV'}</span>
            </button>
          </div>

          {/* Botón directo de Avisos Preventivos a la derecha de la barra */}
          <button
            type="button"
            onClick={() => setModalAvisos(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow-md shadow-rose-950/50"
          >
            <BellRing className="w-3.5 h-3.5" />
            <span>{claro ? 'Recibir Alertas en mi Correo' : 'Recibir Avisos Preventivos'}</span>
          </button>
        </div>
      </nav>

      {/* 3. BARRA GEOESPACIAL DE CONTROL GLOBAL (Zona, Año, Sincronización) */}
      <GeospatialBar
        zonaId={zonaId}
        setZonaId={setZonaId}
        zonaActiva={zonaActiva}
        customLatInput={customLatInput}
        setCustomLatInput={setCustomLatInput}
        customLngInput={customLngInput}
        setCustomLngInput={setCustomLngInput}
        customRadioInput={customRadioInput}
        setCustomRadioInput={setCustomRadioInput}
        onAplicarCustom={handleAplicarCustom}
        fechaDesde={fechaDesde}
        setFechaDesde={setFechaDesde}
        fechaHasta={fechaHasta}
        setFechaHasta={setFechaHasta}
        anio={anio}
        onYearChange={handleYearChange}
        onResetFiltros={handleResetFiltros}
        onSyncLive={handleSyncLive}
        sincronizando={sincronizando}
        claro={claro}
      />

      {/* 4. CONTENIDO PRINCIPAL SEGÚN PESTAÑA */}
      <main id="contenido-flujo" className="mx-auto max-w-[1600px] w-full px-4 py-6 flex-1 space-y-6">
        {/* PESTAÑA 1: MONITOREO TÁCTICO & PREDICCIÓN IA (Con el gráfico a 72 semanas visible) */}
        {tabActiva === 'tactico' && (
          <div
            id="panel-tactico"
            role="tabpanel"
            aria-labelledby="tab-tactico"
            tabIndex={0}
            className={`space-y-6 outline-none ${FOCUS}`}
          >
            {/* BANNER DE ALERTA SATELITAL EN VIVO (Si está simulada) */}
            {alertaSimulada?.activa && (
              <div id="banner-alerta-activa">
                <LiveAlertBanner
                  alerta={alertaSimulada}
                  onDesactivar={() => setAlertaSimulada(null)}
                  lugarActivoTexto={lugarActivoTexto}
                  escenarioActivo={escenarioAlerta}
                  onCambiarEscenario={handleCambiarEscenarioAlerta}
                />
              </div>
            )}

            {/* Barra de herramientas táctica: Lugar Activo + Botón Simulador de Alerta en Vivo */}
            <div className="rounded-xl border border-[#2D3B48] bg-[#141B22] p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2 text-xs">
                <Compass className="w-4 h-4 text-cyan-300" aria-hidden="true" />
                <span className="text-[#8C9BAA]">Monitoreo táctico para:</span>
                <strong className="text-white font-mono text-sm">{lugarActivoTexto}</strong>
              </div>

              {/* Botón Simulador de Alerta Satelital en Vivo para demostración */}
              <button
                type="button"
                onClick={handleToggleSimulacionAlerta}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition shadow-md ${
                  alertaSimulada?.activa
                    ? 'bg-rose-600 text-white hover:bg-rose-500'
                    : 'bg-gradient-to-r from-amber-600 to-rose-700 hover:from-amber-500 hover:to-rose-600 text-white'
                } ${FOCUS}`}
              >
                <Zap className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t.btnAlerta(Boolean(alertaSimulada?.activa))}</span>
              </button>
            </div>

            {/* Fila superior: Las 4 Tarjetas KPI */}
            <section
              aria-label={`Indicadores tácticos para ${lugarActivoTexto}`}
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            >
              <KpiCard
                icon={<Satellite className="w-5 h-5 text-cyan-300" />}
                label={t.focos}
                value={hotspots.focos_brutos_totales.toLocaleString('es-CL')}
                sub={t.focosSub(hotspots.focos_modis_brutos, hotspots.focos_viirs_brutos)}
                lugar={zonaActiva.nombre}
              />
              <KpiCard
                icon={<Layers className="w-5 h-5 text-cyan-300" />}
                label={t.celdas}
                value={hotspots.celdas_armonizadas_1km.toLocaleString('es-CL')}
                sub={t.celdasSub}
                lugar={zonaActiva.nombre}
              />
              <KpiCard
                icon={<Sparkles className="w-5 h-5 text-emerald-400" />}
                label={t.duplicados}
                value={`${hotspots.duplicados_eliminados_pct.toFixed(2)}%`}
                sub={t.duplicadosSub}
                lugar={zonaActiva.nombre}
              />
              <KpiCard
                icon={<Flame className="w-5 h-5 text-rose-500" />}
                label={t.riesgo}
                value={
                  <span className="inline-flex items-center gap-2 text-rose-400">
                    <span dangerouslySetInnerHTML={{ __html: intensitySvg(riesgoForma, pal.fill[riesgoForma], 22) }} />
                    <span>{risk.nivel_riesgo}</span>
                  </span>
                }
                sub={t.riesgoSub(risk.probabilidad_incendio_pct)}
                lugar={zonaActiva.nombre}
              />
            </section>

            {/* Grid Principal 70% / 30%: Mapa a la izquierda + Asistente de Riesgo IA (con 72 semanas) a la derecha */}
            <section className="grid gap-6 lg:grid-cols-12">
              {/* Izquierda (aprox 70%): Visor Geoespacial + Gráfico Mensual */}
              <div id="mapa-contenedor" className="lg:col-span-8 min-w-0 space-y-6">
                <div className="rounded-2xl border border-[#2D3B48] bg-[#141B22] overflow-hidden shadow-xl">
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-[#2D3B48]">
                    <div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-cyan-300" aria-hidden="true" />
                        <h2 className="font-semibold text-white text-sm">{t.mapaTitulo}</h2>
                      </div>
                      <div className="text-[11px] text-[#8C9BAA] font-mono mt-0.5">
                        {lugarActivoTexto}
                      </div>
                    </div>

                    {/* Switch: Celdas Armonizadas vs Focos Crudos */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-white">Vista:</span>
                      <button
                        role="switch"
                        aria-checked={vistaCrudos}
                        aria-label="Alternar vista entre celdas armonizadas y focos crudos dispersos"
                        onClick={() => setVista(vistaCrudos ? 'celdas' : 'crudos')}
                        className={`flex items-center gap-1.5 rounded-full border border-[#8C9BAA]/40 bg-[#0B0C10] px-2 py-1 ${FOCUS}`}
                      >
                        <span
                          className={`rounded-full px-2.5 py-0.5 transition ${
                            !vistaCrudos ? 'bg-cyan-800 text-white font-semibold' : 'text-[#8C9BAA]'
                          }`}
                        >
                          {t.mapaVistaCeldas}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 transition ${
                            vistaCrudos ? 'bg-cyan-800 text-white font-semibold' : 'text-[#8C9BAA]'
                          }`}
                        >
                          {t.mapaVistaFocos}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Contenedor del mapa interactivo con anillos de calor concéntricos */}
                  <div className="relative isolate">
                    <FireMap
                      zona={zonaActiva}
                      puntos={puntos}
                      focos={focos}
                      vista={vista}
                      pal={pal}
                      claro={claro}
                      alertaSimulada={alertaSimulada}
                      className="h-[30rem] w-full"
                    />

                    {/* Burbuja informativa flotante en el mapa */}
                    <div
                      className="absolute top-3 left-14 z-[500] rounded-lg bg-[#141B22]/95 border border-[#2D3B48] px-3 py-2 text-xs shadow-xl"
                      role="status"
                    >
                      {vistaCrudos ? (
                        <>
                          <strong className="text-cyan-300 text-sm">
                            {(hotspots.focos_brutos_totales || focos.length).toLocaleString('es-CL')}
                          </strong>{' '}
                          {claro ? 'detecciones crudas' : 'focos satelitales dispersos'} →{' '}
                          <strong className="text-white text-sm">
                            {(hotspots.celdas_armonizadas_1km || puntos.length).toLocaleString('es-CL')}
                          </strong>{' '}
                          celdas consolidadas (1 km)
                        </>
                      ) : (
                        <>
                          <strong className="text-cyan-300 text-sm">
                            {(puntos.length || hotspots.celdas_armonizadas_1km).toLocaleString('es-CL')}
                          </strong>{' '}
                          {claro ? 'zonas monitoreadas' : 'celdas armonizadas de 1 km'}{' '}
                          <span className="text-[#8C9BAA]">
                            (de {(hotspots.focos_brutos_totales || focos.length).toLocaleString('es-CL')} detecciones)
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Pie del mapa */}
                  <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-t border-[#2D3B48] bg-[#0B0F14] text-[11px] text-[#8C9BAA]">
                    <span>
                      Centro: {zonaActiva.center[0].toFixed(2)}°, {zonaActiva.center[1].toFixed(2)}° · Bbox: [
                      {zonaActiva.bbox.join(', ')}]
                    </span>
                    <span>{t.mapaPie}</span>
                  </div>
                </div>
              </div>

              {/* Derecha (aprox 30%): Predicción Preventiva de Riesgo IA (Con 72 Semanas) */}
              <div id="panel-riesgo-ia" className="lg:col-span-4 min-w-0">
                <RiskAssistant
                  risk={risk}
                  pal={pal}
                  claro={claro}
                  onOpenSubscribe={() => setModalAvisos(true)}
                  lugarActivoTexto={lugarActivoTexto}
                  zonaId={zonaId}
                  customCenter={zonaId === 'custom' ? customCenter : undefined}
                  radioKm={Number(customRadioInput) || 50}
                  vistaForzada={vistaForzadaRisk}
                />
              </div>
            </section>
          </div>
        )}

        {/* PESTAÑA 2: CALENDARIO DIARIO HISTÓRICO 26 AÑOS (2000–2026) */}
        {tabActiva === 'calendario' && (
          <div
            id="panel-calendario"
            role="tabpanel"
            aria-labelledby="tab-calendario"
            tabIndex={0}
            className={`space-y-6 outline-none ${FOCUS}`}
          >
            <BurningCalendar
              zonaId={zonaId}
              center={customCenter}
              radioKm={Number(customRadioInput) || 50}
              anio={anio}
              setAnio={setAnio}
              pal={pal}
              daltonico={daltonico}
              claro={claro}
              lugarActivoTexto={lugarActivoTexto}
            />
          </div>
        )}

        {/* PESTAÑA 3: DATOS SATELITALES CONSOLIDADOS & EXPORTACIÓN CSV */}
        {tabActiva === 'datos' && (
          <div
            id="panel-datos"
            role="tabpanel"
            aria-labelledby="tab-datos"
            tabIndex={0}
            className={`space-y-6 outline-none ${FOCUS}`}
          >
            <DataTableTab
              puntos={puntos}
              sensorFiltro={sensorFiltro}
              setSensorFiltro={setSensorFiltro}
              pal={pal}
              claro={claro}
              totalSinFiltro={hotspots.puntos_armonizados.length}
              zonaActiva={zonaActiva}
              lugarActivoTexto={lugarActivoTexto}
              fechaDesde={fechaDesde}
              setFechaDesde={setFechaDesde}
              fechaHasta={fechaHasta}
              setFechaHasta={setFechaHasta}
            />
          </div>
        )}
      </main>

      {/* MODAL COORDENADAS PERSONALIZADAS (Imagen 1) */}
      <CoordenadasModal
        abierto={buscarModalAbierto}
        onCerrar={() => setBuscarModalAbierto(false)}
        zona={zonaActiva}
        radioKm={Number(customRadioInput) || 50}
        anio={anio}
        onAplicar={({ lat, lng, radio, fechaDesde: fd, fechaHasta: fh, actualizarSatelites }) => {
          setCustomCenter([lat, lng]);
          setZonaId('custom');
          setCustomRadioInput(String(radio));
          if (fd && fh) {
            setFechaDesde(fd);
            setFechaHasta(fh);
          }
          if (actualizarSatelites) {
            handleSyncLive();
          }
        }}
        onSyncLiveFirms={handleSyncLive}
        sincronizando={sincronizando}
      />

      {/* POPOVER FILTRO DE DATOS (Capas satelitales NASA) */}
      <FiltroDatosPopover
        abierto={navegacionPopoverAbierto}
        onCerrar={() => setNavegacionPopoverAbierto(false)}
        modisActivo={modisActivo}
        setModisActivo={setModisActivo}
        viirsActivo={viirsActivo}
        setViirsActivo={setViirsActivo}
        vientoActivo={vientoActivo}
        setVientoActivo={setVientoActivo}
        prediccionActiva={prediccionActiva}
        setPrediccionActiva={setPrediccionActiva}
        rangoAnios={rangoAnios}
        setRangoAnios={setRangoAnios}
      />

      {/* POPOVER PREFERENCIAS (Accesibilidad, Geolocalización y Escala) */}
      <PreferenciasPopover
        abierto={ajustesPopoverAbierto}
        onCerrar={() => setAjustesPopoverAbierto(false)}
        paletaAccesible={daltonico}
        setPaletaAccesible={setDaltonico}
        lenguajeTecnico={!claro}
        setLenguajeTecnico={(val) => setClaro(!val)}
        activarUbicacion={activarUbicacion}
        onToggleUbicacion={handleToggleGeolocalizacion}
        tamanioTexto={tamanioTexto}
        setTamanioTexto={setTamanioTexto}
        altoContraste={altoContraste}
        setAltoContraste={setAltoContraste}
        reducirMovimiento={reducirMovimiento}
        setReducirMovimiento={setReducirMovimiento}
      />

      {/* MODAL DE SUSCRIPCIÓN Y DESPACHO REAL DE ALERTAS VÍA SMTP */}
      <SubscribeModal
        open={modalAvisos}
        onClose={() => {
          setModalAvisos(false);
          setAutoSimularDespachoDemo(false);
        }}
        zonaInicial={zonaId}
        autoSimularDemo={autoSimularDespachoDemo}
      />
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  lugar,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub: string;
  lugar?: string;
}) {
  return (
    <div className="rounded-xl border border-[#2D3B48] bg-[#141B22] p-4 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between text-xs text-[#8C9BAA] mb-1">
          <div className="flex items-center gap-1.5">
            {icon}
            <span>{label}</span>
          </div>
          {lugar && <span className="font-mono text-[10px] text-cyan-300">{lugar}</span>}
        </div>
        <div className="text-2xl font-bold mt-1 text-white">{value}</div>
      </div>
      <div className="text-xs text-[#8C9BAA] mt-2 pt-1 border-t border-[#2D3B48]/60">{sub}</div>
    </div>
  );
}
