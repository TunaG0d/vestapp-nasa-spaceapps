export interface Zona {
  id: string;
  nombre: string;
  center: [number, number];
  bbox: [number, number, number, number];
  radio_km?: number;
}

export type Intensidad = 'EXTREMO' | 'ALTO' | 'MODERADO';
export type Sensor = 'MODIS' | 'VIIRS';

export interface PuntoArmonizado {
  id_celda: string;
  lat: number;
  lng: number;
  fecha: string;
  frp_max: number;
  detecciones_agrupadas: number;
  sensores: Sensor[];
  nivel_intensidad: Intensidad;
  satelite_pasada?: string;
}

export interface HotspotsResponse {
  focos_brutos_totales: number;
  focos_modis_brutos: number;
  focos_viirs_brutos: number;
  celdas_armonizadas_1km: number;
  duplicados_eliminados_pct: number;
  puntos_armonizados: PuntoArmonizado[];
}

export interface CalendarMes {
  mes: string;
  historico: number;
  promedio_historico: number;
  mediana_historica: number;
  actual: number;
  anomalia: boolean;
}

export interface DiaCalendarioData {
  fecha: string; // YYYY-MM-DD
  dia_del_anio: number; // 1 - 365
  mes_idx: number; // 0 - 11
  mes_nombre: string;
  dia_del_mes: number;
  semana_del_anio: number;
  dia_de_la_semana: number; // 0 = Dom, 1 = Lun...
  celdas_armonizadas: number;
  mediana_historica_diaria: number;
  diferencia_pct: number;
  anomalia: boolean;
  nivel: 'BAJA' | 'MODERADO' | 'ALTO' | 'CRITICA';
  frp_max_dia: number;
  sensores_activos: string;
  evento_historico?: string;
}

export interface ProyeccionSemanal72 {
  semana: number; // 1 a 72
  fecha_inicio: string; // e.g. "Semana 12 (Feb 2027)"
  riesgo_estimado_pct: number;
  celdas_proyectadas: number;
  es_ventana_critica: boolean;
  tipo_ventana?: 'PREVENCION_CORTAFUEGOS' | 'MAXIMO_RIESGO_IGNICION' | 'VENTANA_VEDA_QUEMAS';
  fase_estacional: string;
  recomendacion_land_managers: string;
  recomendacion_municipios: string;
}

export interface AlertaSimuladaData {
  activa: boolean;
  id_celda: string;
  lat: number;
  lng: number;
  hora_deteccion: string;
  satelites: string;
  frp_mw: number;
  nivel: Intensidad;
  detecciones: number;
  avisos_por_rol: {
    vecino: {
      asunto: string;
      cuerpo: string;
      accion_recomendada: string;
    };
    agricultor: {
      asunto: string;
      cuerpo: string;
      accion_recomendada: string;
    };
    brigadista: {
      asunto: string;
      cuerpo: string;
      accion_recomendada: string;
    };
  };
}

export interface RiskResponse {
  nivel_riesgo: 'BAJO' | 'MODERADO' | 'ALTO' | 'EXTREMO';
  probabilidad_incendio_pct: number;
  anomalia_termica_previa: string;
  temperatura_c: number;
  humedad_relativa_pct: number;
  viento_kmh: number;
  mensaje_accion: string;
}

export const ZONAS_PRECONFIGURADAS: Zona[] = [
  { id: 'chile_centro_sur', nombre: 'Chile Centro-Sur', center: [-36.8, -72.2], bbox: [-73.8, -38.5, -70.5, -32.5], radio_km: 50 },
  { id: 'california', nombre: 'California, EE. UU.', center: [37.2, -119.5], bbox: [-124.4, 32.5, -114.1, 42.0], radio_km: 75 },
  { id: 'amazonas', nombre: 'Amazonas (Brasil/Bolivia)', center: [-10.0, -60.0], bbox: [-65.0, -15.0, -55.0, -5.0], radio_km: 100 },
];

