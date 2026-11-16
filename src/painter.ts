import { drawings } from './db';
import { h } from './dom';
import type { Picture } from './images/types';
import { drawOutlines } from './outline';
import { css, effColor, settings, type Settings } from './settings';

/** Wewnętrzna rozdzielczość płótna (px). Obrazki mają viewBox 1000×1000. */
const N = 1400;
const S = N / 1000;
/** Limit pamięci na historię „cofnij” (bajty). */
const UNDO_BUDGET = 120 * 1024 * 1024;
const MASK_CACHE = 4;

type LayerKey = 'l1' | 'l2' | 'lf';
const LAYERS: LayerKey[] = ['l1', 'l2', 'lf'];

interface UndoEntry {
  x: number;
  y: number;
  w: number;
  h: number;
  data: ImageData[];
}

interface Stroke {
  pointerId: number;
  last: { x: number; y: number };
  mask: HTMLCanvasElement | null;
  target: LayerKey | null; // null = gumka
  color: string;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function canvas(w = N, hgt = N): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = hgt;
  return c;
}

function ctx2d(c: HTMLCanvasElement): CanvasRenderingContext2D {
  return c.getContext('2d', { willReadFrequently: false })!;
}

/**
 * Płótno do kolorowania.
 *
 * Farba trzymana jest w trzech warstwach: kolor 1, kolor 2 i „pełna paleta”.
 * Piksele warstw się wykluczają (malowanie jednym kolorem wymazuje go z pozostałych),
 * dzięki czemu zmiana koloru 1/2 albo przyciemnienia w ustawieniach przekolorowuje
 * już namalowane fragmenty, a tryb „zadanie” może policzyć pokrycie każdym kolorem.
 */
export class Painter {
  readonly el: HTMLDivElement;
  tool: 'brush' | 'eraser' = 'brush';
  onChange: () => void = () => {};

  private layers = {} as Record<LayerKey, HTMLCanvasElement>;
  private ctx = {} as Record<LayerKey, CanvasRenderingContext2D>;
  private before = {} as Record<LayerKey, HTMLCanvasElement>;
  private tmp = canvas();
  private tctx = ctx2d(this.tmp);
  private outline = canvas();
  private paths: { p: Path2D; rule: CanvasFillRule }[];
  private idmap: Uint8ClampedArray;
  private masks = new Map<number, HTMLCanvasElement>();
  private undoStack: UndoEntry[] = [];
  private undoBytes = 0;
  private stroke: Stroke | null = null;
  private penSeen = false;
  private saveTimer = 0;
  private dirty = false;
  private unsub: () => void;

  constructor(private pic: Picture) {
    const st = settings.get();
    this.el = h('div', { class: 'stage' });
    for (const k of LAYERS) {
      const c = canvas();
      c.className = 'layer';
      this.layers[k] = c;
      this.ctx[k] = ctx2d(c);
      this.before[k] = canvas();
    }
    this.el.append(this.layers.lf, this.layers.l1, this.layers.l2);
    this.outline.className = 'layer';
    drawOutlines(ctx2d(this.outline), pic, st, N);
    this.el.append(this.outline);

    this.paths = (pic.regions ?? []).map((r) => ({
      p: new Path2D(r.d),
      rule: r.evenodd ? 'evenodd' : 'nonzero',
    }));
    this.idmap = this.buildIdMap();

    this.el.addEventListener('pointerdown', this.down);
    this.el.addEventListener('pointermove', this.move);
    this.el.addEventListener('pointerup', this.up);
    this.el.addEventListener('pointercancel', this.up);
    this.el.addEventListener('lostpointercapture', this.up);
    this.unsub = settings.on(this.settingsChanged);
    document.addEventListener('visibilitychange', this.flushOnHide);
    void this.load();
  }

  destroy() {
    this.unsub();
    document.removeEventListener('visibilitychange', this.flushOnHide);
    void this.save();
  }

  get canUndo() {
    return this.undoStack.length > 0;
  }

  // ——— Mapa obszarów ———

  /** Kod obszaru k w kanale R mapy (odstępy co 4, żeby wygładzone krawędzie nie udawały innych obszarów). */
  private static code(k: number) {
    return (k + 1) * 4;
  }

  private buildIdMap(): Uint8ClampedArray {
    const c = canvas();
    const x = c.getContext('2d', { willReadFrequently: true })!;
    x.setTransform(S, 0, 0, S, 0, 0);
    this.paths.forEach(({ p, rule }, k) => {
      x.fillStyle = `rgb(${Painter.code(k)},0,0)`;
      x.fill(p, rule);
    });
    return x.getImageData(0, 0, N, N).data;
  }

