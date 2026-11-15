import type { Intensidad } from '../mocks/fireData';

/** Anillo de foco visible reutilizable (WCAG 2.4.7). Acento UI cian (no térmico). */
export const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0C10]';

/** Tokens de la identidad visual oficial. */
export const UI = {
  base: '#0B0C10',
  panel: '#1F2833',
  line: '#323E4C',
  texto: '#FFFFFF',
  muted: '#8C9BAA',
} as const;

export interface Paleta {
  /** Color de datos (halo / relleno de marcadores y barras). */
  fill: Record<Intensidad, string>;
  /** Color de texto legible sobre #1F2833 (>= 4.5:1). */
  text: Record<Intensidad, string>;
  badge: Record<Intensidad, string>;
  /** Núcleo brillante del hot spot radiante. */
  core: string;
  historico: string;
  actual: string;
  anomalia: string;
  modis: string;
  viirs: string;
}

export const PALETAS: { standard: Paleta; daltonico: Paleta } = {
  // Datos satelitales: MODERADO #FFD700 · ALTO #FF6B00 · EXTREMO #FF003C
  standard: {
    fill: { EXTREMO: '#FF003C', ALTO: '#FF6B00', MODERADO: '#FFD700' },
    text: { EXTREMO: '#FF6F8E', ALTO: '#FF8A3D', MODERADO: '#FFD700' },
    badge: {
      EXTREMO: 'bg-[#FF003C]/15 text-white border-[#FF003C]',
      ALTO: 'bg-[#FF6B00]/15 text-white border-[#FF6B00]',
      MODERADO: 'bg-[#FFD700]/10 text-white border-[#FFD700]',
    },
    core: '#FFD700',
    historico: '#8C9BAA',
    actual: '#4FB3D9',
    anomalia: '#FF003C',
    modis: '#FF6B00',
    viirs: '#FFD700',
  },
  // Okabe-Ito: MODERADO #56B4E9 · ALTO #E69F00 · EXTREMO #CC79A7
  daltonico: {
    fill: { EXTREMO: '#CC79A7', ALTO: '#E69F00', MODERADO: '#56B4E9' },
    text: { EXTREMO: '#E3A6C8', ALTO: '#E69F00', MODERADO: '#56B4E9' },
    badge: {
      EXTREMO: 'bg-[#CC79A7]/20 text-white border-[#CC79A7]',
      ALTO: 'bg-[#E69F00]/15 text-white border-[#E69F00]',
      MODERADO: 'bg-[#56B4E9]/15 text-white border-[#56B4E9]',
    },
    core: '#FFFFFF',
    historico: '#8C9BAA',
    actual: '#0072B2',
    anomalia: '#CC79A7',
    modis: '#E69F00',
    viirs: '#56B4E9',
  },
};

/**
 * Doble codificación: forma + borde además del color.
 * EXTREMO = triángulo con doble borde, ALTO = rombo con borde sólido, MODERADO = círculo.
 */
export function intensitySvg(nivel: Intensidad, color: string, size = 20): string {
  const shapes: Record<Intensidad, string> = {
    EXTREMO:
      `<polygon points="12,2 22.5,21 1.5,21" fill="${color}" fill-opacity=".9" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>` +
      `<polygon points="12,8 17.6,18.4 6.4,18.4" fill="none" stroke="#0B0C10" stroke-width="1.6" stroke-linejoin="round"/>`,
    ALTO: `<polygon points="12,1.8 22.2,12 12,22.2 1.8,12" fill="${color}" fill-opacity=".9" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>`,
    MODERADO: `<circle cx="12" cy="12" r="9" fill="${color}" fill-opacity=".9" stroke="${color}" stroke-width="1.5"/>`,
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" focusable="false">${shapes[nivel]}</svg>`;
}

/**
 * Hot spot radiante: halo difuminado (color de intensidad) + núcleo brillante con la forma de la intensidad.
 * MODERADO usa un halo más tenue y pequeño.
 */
export function glowHtml(nivel: Intensidad, pal: Paleta, size: number): { html: string; box: number } {
  const halo = pal.fill[nivel];
  const box = Math.round(size * (nivel === 'MODERADO' ? 1.8 : 2.4));
  const core = Math.max(14, Math.round(size * 0.55));
  const blur = nivel === 'EXTREMO' ? 7 : 6;
  const intensidad = nivel === 'EXTREMO' ? 0.95 : nivel === 'ALTO' ? 0.8 : 0.6;
  const html =
    `<div style="position:relative;width:${box}px;height:${box}px;display:flex;align-items:center;justify-content:center">` +
    `<span class="fr-halo" style="position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle, ${halo} 0%, ${halo}99 38%, ${halo}00 72%);filter:blur(${blur}px);opacity:${intensidad}"></span>` +
    `<span style="position:relative;display:flex;filter:drop-shadow(0 0 4px ${pal.core})">${intensitySvg(nivel, pal.core, core)}</span>` +
    `</div>`;
  return { html, box };
}

/** Tamaño base del marcador proporcional al FRP máximo. */
export function markerSize(frp: number): number {
  return Math.round(Math.min(48, Math.max(20, 14 + Math.sqrt(frp) * 2)));
}

export function escapeHtml(s: string | number): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
