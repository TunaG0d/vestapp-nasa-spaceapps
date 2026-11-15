import type { Intensidad } from '../mocks/fireData';

/**
 * Diccionario de textos enriquecido:
 * - Modo Técnico: Nomenclatura científica oficial de NASA FIRMS (MODIS, VIIRS, FRP en MW, Bounding Box, sigmas).
 * - Modo Lenguaje Claro: Redacción empática, accesible y directa para la ciudadanía, vecinos y brigadas comunitarias.
 */
export function textos(claro: boolean) {
  return {
    // Pestañas de navegación
    tabTactico: claro ? '1. Mapa de Calor y Alerta Temprana' : '1. Monitoreo Táctico y Alerta Temprana',
    tabCalendario: claro ? '2. Historial de Incendios (2000–2026)' : '2. Calendario Diario Histórico (2000–2026)',
    tabDatos: claro ? '3. Descarga de Datos (Excel y Planillas)' : '3. Datos Consolidados y CSV Customizado',

    // Barra de audiencia
    audienciaTitulo: claro ? 'Diseñado para:' : 'Audiencia NASA:',
    audiencias: claro
      ? ['Familias y Vecinos', 'Equipos de Emergencia', 'Bomberos y Brigadas', 'Investigadores', 'Guardaparques']
      : ['Fire Managers', 'Emergency Responders', 'Firefighters', 'Scientists', 'Land Managers'],

    // Tarjetas KPI principales
    focos: claro ? 'Puntos de calor detectados' : 'Focos brutos totales',
    focosSub: (mod: number, vii: number) =>
      claro
        ? `Imágenes de satélites NASA (${mod.toLocaleString('es-CL')} Terra/Aqua y ${vii.toLocaleString('es-CL')} Suomi/NOAA)`
        : `MODIS ${mod.toLocaleString('es-CL')} · VIIRS ${vii.toLocaleString('es-CL')}`,

    celdas: claro ? 'Zonas con fuego activo (1 km)' : 'Celdas armonizadas 1 km',
    celdasSub: claro
      ? 'Cuadrículas de 1 km sin repetir el mismo fuego'
      : 'Grilla unificada MODIS + VIIRS',

    duplicados: claro ? 'Doble conteo corregido' : 'Duplicados eliminados',
    duplicadosSub: claro
      ? 'Se combinó lo que varios satélites captaron a la vez'
      : 'Sesgo de doble conteo corregido',

    riesgo: claro ? 'Peligro estimado de avance' : 'Nivel de riesgo IA',
    riesgoSub: (pct: number) =>
      claro ? `Probabilidad de avance del fuego: ${pct}%` : `Probabilidad estimada: ${pct}%`,

    // Botones de acción globales
    btnAlerta: (activa: boolean) =>
      activa
        ? (claro ? 'Desactivar Aviso de Prueba' : 'Desactivar Simulación de Alerta')
        : (claro ? '⚡ Probar Aviso Temprano (Ejemplo)' : '⚡ Simular Alerta Satelital en Vivo'),
    btnSync: claro ? '⚡ Buscar Datos Satelitales Nuevos' : '⚡ Actualizar Satélites (NRT)',
    btnAvisos: claro ? 'Recibir Alertas en mi Correo' : 'Recibir Avisos Preventivos',
    btnAtajo7Dias: claro ? 'Última semana' : 'Últimos 7 días',
    btnAtajoAnio: claro ? 'Año entero' : 'Año Completo',

    // Mapa térmico
    mapaTitulo: claro ? 'Mapa Satelital de Calor en Terreno' : 'Visor Geoespacial Térmico (Leaflet Dark Matter)',
    mapaVistaCeldas: claro ? 'Zonas agrupadas (1 km)' : 'Celdas Armonizadas 1 km',
    mapaVistaFocos: claro ? 'Detecciones sueltas' : 'Focos Crudos',
    mapaPie: claro
      ? 'El brillo del círculo muestra qué tan fuerte arde el fuego (Potencia Térmica)'
      : 'Proyección de calor radiante ∝ FRP máx (MW)',
    mapaLeyenda: {
      EXTREMO: claro ? 'Peligro Muy Alto (triángulo)' : 'EXTREMO · triángulo',
      ALTO: claro ? 'Peligro Alto (rombo)' : 'ALTO · rombo',
      MODERADO: claro ? 'Peligro Moderado (círculo)' : 'MODERADO · círculo',
    },

    // Panel de Diagnóstico Predictivo (RiskAssistant)
    diagnosticoTitulo: claro ? '¿Por qué se calcula este nivel de peligro?' : 'Desglose transparente de variables predictivas',
    anomaliaLabel: claro ? 'Calor previo inusual:' : 'Anomalía térmica previa:',
    anomaliaTexto: (sigmaStr: string) =>
      claro
        ? 'Calor inusual: notablemente superior al promedio de años anteriores en esta misma fecha'
        : (sigmaStr || '+3.4σ sobre mediana histórica (últimos 7 días)'),
    temperaturaLabel: claro ? 'Temperatura actual' : 'Temperatura',
    humedadLabel: claro ? 'Humedad ambiental' : 'Humedad rel.',
    vientoLabel: claro ? 'Viento en terreno' : 'Viento',
    pestanaInmediata: claro ? 'Situación actual (Semana)' : 'Diagnóstico Actual (7 días)',
    pestanaProyeccion: claro ? 'Pronóstico a largo plazo (17 meses)' : 'Proyección a 72 Semanas (~17m)',
    proyeccionSub: claro
      ? 'Estimación basada en 26 años de historial de satélites y cambios de clima.'
      : 'Proyección multianual entrenada con 26 años de series MODIS+VIIRS y patrones ENSO.',
    btnBoletin: claro ? 'Recibir estos avisos directamente en mi correo' : 'Configurar boletín preventivo personalizado por correo',

    // Pestaña 2: Calendario Diario Histórico
    calTitulo: claro ? 'Calendario Anual: Incendios Día por Día' : 'Matriz Anual de Incendios Diarios (2000–2026)',
    calSub: claro
      ? 'Revisa qué días tuvieron más fuego en cada año y compáralos con lo normal en los últimos 26 años.'
      : 'Comparativa de celdas armonizadas diarias vs mediana histórica de 26 años.',
    calPico: (maxVal: number, maxFecha: string) =>
      claro
        ? `Día con más fuego del año: ${maxFecha} (${maxVal} zonas registradas)`
        : `Pico del año: ${maxVal} celdas el ${maxFecha}`,

    // Pestaña 3: Constructor CSV y Tabla
    csvTitulo: claro ? 'Descarga de Planilla de Datos (Excel / CSV)' : 'Constructor de Exportación CSV Customizado',
    csvSub: claro
      ? 'Elige el lugar, las fechas y los datos que deseas descargar para abrir en Excel o compartir.'
      : 'Personaliza las coordenadas, rango temporal y atributos satelitales antes de generar el archivo para análisis en R, Python, QGIS o Excel.',
    csvBboxLabel: claro ? 'Límites geográficos [Oeste, Sur, Este, Norte]:' : 'Bounding Box [O, S, E, N]:',
    csvBtnDescargar: claro ? 'Descargar Planilla de Datos' : 'Descargar CSV Customizado',
    csvGenerando: claro ? 'Preparando archivo...' : 'Generando CSV...',
    tablaTitulo: claro ? 'Vista Previa de la Planilla' : 'Vista Previa Tabular de Celdas Armonizadas',
    tablaSub: claro
      ? 'Revisión rápida de las zonas con fuego antes de descargar'
      : 'Inspección rápida para científicos y gestores',
    tablaColapsar: claro ? 'Ocultar vista previa' : 'Colapsar Vista Previa',
    tablaExpandir: (n: number) => claro ? `Ver vista previa (${n} zonas)` : `Expandir Vista Previa (${n} celdas)`,
    tablaPaginadaInfo: (filas: number) => claro ? `Paginada (${filas} por pág.)` : `Paginada (${filas} por pág.)`,
    colId: claro ? 'Código de Zona' : 'ID Celda 1km',
    colCoords: claro ? 'Ubicación (Lat / Lng)' : 'Lat / Lng',
    colFecha: claro ? 'Fecha' : 'Fecha',
    colFrp: claro ? 'Fuerza del Calor' : 'FRP Máx',
    colDetecciones: claro ? 'Veces Detectado' : 'Focos Agrupados',
    colSensores: claro ? 'Satélites' : 'Sensores',
    colIntensidad: claro ? 'Nivel de Peligro' : 'Intensidad Térmica',

    // Compatibilidad y popups de mapa
    tablaCelda: claro ? 'Zona' : 'Celda',
    frpPopup: claro ? 'Fuerza del calor' : 'FRP máximo (MW)',
    agrupados: claro ? 'Veces detectado' : 'Focos agrupados',
    tablaSensores: claro ? 'Satélites' : 'Sensores',
  };
}

export function frpClaro(frp: number): string {
  if (frp >= 200) return `Muy fuerte (${frp} MW)`;
  if (frp >= 70) return `Fuerte (${frp} MW)`;
  return `Moderada (${frp} MW)`;
}

export function nivelLabel(n: Intensidad, claro: boolean): string {
  if (!claro) return n;
  return n === 'EXTREMO' ? 'Muy Alto' : n === 'ALTO' ? 'Alto' : 'Moderado';
}

export function frpTexto(frp: number, claro: boolean): string {
  return claro ? frpClaro(frp) : `${frp} MW`;
}
