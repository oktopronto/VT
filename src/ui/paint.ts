import { h } from '../dom';
import type { Picture } from '../images/types';
import { Painter } from '../painter';
import { BRUSH_SIZES, css, effColor, FULL_PALETTE, settings } from '../settings';
import { showGallery } from './gallery';
import { show } from './router';
import { openSettings } from './settingsPanel';

export function showPaint(pic: Picture) {
  show((root) => {
    const painter = new Painter(pic);
    const tools = h('aside', { class: 'toolbar' });
    const wrap = h('main', { class: 'stage-wrap' }, painter.el);

    const btn = (label: string, title: string, onclick: () => void, on = false, extra = '') =>
      h('button', { class: `tool${on ? ' on' : ''} ${extra}`, type: 'button', title, 'aria-label': title, onclick }, label);

    const renderTools = () => {
      const st = settings.get();
      const colors: { key: string; color: string; label?: string }[] = [
        { key: 'c1', color: css(effColor(st, 1)), label: '1' },
        { key: 'c2', color: css(effColor(st, 2)), label: '2' },
      ];
      if (st.paletteMode === 'full') for (const c of FULL_PALETTE) colors.push({ key: c, color: c });
      const active = st.paletteMode === 'two' && !['c1', 'c2'].includes(st.lastColor) ? 'c1' : st.lastColor;

      const swatches = colors.map((c) =>
        h(
          'button',
          {
            class: 'swatch' + (painter.tool === 'brush' && c.key === active ? ' on' : ''),
            type: 'button',
            style: { background: c.color },
            'aria-label': c.label ? `Kolor ${c.label}` : c.key,
            onclick: () => {
              painter.tool = 'brush';
              settings.set({ lastColor: c.key });
            },
          },
          c.label ? h('span', { class: 'swatch-num' }, c.label) : null,
        ),
      );

      const sizes = BRUSH_SIZES.map((sz, i) => {
        const b = btn('', `Pędzel ${['mały', 'średni', 'duży'][i]}`, () => settings.set({ brushSize: sz }), st.brushSize === sz, 'size');
        b.append(h('span', { class: 'dot', style: { width: `${8 + i * 9}px`, height: `${8 + i * 9}px` } }));
        return b;
      });

      tools.replaceChildren(
        btn('←', 'Wróć do galerii', showGallery),
        btn('⚙', 'Ustawienia', openSettings),
        h('div', { class: 'sep' }),
        h('div', { class: 'swatches' + (colors.length > 2 ? ' many' : '') }, ...swatches),
        h('div', { class: 'sep' }),
        btn('🧽', 'Gumka', () => {
          painter.tool = painter.tool === 'eraser' ? 'brush' : 'eraser';
          renderTools();
        }, painter.tool === 'eraser'),
        btn('🎯', st.clip ? 'W obrębie konturu: włączone' : 'W obrębie konturu: wyłączone', () => settings.set({ clip: !st.clip }), st.clip),
        h('div', { class: 'sizes' }, ...sizes),
        h('div', { class: 'sep' }),
        btn('↶', 'Cofnij', () => painter.undo(), false, painter.canUndo ? '' : 'dim'),
        btn('🗑', 'Wyczyść obrazek', () => {
          if (confirm('Wyczyścić cały obrazek?')) painter.clear();
        }),
      );
    };

    painter.onChange = renderTools;
    renderTools();
    const unsub = settings.on(renderTools);

    const fit = () => {
      const size = Math.floor(Math.min(wrap.clientWidth, wrap.clientHeight) - 16);
      painter.el.style.width = painter.el.style.height = `${Math.max(100, size)}px`;
    };
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);

    root.append(h('div', { class: 'paint' }, tools, wrap));
    fit();

    return () => {
      ro.disconnect();
      unsub();
      painter.destroy();
    };
  });
}