  /** Obszar pod punktem (-1 = tło). Na krawędziach szuka najbliższego „czystego” piksela. */
  private regionAt(px: number, py: number): number {
    const read = (x: number, y: number): number | null => {
      if (x < 0 || y < 0 || x >= N || y >= N) return null;
      const i = (y * N + x) * 4;
      const a = this.idmap[i + 3];
      if (a === 0) return -1;
      const r = this.idmap[i];
      if (a === 255 && r % 4 === 0 && r > 0) return r / 4 - 1;
      return null;
    };
    const cx = Math.round(px);
    const cy = Math.round(py);
    const v = read(cx, cy);
    if (v !== null) return v;
    for (let rad = 1; rad <= 10; rad++) {
      for (let dx = -rad; dx <= rad; dx++) {
        for (const dy of [-rad, rad]) {
          const a = read(cx + dx, cy + dy);
          if (a !== null) return a;
          const b = read(cx + dy, cy + dx);
          if (b !== null) return b;
        }
      }
    }
    return -1;
  }

  /** Maska obszaru: jego widoczne piksele, poszerzone o 2 px (żeby wygładzone krawędzie nie zostawiały szpar pod konturem). */
  private maskFor(k: number): HTMLCanvasElement {
    const hit = this.masks.get(k);
    if (hit) {
      this.masks.delete(k);
      this.masks.set(k, hit);
      return hit;
    }
    const c = canvas();
    const x = ctx2d(c);
    const img = x.createImageData(N, N);
    const d = img.data;
    const m = this.idmap;
    if (k === -1) {
      for (let i = 3; i < d.length; i += 4) if (m[i] === 0) d[i] = 255;
    } else {
      const code = Painter.code(k);
      for (let i = 0; i < d.length; i += 4) if (m[i] === code && m[i + 3] === 255) d[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    const t = this.tctx;
    t.globalCompositeOperation = 'source-over';
    t.clearRect(0, 0, N, N);
    t.drawImage(c, 0, 0);
    for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      x.drawImage(this.tmp, dx, dy);
    }

    this.masks.set(k, c);
    if (this.masks.size > MASK_CACHE) {
      const oldest = this.masks.keys().next().value as number;
      this.masks.delete(oldest);
    }
    return c;
  }

  // ——— Rysowanie ———

  private toCanvas(e: PointerEvent) {
    const r = this.el.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * N, y: ((e.clientY - r.top) / r.height) * N };
  }

  private width(e: PointerEvent) {
    const base = settings.get().brushSize * S;
    if (e.pointerType === 'pen') return base * (0.5 + (e.pressure || 0.5));
    return base;
  }

  private brushTarget(st: Settings): { target: LayerKey; color: string } {
    let c = st.lastColor;
    if (st.paletteMode === 'two' && c !== 'c1' && c !== 'c2') c = 'c1';
    if (c === 'c1') return { target: 'l1', color: css(effColor(st, 1)) };
    if (c === 'c2') return { target: 'l2', color: css(effColor(st, 2)) };
    return { target: 'lf', color: c };
  }

  private down = (e: PointerEvent) => {
    if (e.pointerType === 'pen') this.penSeen = true;
    // Odrzucanie dłoni: po użyciu rysika ignorujemy dotyk palcem.
    if (e.pointerType === 'touch' && this.penSeen) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (this.stroke) return;
    e.preventDefault();
    this.el.setPointerCapture(e.pointerId);

    const st = settings.get();
    const p = this.toCanvas(e);
    const mask = st.clip ? this.maskFor(this.regionAt(p.x, p.y)) : null;
    const { target, color } = this.brushTarget(st);

    for (const k of LAYERS) {
      const b = ctx2d(this.before[k]);
      b.clearRect(0, 0, N, N);
      b.drawImage(this.layers[k], 0, 0);
    }
    this.stroke = {
      pointerId: e.pointerId,
      last: p,
      mask,
      target: this.tool === 'eraser' ? null : target,
      color,
      minX: N,
      minY: N,
      maxX: 0,
      maxY: 0,
    };
    this.segment(p, p, this.width(e));
  };

  private move = (e: PointerEvent) => {
    const st = this.stroke;
    if (!st || e.pointerId !== st.pointerId) return;
    e.preventDefault();
    const events = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
    for (const ev of events.length ? events : [e]) {
      const p = this.toCanvas(ev);
      this.segment(st.last, p, this.width(ev));
      st.last = p;
    }
  };

  private up = (e: PointerEvent) => {
    const st = this.stroke;
    if (!st || e.pointerId !== st.pointerId) return;
    this.stroke = null;
    const x = Math.max(0, Math.floor(st.minX));
    const y = Math.max(0, Math.floor(st.minY));
    const w = Math.min(N, Math.ceil(st.maxX)) - x;
    const hh = Math.min(N, Math.ceil(st.maxY)) - y;
    if (w > 0 && hh > 0) {
      this.pushUndo({
        x,
        y,
        w,
        h: hh,
        data: LAYERS.map((k) => ctx2d(this.before[k]).getImageData(x, y, w, hh)),
      });
    }
    this.changed();
  };

