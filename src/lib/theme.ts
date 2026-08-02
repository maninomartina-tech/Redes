// ---------------------------------------------------------------------------
// Paleta de marca editable.
//
// Los colores de la app viven en variables CSS (como tripletes RGB, para que
// Tailwind pueda seguir usando opacidades tipo `border-ink-200/70`). A partir
// de tres colores elegidos —fuerte, suave y fondo— se genera la escala
// completa y se escribe en el documento.
// ---------------------------------------------------------------------------

export interface Branding {
  /** Tono fuerte: botones, títulos, estados activos */
  strong: string;
  /** Tono suave: textos secundarios, bordes */
  soft: string;
  /** Fondo general */
  canvas: string;
}

export const DEFAULT_BRANDING: Branding = {
  strong: '#4A1E1A',
  soft: '#8A6865',
  canvas: '#FCF5E8',
};

type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
  const limpio = hex.replace('#', '').trim();
  const full =
    limpio.length === 3
      ? limpio
          .split('')
          .map((c) => c + c)
          .join('')
      : limpio;
  const n = parseInt(full, 16);
  if (Number.isNaN(n) || full.length !== 6) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: RGB): string {
  const h = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** Mezcla `a` con `b`. cantidad = 0 devuelve `a`, 1 devuelve `b`. */
function mix(a: RGB, b: RGB, cantidad: number): RGB {
  return [
    a[0] + (b[0] - a[0]) * cantidad,
    a[1] + (b[1] - a[1]) * cantidad,
    a[2] + (b[2] - a[2]) * cantidad,
  ];
}

const BLANCO: RGB = [255, 255, 255];
const NEGRO: RGB = [0, 0, 0];

/** Luminancia relativa, para decidir el color de texto sobre un fondo. */
export function luminancia(rgb: RGB): number {
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contraste entre dos colores (1 a 21). */
export function contraste(a: string, b: string): number {
  const la = luminancia(hexToRgb(a));
  const lb = luminancia(hexToRgb(b));
  const [alto, bajo] = la > lb ? [la, lb] : [lb, la];
  return (alto + 0.05) / (bajo + 0.05);
}

const triplete = (rgb: RGB) => rgb.map((v) => Math.round(v)).join(' ');

/** Genera todas las variables de color a partir de los tres tonos elegidos. */
export function buildScale(b: Branding): Record<string, string> {
  const strong = hexToRgb(b.strong);
  const soft = hexToRgb(b.soft);
  const canvas = hexToRgb(b.canvas);

  const vars: Record<string, string> = {
    '--c-canvas': triplete(canvas),
    '--c-surface': triplete(mix(canvas, BLANCO, 0.55)),

    // Neutros cálidos: del fondo al tono fuerte
    '--c-ink-50': triplete(mix(soft, canvas, 0.88)),
    '--c-ink-100': triplete(mix(soft, canvas, 0.78)),
    '--c-ink-200': triplete(mix(soft, canvas, 0.62)),
    '--c-ink-300': triplete(mix(soft, canvas, 0.4)),
    '--c-ink-400': triplete(mix(soft, canvas, 0.18)),
    '--c-ink-500': triplete(soft),
    '--c-ink-600': triplete(mix(soft, strong, 0.35)),
    '--c-ink-700': triplete(mix(soft, strong, 0.65)),
    '--c-ink-800': triplete(strong),
    '--c-ink-900': triplete(mix(strong, NEGRO, 0.15)),
    '--c-ink-950': triplete(mix(strong, NEGRO, 0.35)),

    // Color principal
    '--c-brand-50': triplete(mix(soft, canvas, 0.9)),
    '--c-brand-100': triplete(mix(soft, canvas, 0.82)),
    '--c-brand-200': triplete(mix(soft, canvas, 0.68)),
    '--c-brand-300': triplete(mix(soft, canvas, 0.48)),
    '--c-brand-400': triplete(mix(soft, canvas, 0.24)),
    '--c-brand-500': triplete(soft),
    '--c-brand-600': triplete(mix(soft, strong, 0.45)),
    '--c-brand-700': triplete(mix(soft, strong, 0.75)),
    '--c-brand-800': triplete(strong),
    '--c-brand-900': triplete(mix(strong, NEGRO, 0.18)),
  };

  return vars;
}

/** Escribe la paleta en el documento. */
export function applyBranding(b: Branding): void {
  const vars = buildScale(b);
  const root = document.documentElement;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
}

export function isDefaultBranding(b: Branding): boolean {
  return (
    b.strong.toLowerCase() === DEFAULT_BRANDING.strong.toLowerCase() &&
    b.soft.toLowerCase() === DEFAULT_BRANDING.soft.toLowerCase() &&
    b.canvas.toLowerCase() === DEFAULT_BRANDING.canvas.toLowerCase()
  );
}
