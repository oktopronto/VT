export type RGB = [number, number, number];
export type OutlineMode = 'c1' | 'c2' | 'mixed';
export type PaletteMode = 'two' | 'full';

export interface Settings {
  c1: RGB;
  c2: RGB;
  /** Intensywność (przyciemnianie) koloru 1 i 2, 0–100 %. 0 = zlewa się z tłem. */
  i1: number;
  i2: number;
  /** Suwak szarości: 0 = biały, 255 = czarny. */
  darkness: number;
  /** Grubość konturów w jednostkach obrazka (viewBox 1000). */
  lineWidth: number;
  outlineMode: OutlineMode;
  paletteMode: PaletteMode;
  /** Pędzel maluje tylko w obrębie obszaru, w którym zaczęło się pociągnięcie. */
  clip: boolean;
  /** Rozmiar pędzla w jednostkach obrazka. */
  brushSize: number;
  /** Ostatni użyty kolor: 'c1' | 'c2' | '#rrggbb' (pełna paleta). */
  lastColor: string;
}

export const DEFAULTS: Settings = {
  c1: [255, 0, 0],
  c2: [0, 0, 255],
  i1: 100,
  i2: 100,
  darkness: 195,
  lineWidth: 8,
  outlineMode: 'mixed',
  paletteMode: 'two',
  clip: true,
  brushSize: 40,
  lastColor: 'c1',
};

/** Kolory pełnej palety (oprócz koloru 1 i 2, które są zawsze pierwsze). */
export const FULL_PALETTE = [
  '#ffd400', '#ff8a00', '#2fb344', '#0b6e2e', '#8b5a2b',
  '#ff6fb5', '#8e44ad', '#5bc0ff', '#ffffff', '#111111',
];

export const BRUSH_SIZES = [20, 40, 80];

const KEY = 'vt.settings.v1';

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

let current: Settings = load();
const listeners = new Set<(s: Settings, prev: Settings) => void>();

export const settings = {
  get: (): Settings => current,
  set(patch: Partial<Settings>) {
    const prev = current;
    current = { ...current, ...patch };
    try {
      localStorage.setItem(KEY, JSON.stringify(current));
    } catch {
      /* brak dostępu do storage — działamy dalej */
    }
    applyTheme();
    listeners.forEach((f) => f(current, prev));
  },
  reset() {
    settings.set({ ...DEFAULTS });
  },
  on(f: (s: Settings, prev: Settings) => void): () => void {
    listeners.add(f);
    return () => listeners.delete(f);
  },
};

export const grayValue = (s: Settings) => 255 - s.darkness;
export const css = (c: RGB) => `rgb(${c[0]},${c[1]},${c[2]})`;

/** Kolor po przyciemnieniu: mieszanie z szarością tła (niższy kontrast dla danego oka). */
export function effColor(s: Settings, which: 1 | 2): RGB {
  const g = grayValue(s);
  const c = which === 1 ? s.c1 : s.c2;
  const t = (which === 1 ? s.i1 : s.i2) / 100;
  return c.map((v) => Math.round(g + (v - g) * t)) as RGB;
}

/** Który kolor (1 lub 2) ma kontur k-tego elementu. */
export function outlineIndex(s: Settings, k: number): 1 | 2 {
  if (s.outlineMode === 'c1') return 1;
  if (s.outlineMode === 'c2') return 2;
  return k % 2 === 0 ? 1 : 2;
}

export function applyTheme() {
  const g = grayValue(current);
  const root = document.documentElement.style;
  root.setProperty('--bg', `rgb(${g},${g},${g})`);
  const fg = g < 140 ? 'rgb(235,235,235)' : 'rgb(25,25,25)';
  root.setProperty('--fg', fg);
  const p = g < 140 ? Math.min(255, g + 28) : Math.max(0, g - 28);
  root.setProperty('--panel', `rgb(${p},${p},${p})`);
  const b = g < 140 ? Math.min(255, g + 60) : Math.max(0, g - 60);
  root.setProperty('--border', `rgb(${b},${b},${b})`);
}