  private segment(a: { x: number; y: number }, b: { x: number; y: number }, w: number) {
    const st = this.stroke!;
    const r = w / 2 + 2;
    const bx = Math.max(0, Math.floor(Math.min(a.x, b.x) - r));
    const by = Math.max(0, Math.floor(Math.min(a.y, b.y) - r));
    const bw = Math.min(N, Math.ceil(Math.max(a.x, b.x) + r)) - bx;
    const bh = Math.min(N, Math.ceil(Math.max(a.y, b.y) + r)) - by;
    if (bw <= 0 || bh <= 0) return;

    const t = this.tctx;
    t.globalCompositeOperation = 'source-over';
    t.clearRect(0, 0, bw, bh);
    t.fillStyle = t.strokeStyle = st.color;
    if (Math.hypot(b.x - a.x, b.y - a.y) < 0.5) {
      t.beginPath();
      t.arc(b.x - bx, b.y - by, w / 2, 0, Math.PI * 2);
      t.fill();
    } else {
      t.lineWidth = w;
      t.lineCap = 'round';
      t.beginPath();
      t.moveTo(a.x - bx, a.y - by);
      t.lineTo(b.x - bx, b.y - by);
      t.stroke();
    }
    if (st.mask) {
      t.globalCompositeOperation = 'destination-in';
      t.drawImage(st.mask, bx, by, bw, bh, 0, 0, bw, bh);
    }
    for (const k of LAYERS) {
      const c = this.ctx[k];
      c.globalCompositeOperation = k === st.target ? 'source-over' : 'destination-out';
      c.drawImage(this.tmp, 0, 0, bw, bh, bx, by, bw, bh);
      c.globalCompositeOperation = 'source-over';
    }
    st.minX = Math.min(st.minX, bx);
    st.minY = Math.min(st.minY, by);
    st.maxX = Math.max(st.maxX, bx + bw);
    st.maxY = Math.max(st.maxY, by + bh);
  }

  // ——— Cofnij / wyczyść ———

  private pushUndo(u: UndoEntry) {
    this.undoStack.push(u);
    this.undoBytes += u.w * u.h * 4 * u.data.length;
    while (this.undoBytes > UNDO_BUDGET && this.undoStack.length > 1) {
      const old = this.undoStack.shift()!;
      this.undoBytes -= old.w * old.h * 4 * old.data.length;
    }
  }

  undo() {
    const u = this.undoStack.pop();
    if (!u) return;
    this.undoBytes -= u.w * u.h * 4 * u.data.length;
    LAYERS.forEach((k, i) => this.ctx[k].putImageData(u.data[i], u.x, u.y));
    this.recolor();
    this.changed();
  }

  clear() {
    this.pushUndo({ x: 0, y: 0, w: N, h: N, data: LAYERS.map((k) => this.ctx[k].getImageData(0, 0, N, N)) });
    for (const k of LAYERS) this.ctx[k].clearRect(0, 0, N, N);
    this.changed();
  }

  // ——— Ustawienia ———

  /** Przekolorowanie warstw koloru 1 i 2 po zmianie RGB / przyciemnienia / szarości. */
  private recolor() {
    const st = settings.get();
    const pairs: [LayerKey, 1 | 2][] = [
      ['l1', 1],
      ['l2', 2],
    ];
    for (const [k, which] of pairs) {
      const c = this.ctx[k];
      c.globalCompositeOperation = 'source-in';
      c.fillStyle = css(effColor(st, which));
      c.fillRect(0, 0, N, N);
      c.globalCompositeOperation = 'source-over';
    }
  }

  private settingsChanged = (st: Settings, prev: Settings) => {
    const changed = (keys: (keyof Settings)[]) => keys.some((k) => JSON.stringify(st[k]) !== JSON.stringify(prev[k]));
    const colorKeys: (keyof Settings)[] = ['c1', 'c2', 'i1', 'i2', 'darkness'];
    if (changed([...colorKeys, 'lineWidth', 'outlineMode'])) drawOutlines(ctx2d(this.outline), this.pic, st, N);
    if (changed(colorKeys)) this.recolor();
  };

  // ——— Zapis / odczyt ———

  private get key() {
    return this.pic.id;
  }

  private changed() {
    this.dirty = true;
    this.onChange();
    clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => void this.save(), 800);
  }

  private flushOnHide = () => {
    if (document.visibilityState === 'hidden') void this.save();
  };

  private async save() {
    clearTimeout(this.saveTimer);
    if (!this.dirty) return;
    this.dirty = false;
    const blob = (c: HTMLCanvasElement) =>
      new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob'))), 'image/png'));
    try {
      const [l1, l2, lf] = await Promise.all(LAYERS.map((k) => blob(this.layers[k])));
      await drawings.put(this.key, { l1, l2, lf, updated: Date.now() });
    } catch {
      this.dirty = true;
    }
  }

  private async load() {
    const saved = await drawings.get(this.key);
    if (!saved) return;
    for (const k of LAYERS) {
      try {
        const bmp = await createImageBitmap(saved[k]);
        this.ctx[k].drawImage(bmp, 0, 0, N, N);
        bmp.close();
      } catch {
        /* uszkodzony zapis warstwy — pomijamy */
      }
    }
    this.recolor();
  }
}