export function getAreaActivaTexto(zona: Zona, radioKm = 50): string {
  const r = zona.radio_km || radioKm;
  return `Área activa: ${zona.nombre} (${zona.center[0].toFixed(2)}°, ${zona.center[1].toFixed(2)}° | Radio ${r} km)`;
}

export const MOCK_HOTSPOTS: HotspotsResponse = {
  focos_brutos_totales: 4820,
  focos_modis_brutos: 1140,
  focos_viirs_brutos: 3680,
  celdas_armonizadas_1km: 1590,
  duplicados_eliminados_pct: 67.01,
  puntos_armonizados: [
    { id_celda: 'CL-1KM-36821-72190', lat: -36.82, lng: -72.19, fecha: '2025-02-04', frp_max: 312.4, detecciones_agrupadas: 14, sensores: ['MODIS', 'VIIRS'], nivel_intensidad: 'EXTREMO', satelite_pasada: 'NOAA-20 VIIRS (13:42 UTC) + Aqua MODIS (14:15 UTC)' },
    { id_celda: 'CL-1KM-37104-72455', lat: -37.10, lng: -72.46, fecha: '2025-02-04', frp_max: 248.9, detecciones_agrupadas: 11, sensores: ['MODIS', 'VIIRS'], nivel_intensidad: 'EXTREMO', satelite_pasada: 'Suomi-NPP VIIRS (01:20 UTC) + Terra MODIS (10:50 UTC)' },
    { id_celda: 'CL-1KM-36540-71980', lat: -36.54, lng: -71.98, fecha: '2025-02-03', frp_max: 143.7, detecciones_agrupadas: 7, sensores: ['VIIRS'], nivel_intensidad: 'ALTO', satelite_pasada: 'NOAA-21 VIIRS (14:02 UTC)' },
    { id_celda: 'CL-1KM-37420-72810', lat: -37.42, lng: -72.81, fecha: '2025-02-03', frp_max: 96.2, detecciones_agrupadas: 5, sensores: ['MODIS', 'VIIRS'], nivel_intensidad: 'ALTO', satelite_pasada: 'Aqua MODIS + Suomi-NPP VIIRS' },
    { id_celda: 'CL-1KM-35980-72340', lat: -35.98, lng: -72.34, fecha: '2025-01-28', frp_max: 41.8, detecciones_agrupadas: 3, sensores: ['VIIRS'], nivel_intensidad: 'MODERADO', satelite_pasada: 'NOAA-20 VIIRS (02:10 UTC)' },
    { id_celda: 'CL-1KM-36210-71620', lat: -36.21, lng: -71.62, fecha: '2025-01-15', frp_max: 28.5, detecciones_agrupadas: 2, sensores: ['MODIS'], nivel_intensidad: 'MODERADO', satelite_pasada: 'Terra MODIS (11:05 UTC)' },
    { id_celda: 'CL-1KM-36700-72050', lat: -36.70, lng: -72.05, fecha: '2025-03-12', frp_max: 75.3, detecciones_agrupadas: 4, sensores: ['VIIRS'], nivel_intensidad: 'MODERADO', satelite_pasada: 'Suomi-NPP VIIRS (13:18 UTC)' },
    { id_celda: 'CL-1KM-37250-72600', lat: -37.25, lng: -72.60, fecha: '2025-11-20', frp_max: 182.1, detecciones_agrupadas: 9, sensores: ['MODIS', 'VIIRS'], nivel_intensidad: 'ALTO', satelite_pasada: 'NOAA-20 VIIRS + Aqua MODIS' },
  ],
};

