import type { Picture } from './images/types';
import { css, effColor, outlineIndex, type Settings } from './settings';

/**
 * Rysuje kontury obrazka na canvasie z uwzględnieniem zasłaniania:
 * każdy kolejny obszar „wycina” kontury obszarów leżących pod nim
 * (np. podstawa ucha nie przechodzi przez głowę).
 */
export function drawOutlines(ctx: CanvasRenderingContext2D, pic: Picture, st: Settings, size: number) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, size, size);
  const k = size / 1000;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = st.lineWidth;
  const c1 = css(effColor(st, 1));
  const c2 = css(effColor(st, 2));
  let i = 0;
  for (const r of pic.regions ?? []) {
    const p = new Path2D(r.d);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fill(p, r.evenodd ? 'evenodd' : 'nonzero');
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = outlineIndex(st, i++) === 1 ? c1 : c2;
    ctx.stroke(p);
  }
  for (const d of pic.lines ?? []) {
    ctx.strokeStyle = outlineIndex(st, i++) === 1 ? c1 : c2;
    ctx.stroke(new Path2D(d));
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/** Miniatura do galerii. */
export function thumbnail(pic: Picture, st: Settings, size = 360): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  drawOutlines(c.getContext('2d')!, pic, st, size);
  return c;
}
