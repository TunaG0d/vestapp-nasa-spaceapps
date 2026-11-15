import { useEffect, useRef, useState } from 'react';
import * as L from 'leaflet';
import { ChevronDown, ChevronUp, Crosshair, Layers, Satellite } from 'lucide-react';
import type { AlertaSimuladaData, FocoCrudo, PuntoArmonizado, Zona } from '../mocks/fireData';
import { escapeHtml, glowHtml, intensitySvg, markerSize, type Paleta } from '../lib/theme';
import { frpTexto, nivelLabel, textos } from '../lib/lang';

export type Vista = 'celdas' | 'crudos';

interface Props {
  zona: Zona;
  puntos: PuntoArmonizado[];
  focos: FocoCrudo[];
  vista: Vista;
  pal: Paleta;
  claro: boolean;
  alertaSimulada?: AlertaSimuladaData | null;
  className?: string;
}

const ZOOM = 8;
const ESRI_DARK_BASE =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
const ESRI_DARK_REF =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}';

function crearConoPropagacion(
  lat0: number,
  lng0: number,
  bearingDeg: number,
  aperturaDeg: number,
  distKm: number,
): [number, number][] {
  const puntos: [number, number][] = [[lat0, lng0]];
  const pasos = 10;
  const mitad = aperturaDeg / 2;
  const radLat = (lat0 * Math.PI) / 180;
  const cosLat = Math.cos(radLat);

  for (let i = 0; i <= pasos; i++) {
    const ang = (bearingDeg - mitad + (i * aperturaDeg) / pasos) * (Math.PI / 180);
    const dLat = (distKm / 111.0) * Math.cos(ang);
    const dLng = (distKm / (111.0 * Math.max(0.1, cosLat))) * Math.sin(ang);
    puntos.push([lat0 + dLat, lng0 + dLng]);
  }
  puntos.push([lat0, lng0]);
  return puntos;
}