export const MOCK_CALENDAR: CalendarMes[] = [
  { mes: 'Ene', historico: 540, promedio_historico: 540, mediana_historica: 490, actual: 610, anomalia: false },
  { mes: 'Feb', historico: 680, promedio_historico: 680, mediana_historica: 580, actual: 3890, anomalia: true },
  { mes: 'Mar', historico: 520, promedio_historico: 520, mediana_historica: 470, actual: 560, anomalia: false },
  { mes: 'Abr', historico: 210, promedio_historico: 210, mediana_historica: 180, actual: 190, anomalia: false },
  { mes: 'May', historico: 90, promedio_historico: 90, mediana_historica: 75, actual: 110, anomalia: false },
  { mes: 'Jun', historico: 40, promedio_historico: 40, mediana_historica: 30, actual: 35, anomalia: false },
  { mes: 'Jul', historico: 35, promedio_historico: 35, mediana_historica: 25, actual: 42, anomalia: false },
  { mes: 'Ago', historico: 60, promedio_historico: 60, mediana_historica: 50, actual: 58, anomalia: false },
  { mes: 'Sep', historico: 110, promedio_historico: 110, mediana_historica: 95, actual: 125, anomalia: false },
  { mes: 'Oct', historico: 190, promedio_historico: 190, mediana_historica: 170, actual: 210, anomalia: false },
  { mes: 'Nov', historico: 320, promedio_historico: 320, mediana_historica: 260, actual: 590, anomalia: true },
  { mes: 'Dic', historico: 450, promedio_historico: 450, mediana_historica: 390, actual: 470, anomalia: false },
];

export const MOCK_RISK: RiskResponse = {
  nivel_riesgo: 'ALTO',
  probabilidad_incendio_pct: 78.4,
  anomalia_termica_previa: '14 celdas activas en últimos 7 días (persistencia 1 km)',
  temperatura_c: 33.5,
  humedad_relativa_pct: 21.0,
  viento_kmh: 38.2,
  mensaje_accion:
    'Condiciones críticas de ignición: sequedad vegetal acumulada y factor 30-30-30 en la zona de interfaz.',
};

export const ANIOS_DISPONIBLES = [
  2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010,
  2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021,
  2022, 2023, 2024, 2025, 2026,
] as const;

const PREFIJOS: Record<string, string> = { chile_centro_sur: 'CL', california: 'CA', amazonas: 'AM', custom: 'US' };

export function getMockHotspots(zonaId: string, anio = 2025, customCenter?: [number, number]): HotspotsResponse {
  const base = ZONAS_PRECONFIGURADAS[0].center;
  let center = ZONAS_PRECONFIGURADAS.find((z) => z.id === zonaId)?.center ?? base;
  if (zonaId === 'custom' && customCenter) {
    center = customCenter;
  }
  const prefijo = PREFIJOS[zonaId] ?? 'US';
  return {
    ...MOCK_HOTSPOTS,
    puntos_armonizados: MOCK_HOTSPOTS.puntos_armonizados.map((p) => ({
      ...p,
      id_celda: p.id_celda.replace(/^CL/, prefijo),
      lat: +(center[0] + (p.lat - base[0])).toFixed(3),
      lng: +(center[1] + (p.lng - base[1])).toFixed(3),
      fecha: `${anio}${p.fecha.slice(4)}`,
    })),
  };
}

export function getMockCalendar(anio = 2025): CalendarMes[] {
  if (anio === 2025) return MOCK_CALENDAR;
  const factor = anio === 2017 ? 2.8 : anio === 2023 ? 2.1 : anio === 2024 ? 1.6 : 0.85 + ((anio * 13) % 40) / 100;
  return MOCK_CALENDAR.map((m, i) => {
    const actual = anio === 2026 && i >= 3 ? 0 : Math.round(m.actual * factor);
    return {
      ...m,
      actual,
      anomalia: actual >= m.promedio_historico * 1.5,
    };
  });
}

/** Genera los 365 días del año con cálculo de mediana histórica diaria (2000-2025). */
export function getMockCalendarioDiario(anio: number): DiaCalendarioData[] {
  const diasPorMes = [31, anio % 4 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const dias: DiaCalendarioData[] = [];
  let diaAnio = 1;

  const esPicoHistorico = anio === 2017 || anio === 2023 || anio === 2024;

  for (let m = 0; m < 12; m++) {
    for (let d = 1; d <= diasPorMes[m]; d++) {
      const fechaStr = `${anio}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const fechaObj = new Date(anio, m, d);
      const diaSem = fechaObj.getDay(); // 0 Dom, 6 Sab
      const semAnio = Math.min(52, Math.ceil(diaAnio / 7));

      // Mediana diaria de referencia multianual (2000-2025)
      // En verano (meses 0, 1, 2) la mediana es ~25-75 celdas; en invierno ~2-8 celdas.
      let mediana = 5;
      if (m === 0) mediana = 42;
      else if (m === 1) mediana = 71;
      else if (m === 2) mediana = 38;
      else if (m === 3) mediana = 15;
      else if (m >= 4 && m <= 8) mediana = 4;
      else if (m === 9) mediana = 18;
      else if (m === 10) mediana = 32;
      else if (m === 11) mediana = 39;

      let celdas = Math.max(0, Math.round(mediana * (0.6 + ((d * 7 + m * 11) % 80) / 100)));

      // Inyectar picos emblemáticos
      let evento: string | undefined = undefined;
      if (anio === 2023 && m === 1 && d === 14) {
        celdas = 412;
        evento = 'Tormenta de Fuego Centro-Sur (Peak crítico en Biobío/Ñuble, 412 celdas activas con viento puelche)';
      } else if (anio === 2017 && m === 0 && d === 26) {
        celdas = 635;
        evento = 'Mega-incendio histórico de Las Máquinas y Empedrado (635 celdas activas en 24h)';
      } else if (anio === 2024 && m === 1 && d === 2) {
        celdas = 310;
        evento = 'Incendios de interfaz en Viña del Mar / Valparaíso (310 celdas activas en interfaz urbano-forestal)';
      } else if (esPicoHistorico && m === 1 && d >= 10 && d <= 18) {
        celdas = Math.round(mediana * 3.8);
      }

      // Si es 2026 y estamos después de marzo, celdas = 0 (año en curso)
      if (anio === 2026 && m >= 3) {
        celdas = 0;
      }

      const diffPct = mediana > 0 ? Math.round(((celdas - mediana) / mediana) * 100) : 0;
      const esAnomalia = celdas >= mediana * 1.5 && celdas > 25;

      let nivel: 'BAJA' | 'MODERADO' | 'ALTO' | 'CRITICA' = 'BAJA';
      if (celdas >= 180) nivel = 'CRITICA';
      else if (celdas >= 60) nivel = 'ALTO';
      else if (celdas >= 20) nivel = 'MODERADO';

      dias.push({
        fecha: fechaStr,
        dia_del_anio: diaAnio,
        mes_idx: m,
        mes_nombre: nombresMeses[m],
        dia_del_mes: d,
        semana_del_anio: semAnio,
        dia_de_la_semana: diaSem,
        celdas_armonizadas: celdas,
        mediana_historica_diaria: mediana,
        diferencia_pct: diffPct,
        anomalia: esAnomalia,
        nivel,
        frp_max_dia: celdas > 0 ? Math.round(18 + celdas * 0.95) : 0,
        sensores_activos: celdas > 50 ? 'VIIRS 375m + MODIS 1km' : 'VIIRS 375m',
        evento_historico: evento,
      });

      diaAnio++;
    }
  }

  return dias;
}

/** Genera proyección estacional de 72 semanas (~17 meses) para gestores de tierras y municipios. */
export function getMockProyeccion72Semanas(): ProyeccionSemanal72[] {
  const semanas: ProyeccionSemanal72[] = [];
  const fechaBase = new Date(2026, 10, 15); // Nov 2026

  for (let s = 1; s <= 72; s++) {
    const f = new Date(fechaBase.getTime() + (s - 1) * 7 * 24 * 3600 * 1000);
    const mes = f.getMonth();
    const anio = f.getFullYear();
    const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const label = `Semana ${s} (${nombresMeses[mes]} ${anio})`;

    // Ventanas críticas estivales:
    // Ventana 1: Enero-Febrero 2027 (Sem 8 a 15)
    // Ventana 2: Enero-Febrero 2028 (Sem 60 a 67)
    const esEstival1 = s >= 8 && s <= 15;
    const esEstival2 = s >= 60 && s <= 67;
    const esPrecursor = (s >= 3 && s <= 7) || (s >= 55 && s <= 59);

    let riesgo = 25;
    let celdas = 30;
    let esVentana = false;
    let tipoVentana: ProyeccionSemanal72['tipo_ventana'] = undefined;
    let fase = 'Baja actividad invernal/primaveral';
    let recLand = 'Mantenimiento regular de cortinas forestales y monitoreo de humedad de suelo.';
    let recMuni = 'Actualización ordinaria de planes comunales de protección civil.';

    if (esEstival1 || esEstival2) {
      riesgo = 82 + ((s * 3) % 14);
      celdas = 380 + ((s * 19) % 220);
      esVentana = true;
      tipoVentana = 'MAXIMO_RIESGO_IGNICION';
      fase = 'Peak crítico estival de ignición';
      recLand = 'Veda total de quemas de rastrojos, prohibición de maquinaria en horas peak (12:00-18:00) y activación de brigadas prediales.';
      recMuni = 'Patrullaje preventivo continuo en interfaz urbano-forestal, prohibición de accesos a quebradas secas y fiscalización de microbasurales.';
    } else if (esPrecursor) {
      riesgo = 62;
      celdas = 120;
      esVentana = true;
      tipoVentana = 'PREVENCION_CORTAFUEGOS';
      fase = 'Ventana clave de preparación de cortafuegos';
      recLand = 'Apertura y repaso de cortafuegos perimetrales libres de pasto seco antes del inicio del peak de sequedad.';
      recMuni = 'Revisión técnica de puntos de toma de agua de grifos/estanques y reuniones informativas con juntas vecinales.';
    } else if (mes >= 2 && mes <= 4) {
      riesgo = 45;
      celdas = 70;
      fase = 'Transición otoñal';
      recLand = 'Planificación controlada de residuos solo bajo autorización de CONAF/autoridad local.';
      recMuni = 'Evaluación de daños y planes de reforestación nativa con retención hídrica.';
    }

    semanas.push({
      semana: s,
      fecha_inicio: label,
      riesgo_estimado_pct: riesgo,
      celdas_proyectadas: celdas,
      es_ventana_critica: esVentana,
      tipo_ventana: tipoVentana,
      fase_estacional: fase,
      recomendacion_land_managers: recLand,
      recomendacion_municipios: recMuni,
    });
  }

  return semanas;
}

export type TipoEscenarioAlerta = 'satelital_critica' | 'meteorologica_3030' | 'anomalia_termica';

export interface EscenarioInfo {
  id: TipoEscenarioAlerta;
  nombre: string;
  badge: string;
  color: string;
  descripcion: string;
}

export const ESCENARIOS_ALERTA: EscenarioInfo[] = [
  {
    id: 'satelital_critica',
    nombre: 'Alerta Roja Satelital (FRP Extremo)',
    badge: 'FRP 420.5 MW · VIIRS+MODIS',
    color: '#FF003C',
    descripcion: 'Pasada combinada VIIRS (375 m) + MODIS (1 km) con detección de frente de fuego activo de alta severidad.',
  },
  {
    id: 'meteorologica_3030',
    nombre: 'Alerta Amarilla Meteorológica (Regla 30-30-30)',
    badge: '34.5°C · HR 18% · Viento 36 km/h',
    color: '#FF6B00',
    descripcion: 'Peligro extremo de propagación rápida. Temperatura >30°C, humedad <30% y viento >30 km/h.',
  },
  {
    id: 'anomalia_termica',
    nombre: 'Alerta Naranja Preventiva (Persistencia +3.4σ)',
    badge: '+3.4σ sobre mediana histórica',
    color: '#E69F00',
    descripcion: 'Acumulación reiterada de calor térmico anómalo en zona de interfaz habitada durante los últimos 7 días.',
  },
];

export function getAlertaSimulada(
  zona: Zona,
  tipo: TipoEscenarioAlerta = 'satelital_critica',
): AlertaSimuladaData {
  const lat = +(zona.center[0] + 0.022).toFixed(3);
  const lng = +(zona.center[1] - 0.018).toFixed(3);
  const celdaId = `CL-ALERT-1KM-${Math.abs(Math.round(lat * 1000))}-${Math.abs(Math.round(lng * 1000))}`;

  if (tipo === 'meteorologica_3030') {
    return {
      activa: true,
      id_celda: celdaId,
      lat,
      lng,
      hora_deteccion: 'Alerta en curso · Telemetría Meteorológica Superficial y Satélite',
      satelites: 'Estación Meteorológica Local + Pronóstico Satelital Open-Meteo',
      frp_mw: 95.0,
      nivel: 'ALTO',
      detecciones: 3,
      avisos_por_rol: {
        vecino: {
          asunto: `[FireReady Aviso Crítico] Peligro Extremo de Ignición en ${zona.nombre} (Regla 30-30-30)`,
          cuerpo: `Las estaciones meteorológicas registran 34.5°C de temperatura, humedad de solo 18% y ráfagas de viento de 36 km/h en tu zona. Cualquier chispa puede iniciar un incendio incontrolable. Despeja patios, riega perímetros cercanos a tu hogar y ten preparado tu bolso de emergencia.`,
          accion_recomendada: 'Prohibición absoluta de uso de herramientas eléctricas en pastizales, asados o fogatas. Reporta de inmediato cualquier columna de humo al 130 CONAF o 132 Bomberos.',
        },
        agricultor: {
          asunto: `[FireReady Operaciones] Suspensión de labores agrícolas en sector ${zona.nombre}`,
          cuerpo: `Condición meteorológica crítica 30-30-30 confirmada en coordenadas (${lat}°, ${lng}°). Viento seco sostenido de 36 km/h con humedad de 18%. Se instruye paralizar cosechadoras, desbrozadoras y faenas con tractor. Habilita mangueras presurizadas en estanques prediales.`,
          accion_recomendada: 'Detener de inmediato faenas agrícolas motorizadas y activar vigilancia continua sobre cortafuegos perimetrales.',
        },
        brigadista: {
          asunto: `[DESPACHO METEOROLÓGICO] Índice 30-30-30 Superado en Cuadrante ${celdaId}`,
          cuerpo: `Condiciones extremas de propagación: Temp 34.5°C, HR 18%, Viento 36 km/h dirección SO-NE. Probabilidad de ignición estimada en 88.5%. Velocidad de propagación potencial estimada en 2.4 km/h en combustible fino seco. Sugerir alerta amarilla comunal.`,
          accion_recomendada: 'Pre-posicionar camiones aljibe y cuadrillas de ataque inicial en puntos estratégicos de acceso.',
        },
      },
    };
  }

  if (tipo === 'anomalia_termica') {
    return {
      activa: true,
      id_celda: celdaId,
      lat,
      lng,
      hora_deteccion: 'Persistencia semanal detectada · +3.4σ sobre mediana histórica',
      satelites: 'Consolidado multianual MODIS (2000–2026) y VIIRS',
      frp_mw: 180.0,
      nivel: 'ALTO',
      detecciones: 14,
      avisos_por_rol: {
        vecino: {
          asunto: `[FireReady Preventivo] Vigilancia comunitaria reforzada en sector ${zona.nombre}`,
          cuerpo: `Los satélites de la NASA han detectado acumulación recurrente de anomalías térmicas en los últimos 7 días en tu entorno (3.4 veces más caliente que lo normal para esta fecha). Organízate con tu junta de vecinos para verificar caminos y fuentes de agua.`,
          accion_recomendada: 'Mantener desmalezados los 10 metros perimetrales de cada vivienda y acordar puntos de encuentro vecinales.',
        },
        agricultor: {
          asunto: `[FireReady Gestión] Alerta por estrés hídrico y anomalía de calor persistente`,
          cuerpo: `La grilla de 1 km en (${lat}°, ${lng}°) acumula 14 detecciones térmicas en la semana. La biomasa vegetal presenta sequedad crítica. Asegura cortafuegos y coordina con predios vecinos el despeje de vías de acceso para vehículos de emergencia.`,
          accion_recomendada: 'Revisar cortafuegos y mantener reservas de agua de emergencia despejadas y accesibles.',
        },
        brigadista: {
          asunto: `[PATRULLAJE PREVENTIVO] Anomalía Persistente +3.4σ en Celda ${celdaId}`,
          cuerpo: `Análisis estadístico satelital revela persistencia térmica de 7 días continuos en sector de interfaz. Z-score: +3.4σ sobre baseline histórico 2000-2025. Coordenadas: Lat ${lat}, Lng ${lng}. Se recomienda patrullaje disuasivo coordinado con guardaparques.`,
          accion_recomendada: 'Coordinar patrullaje preventivo terrestre en accesos a bosques y pastizales colindantes.',
        },
      },
    };
  }

  // Por defecto: Escenario 1 Satelital Crítica
  return {
    activa: true,
    id_celda: celdaId,
    lat,
    lng,
    hora_deteccion: 'Hace 4 minutos (17:28 UTC) · Pasada orbital combinada',
    satelites: 'NOAA-20 VIIRS (375 m) + Aqua MODIS (1 km)',
    frp_mw: 420.5,
    nivel: 'EXTREMO',
    detecciones: 18,
    avisos_por_rol: {
      vecino: {
        asunto: `[FireReady] Aviso Preventivo Comunitario: Detección térmica en sector ${zona.nombre}`,
        cuerpo: `Se ha detectado una anomalía térmica de alta temperatura a 4.2 km de tu sector. No te acerques a quebradas o zonas con vegetación seca. Verifica que las vías de evacuación de tu entorno estén despejadas y ten a mano el número de emergencias 130 CONAF / Bomberos.`,
        accion_recomendada: 'Mantener la calma, no realizar ninguna quema ni uso de herramientas generadoras de chispas y permanecer atento a canales oficiales.',
      },
      agricultor: {
        asunto: `[FireReady Alerta Operativa] Foco de 420 MW detectado en cuadrante ${celdaId}`,
        cuerpo: `El sistema ha detectado 18 focos agrupados con FRP máximo de 420.5 MW en coordenadas (${lat}°, ${lng}°). Suspende de inmediato toda labor de corte, soldadura o maquinaria en pastizales. Verifica operatividad de mangueras, motobombas y puntos de agua para eventual apoyo a brigadistas.`,
        accion_recomendada: 'Detener labores con maquinaria de combustión en faenas agrícolas y monitorear perímetro del cortafuegos.',
      },
      brigadista: {
        asunto: `[DESPACHO TÁCTICO] Detección VIIRS/MODIS 420.5 MW en Celda ${celdaId}`,
        cuerpo: `Alerta satelital de doble sensor: Pasada VIIRS 375m (17:28 UTC) validada por MODIS 1km. Coordenadas: Lat ${lat}, Lng ${lng}. FRP: 420.5 MW. Condiciones locales: Viento 38.2 km/h, Humedad 21%, Temperatura 33.5°C (Regla 30-30-30 superada). Comportamiento térmico explosivo proyectado hacia el sureste.`,
        accion_recomendada: 'Sugerir patrulla de verificación de ataque rápido en punto de acceso y pre-posicionar unidades en zona de interfaz.',
      },
    },
  };
}

export interface FocoCrudo {
  id: string;
  id_celda: string;
  lat: number;
  lng: number;
  fecha: string;
  sensor: Sensor;
}

function semilla(texto: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export function generarFocosCrudos(puntos: PuntoArmonizado[]): FocoCrudo[] {
  return puntos.flatMap((p) => {
    const rnd = semilla(p.id_celda);
    return Array.from({ length: p.detecciones_agrupadas }, (_, i) => ({
      id: `${p.id_celda}-${i}`,
      id_celda: p.id_celda,
      lat: p.lat + (rnd() - 0.5) * 0.009,
      lng: p.lng + (rnd() - 0.5) * 0.009,
      fecha: p.fecha,
      sensor: p.sensores[i % p.sensores.length],
    }));
  });
}