export default function FireMap({
  zona,
  puntos,
  focos,
  vista,
  pal,
  claro,
  alertaSimulada,
  className,
}: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const alertLayer = useRef<L.LayerGroup | null>(null);
  const [leyendaExpandida, setLeyendaExpandida] = useState<boolean>(true);

  // Creación única del mapa
  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { center: zona.center, zoom: ZOOM, worldCopyJump: true });
    // Capa base oscura sin marcas de agua ni API key (Esri World Dark Gray Base)
    L.tileLayer(ESRI_DARK_BASE, {
      maxZoom: 16,
      attribution:
        'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, METI, Garmin',
    }).addTo(m);
    // Capa de etiquetas de referencia nítidas
    L.tileLayer(ESRI_DARK_REF, {
      maxZoom: 16,
      attribution: '',
    }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    alertLayer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Vuelo suave al cambiar de zona o foco de alerta
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (alertaSimulada?.activa) {
      map.current?.flyTo([alertaSimulada.lat, alertaSimulada.lng], ZOOM + 1, {
        animate: !reduce,
        duration: 1.5,
      });
    } else {
      map.current?.flyTo(zona.center, ZOOM, { animate: !reduce, duration: 1.8 });
    }
  }, [zona, alertaSimulada]);

  // Marcadores de celdas / focos crudos
  useEffect(() => {
    const g = layer.current;
    if (!g) return;
    g.clearLayers();
    const t = textos(claro);
    const contexto = `${escapeHtml(zona.nombre)} · ${zona.center[0].toFixed(2)}°, ${zona.center[1].toFixed(2)}°`;

    if (vista === 'celdas') {
      // 1. Círculos de calor concéntricos (zona de riesgo, alerta media y foco crítico como en la maqueta)
      const topCriticos = [...puntos]
        .sort((a, b) => b.frp_max - a.frp_max)
        .slice(0, 4);

      topCriticos.forEach((p) => {
        // Anillo exterior: Zona de riesgo radiación térmica (amarillo)
        L.circle([p.lat, p.lng], {
          radius: 12500,
          color: '#FACC15',
          weight: 0.8,
          fillColor: '#FACC15',
          fillOpacity: 0.22,
          interactive: false,
        }).addTo(g);

        // Anillo intermedio: Alerta media propagación (naranja)
        L.circle([p.lat, p.lng], {
          radius: 7500,
          color: '#FB923C',
          weight: 1,
          fillColor: '#F97316',
          fillOpacity: 0.35,
          interactive: false,
        }).addTo(g);

        // Núcleo central: Foco Crítico evacuación (rojo intenso)
        L.circle([p.lat, p.lng], {
          radius: 3800,
          color: '#FF003C',
          weight: 1.5,
          fillColor: '#FF003C',
          fillOpacity: 0.6,
          interactive: false,
        }).addTo(g);
      });

      puntos.forEach((p) => {
        const size = markerSize(p.frp_max);
        const color = pal.fill[p.nivel_intensidad];
        const glow = glowHtml(p.nivel_intensidad, pal, size);
        const icon = L.divIcon({
          className: 'fr-marker',
          html: glow.html,
          iconSize: [glow.box, glow.box],
          iconAnchor: [glow.box / 2, glow.box / 2],
          popupAnchor: [0, -size / 2],
        });
        const etiqueta = `${t.tablaCelda} ${p.id_celda}, intensidad ${nivelLabel(p.nivel_intensidad, claro)}`;
        const popup =
          `<div><strong style="font-size:1rem">${escapeHtml(p.id_celda)}</strong>` +
          `<div style="color:${pal.text[p.nivel_intensidad]};font-weight:600;margin:.25rem 0">${intensitySvg(p.nivel_intensidad, color, 14)} ${escapeHtml(nivelLabel(p.nivel_intensidad, claro))}</div>` +
          `<dl style="display:grid;grid-template-columns:auto 1fr;gap:.15rem .75rem;margin:0">` +
          `<dt style="color:#8C9BAA">Coordenadas</dt><dd style="margin:0">${p.lat.toFixed(3)}, ${p.lng.toFixed(3)}</dd>` +
          `<dt style="color:#8C9BAA">Fecha</dt><dd style="margin:0">${escapeHtml(p.fecha)}</dd>` +
          `<dt style="color:#8C9BAA">${escapeHtml(t.frpPopup)}</dt><dd style="margin:0">${escapeHtml(claro ? frpTexto(p.frp_max, true) : p.frp_max + ' MW')}</dd>` +
          `<dt style="color:#8C9BAA">${escapeHtml(t.agrupados)}</dt><dd style="margin:0">${p.detecciones_agrupadas}</dd>` +
          `<dt style="color:#8C9BAA">${escapeHtml(t.tablaSensores)}</dt><dd style="margin:0">${escapeHtml(p.sensores.join(' + '))}</dd>` +
          (p.satelite_pasada ? `<dt style="color:#8C9BAA">Pasadas</dt><dd style="margin:0">${escapeHtml(p.satelite_pasada)}</dd>` : '') +
          `</dl><div style="margin-top:.5rem;color:#8C9BAA;font-size:.8rem">${contexto}</div></div>`;
        L.marker([p.lat, p.lng], { icon, title: etiqueta, alt: etiqueta, keyboard: true })
          .bindPopup(popup, { className: 'fr-popup', maxWidth: 320 })
          .addTo(g);
      });
    } else {
      focos.forEach((f) => {
        const modis = f.sensor === 'MODIS';
        const color = modis ? pal.modis : pal.viirs;
        L.circleMarker([f.lat, f.lng], {
          radius: modis ? 7 : 4,
          color: '#ffffff',
          weight: modis ? 2 : 1,
          dashArray: modis ? '3 3' : undefined,
          fillColor: color,
          fillOpacity: 0.8,
        })
          .bindPopup(
            `<div><strong>Foco crudo · ${escapeHtml(f.sensor)}</strong><br/>Fecha: ${escapeHtml(f.fecha)}<br/>Se agrupa en la celda <strong>${escapeHtml(f.id_celda)}</strong><div style="margin-top:.5rem;color:#8C9BAA;font-size:.8rem">${contexto}</div></div>`,
            { className: 'fr-popup' },
          )
          .addTo(g);
      });
    }
  }, [puntos, focos, vista, pal, claro, zona]);

  // Capa para la Alerta Simulada en Vivo
  useEffect(() => {
    const ag = alertLayer.current;
    if (!ag) return;
    ag.clearLayers();

    if (!alertaSimulada || !alertaSimulada.activa) return;

    const lat0 = alertaSimulada.lat;
    const lng0 = alertaSimulada.lng;
    const bearing = 135; // Azimuth 135° Sureste
    const apertura = 45; // 45° cono de dispersión

    // 1. Cono de propagación proyectada a 3 horas (7.2 km)
    const puntos3h = crearConoPropagacion(lat0, lng0, bearing, apertura, 7.2);
    L.polygon(puntos3h, {
      color: '#FF6F00',
      weight: 1.5,
      dashArray: '4, 4',
      fillColor: '#FF3D00',
      fillOpacity: 0.15,
    })
      .bindPopup(
        `<div style="font-size:12px;color:#fff;">` +
          `<strong style="color:#FFA726">💨 Zona de Propagación Proyectada (+3 Horas)</strong><br/>` +
          `Distancia estimada: 7.2 km hacia el Sureste.<br/>` +
          `Velocidad de avance: ~2.4 km/h en combustible fino seco.<br/>` +
          `<span style="color:#8C9BAA;font-size:11px">Comunidades y predios en este cono deben activar vigilancia preventiva.</span>` +
          `</div>`,
        { className: 'fr-popup' },
      )
      .addTo(ag);

    // 2. Cono frontal inmediato de alta severidad a 1 hora (2.5 km)
    const puntos1h = crearConoPropagacion(lat0, lng0, bearing, apertura, 2.5);
    L.polygon(puntos1h, {
      color: '#FF003C',
      weight: 2,
      fillColor: '#FF003C',
      fillOpacity: 0.28,
    })
      .bindPopup(
        `<div style="font-size:12px;color:#fff;">` +
          `<strong style="color:#FF6F8E">🔥 Frente de Fuego Inmediato (+1 Hora)</strong><br/>` +
          `Distancia crítica: 2.5 km hacia el Sureste.<br/>` +
          `Comportamiento explosivo proyectado por Viento 38.2 km/h y HR 21%.` +
          `</div>`,
        { className: 'fr-popup' },
      )
      .addTo(ag);

    // 3. Línea central con flecha del vector de viento
    const radBearing = (bearing * Math.PI) / 180;
    const radLat = (lat0 * Math.PI) / 180;
    const dLatV = (8.5 / 111.0) * Math.cos(radBearing);
    const dLngV = (8.5 / (111.0 * Math.max(0.1, Math.cos(radLat)))) * Math.sin(radBearing);
    const puntaLat = lat0 + dLatV;
    const puntaLng = lng0 + dLngV;

    L.polyline(
      [
        [lat0, lng0],
        [puntaLat, puntaLng],
      ],
      {
        color: '#00E5FF',
        weight: 3,
        dashArray: '6, 6',
      },
    ).addTo(ag);

    // 4. Marcador en la punta del vector de viento
    const vectorIcon = L.divIcon({
      className: 'fr-wind-vector',
      html:
        `<div style="background:#00E5FF;color:#0B0C10;font-weight:900;font-size:10px;padding:2px 6px;border-radius:4px;white-space:nowrap;box-shadow:0 0 10px #00E5FF;display:flex;align-items:center;gap:4px">` +
        `<span>💨 Viento 38 km/h SE · Avance ~2.4 km/h</span>` +
        `</div>`,
      iconSize: [170, 22],
      iconAnchor: [85, 11],
    });
    L.marker([puntaLat, puntaLng], { icon: vectorIcon, interactive: false }).addTo(ag);

    const size = 52;
    const alertHtml =
      `<div style="position:relative;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center">` +
      `<span style="position:absolute;inset:0;border-radius:50%;background:#FF003C;filter:blur(8px);opacity:0.95;animation:fr-pulse 1.2s infinite"></span>` +
      `<span style="position:absolute;inset:4px;border-radius:50%;border:2px solid #FFFFFF;background:radial-gradient(circle, #FFFFFF 0%, #FFD700 35%, #FF003C 85%);display:flex;align-items:center;justify-content:center;box-shadow:0 0 15px #FF003C">` +
      `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#0B0C10" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m13 2-2 10h5L11 22l2-10H8l5-10z"/></svg>` +
      `</span>` +
      `</div>`;

    const alertIcon = L.divIcon({
      className: 'fr-marker-alerta',
      html: alertHtml,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2],
    });

    const popupContent =
      `<div>` +
      `<div style="background:#FF003C;color:#ffffff;font-weight:bold;padding:2px 8px;border-radius:4px;display:inline-block;font-size:11px;margin-bottom:6px;">🚨 ALERTA SATELITAL EN VIVO (SIMULACIÓN)</div>` +
      `<strong style="font-size:1.05rem;display:block;color:#ffffff">${escapeHtml(alertaSimulada.id_celda)}</strong>` +
      `<div style="color:#FF6F8E;font-weight:bold;margin:.25rem 0;font-size:13px">FRP ${alertaSimulada.frp_mw} MW · EXTREMO CRÍTICO</div>` +
      `<dl style="display:grid;grid-template-columns:auto 1fr;gap:.2rem .75rem;margin:0;font-size:12px">` +
      `<dt style="color:#8C9BAA">Detección</dt><dd style="margin:0;color:#ffffff">${escapeHtml(alertaSimulada.hora_deteccion)}</dd>` +
      `<dt style="color:#8C9BAA">Satélites</dt><dd style="margin:0;color:#ffffff">${escapeHtml(alertaSimulada.satelites)}</dd>` +
      `<dt style="color:#8C9BAA">Coordenadas</dt><dd style="margin:0;color:#ffffff font-mono">${alertaSimulada.lat.toFixed(3)}°, ${alertaSimulada.lng.toFixed(3)}°</dd>` +
      `<dt style="color:#8C9BAA">Focos unificados</dt><dd style="margin:0;color:#ffffff">${alertaSimulada.detecciones} focos en grilla 1 km</dd>` +
      `</dl>` +
      `<div style="margin-top:.6rem;padding-top:.4rem;border-top:1px solid #323E4C;font-size:11px;color:#cbd5e1;line-height:1.3">` +
      `Validación cruzada automática: El algoritmo armonizó 14 detecciones VIIRS de 375m con 4 detecciones Aqua MODIS de 1km en una sola celda consolidada.` +
      `</div>` +
      `</div>`;

    const marker = L.marker([alertaSimulada.lat, alertaSimulada.lng], {
      icon: alertIcon,
      title: `Alerta Satelital Crítica: ${alertaSimulada.id_celda}`,
      keyboard: true,
      zIndexOffset: 1000,
    })
      .bindPopup(popupContent, { className: 'fr-popup', maxWidth: 340 })
      .addTo(ag);

    marker.openPopup();
  }, [alertaSimulada]);

  const handleCentrar = () => {
    if (alertaSimulada?.activa) {
      map.current?.flyTo([alertaSimulada.lat, alertaSimulada.lng], ZOOM + 1, { duration: 1.2 });
    } else {
      map.current?.flyTo(zona.center, ZOOM, { duration: 1.2 });
    }
  };

  return (
    <div className={`relative ${className || 'h-[27rem] w-full'}`}>
      <div
        ref={el}
        role="region"
        aria-label={`Mapa interactivo de ${zona.nombre}. ${vista === 'celdas' ? puntos.length + ' celdas armonizadas' : focos.length + ' focos crudos'}.`}
        className="w-full h-full"
      />

      {/* SIMBOLOGÍA SATELITAL MODIS, VIIRS Y GRILLA ARMONIZADA (Flotante sobre el mapa) */}
      <div
        className="absolute bottom-4 left-4 z-[400] rounded-xl border border-[#2D3B48] bg-[#0E141B]/95 p-3 text-xs shadow-2xl backdrop-blur-md max-w-[280px] sm:max-w-[310px] select-none"
        role="region"
        aria-label="Simbología satelital de MODIS y VIIRS"
      >
        <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-[#2D3B48]">
          <div className="flex items-center gap-1.5 font-bold text-white text-[11px] tracking-wide uppercase">
            <Satellite className="w-3.5 h-3.5 text-cyan-400" />
            <span>Simbología Satelital NASA</span>
          </div>
          <button
            type="button"
            onClick={() => setLeyendaExpandida(!leyendaExpandida)}
            aria-label={leyendaExpandida ? 'Minimizar simbología' : 'Expandir simbología'}
            className="text-[#8C9BAA] hover:text-white p-0.5 rounded transition"
          >
            {leyendaExpandida ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>

        {leyendaExpandida && (
          <div className="space-y-2 pt-2 text-[11px] animate-in fade-in duration-150">
            {/* 1. MODIS */}
            <div className="flex items-start gap-2.5">
              <span
                className="w-4 h-4 mt-0.5 rounded-full border-2 border-dashed border-white shrink-0 shadow-sm shadow-orange-500/50"
                style={{ backgroundColor: pal.modis || '#FF6B00' }}
              />
              <div>
                <div className="font-bold text-white flex items-center gap-1">
                  <span className="text-orange-400">MODIS</span>
                  <span className="text-[#8C9BAA] text-[10px] font-mono">(Terra & Aqua)</span>
                </div>
                <p className="text-[#8C9BAA] text-[10px] leading-tight">
                  Resolución <strong>1 km</strong> (1.000 m) · Serie radiométrica continua 2000–2026.
                </p>
              </div>
            </div>

            {/* 2. VIIRS */}
            <div className="flex items-start gap-2.5">
              <span
                className="w-3.5 h-3.5 mt-0.5 rounded-full border border-white shrink-0 shadow-sm shadow-yellow-400/50"
                style={{ backgroundColor: pal.viirs || '#FFD700' }}
              />
              <div>
                <div className="font-bold text-white flex items-center gap-1">
                  <span className="text-amber-300">VIIRS</span>
                  <span className="text-[#8C9BAA] text-[10px] font-mono">(Suomi-NPP, NOAA-20/21)</span>
                </div>
                <p className="text-[#8C9BAA] text-[10px] leading-tight">
                  Resolución alta <strong>375 m</strong> · Precisión fina de frente activo de llama.
                </p>
              </div>
            </div>

            {/* 3. Grilla Armonizada de 1 km */}
            <div className="flex items-start gap-2.5 pt-1.5 border-t border-[#232F3B]">
              <div className="flex items-center -space-x-1 mt-0.5 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 border border-yellow-200" />
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 border border-orange-300" />
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 border border-rose-300" />
              </div>
              <div>
                <div className="font-bold text-white">Grilla Armonizada (1 km²)</div>
                <p className="text-[#8C9BAA] text-[10px] leading-tight">
                  Fusión sin doble conteo · Anillos de radiación térmica y evacuación.
                </p>
              </div>
            </div>

            {/* 4. Cono de Avance */}
            <div className="flex items-start gap-2.5 pt-1 border-t border-[#232F3B]">
              <span className="w-3.5 h-3.5 mt-0.5 rounded bg-rose-600/30 border border-rose-500 text-rose-300 text-[9px] font-bold flex items-center justify-center shrink-0">
                💨
              </span>
              <div>
                <div className="font-bold text-white">Cono Táctico de Propagación</div>
                <p className="text-[#8C9BAA] text-[10px] leading-tight">
                  Proyección física de avance con vector de viento (+1h frente, +3h alerta).
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Botón flotante de geolocalización / centrar mapa (Imágenes 1 a 7) */}
      <button
        type="button"
        onClick={handleCentrar}
        aria-label="Centrar mapa en la zona activa"
        title="Centrar mapa en la zona activa"
        className="absolute bottom-6 right-6 z-[400] w-12 h-12 rounded-full border border-[#455A64] bg-[#141B22]/90 hover:bg-[#202C38] text-white flex items-center justify-center shadow-2xl backdrop-blur-md transition group cursor-pointer"
      >
        <Crosshair className="w-6 h-6 text-slate-300 group-hover:text-cyan-400 transition" />
      </button>
    </div>
  );
}
