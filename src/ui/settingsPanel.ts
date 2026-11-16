import { h } from '../dom';
import { css, effColor, settings, type RGB, type Settings } from '../settings';
import { segmented, slider, toggle } from './controls';
import { showCalibration } from './calibration';

/** Sekcja jednego koloru: suwaki R, G, B + intensywność (przyciemnianie). */
export function colorSection(which: 1 | 2) {
  const st = settings.get();
  const key = which === 1 ? 'c1' : 'c2';
  const ikey = which === 1 ? 'i1' : 'i2';
  const swatch = h('span', { class: 'swatch-preview' });
  const paint = () => (swatch.style.background = css(effColor(settings.get(), which)));
  paint();

  const channel = (idx: 0 | 1 | 2, name: string, accent: string) =>
    slider({
      label: name,
      min: 0,
      max: 255,
      value: st[key][idx],
      accent,
      onInput: (v) => {
        const c = [...settings.get()[key]] as RGB;
        c[idx] = v;
        settings.set({ [key]: c } as Partial<Settings>);
        paint();
      },
    }).el;

  return h(
    'section',
    { class: 'card' },
    h('h3', {}, swatch, `Kolor ${which}`),
    channel(0, 'R', '#ff3b30'),
    channel(1, 'G', '#34c759'),
    channel(2, 'B', '#0a84ff'),
    slider({
      label: 'Intensywność',
      min: 0,
      max: 100,
      unit: ' %',
      value: st[ikey],
      onInput: (v) => {
        settings.set({ [ikey]: v } as Partial<Settings>);
        paint();
      },
    }).el,
  );
}

export function graySection() {
  return slider({
    label: 'Szarość tła (0 biały → 255 czarny)',
    min: 0,
    max: 255,
    value: settings.get().darkness,
    onInput: (v) => settings.set({ darkness: v }),
  }).el;
}

export function swapButton(after: () => void) {
  return h(
    'button',
    {
      class: 'btn',
      type: 'button',
      onclick: () => {
        const s = settings.get();
        settings.set({ c1: s.c2, c2: s.c1, i1: s.i2, i2: s.i1 });
        after();
      },
    },
    '⇄ Zamień kolory 1 ↔ 2',
  );
}

/** Wysuwany panel ustawień (zmiany widać na żywo pod spodem). */
export function openSettings() {
  const overlay = h('div', { class: 'overlay' });
  const panel = h('div', { class: 'panel' });
  overlay.append(panel);

  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  const render = () => {
    const st = settings.get();
    panel.replaceChildren(
      h(
        'header',
        { class: 'panel-head' },
        h('h2', {}, 'Ustawienia'),
        h('button', { class: 'icon-btn', type: 'button', onclick: close, 'aria-label': 'Zamknij' }, '✕'),
      ),
      colorSection(1),
      colorSection(2),
      swapButton(render),
      h('section', { class: 'card' }, h('h3', {}, 'Tło'), graySection()),
      h(
        'section',
        { class: 'card' },
        h('h3', {}, 'Kontury'),
        segmented(
          [
            { value: 'mixed', label: 'Mieszane' },
            { value: 'c1', label: 'Kolor 1' },
            { value: 'c2', label: 'Kolor 2' },
          ],
          st.outlineMode,
          (v) => settings.set({ outlineMode: v }),
        ),
        slider({
          label: 'Grubość konturów',
          min: 3,
          max: 24,
          value: st.lineWidth,
          onInput: (v) => settings.set({ lineWidth: v }),
        }).el,
      ),
      h(
        'section',
        { class: 'card' },
        h('h3', {}, 'Malowanie'),
        segmented(
          [
            { value: 'two', label: 'Tylko kolor 1 i 2' },
            { value: 'full', label: 'Pełna paleta' },
          ],
          st.paletteMode,
          (v) => settings.set({ paletteMode: v }),
        ),
        toggle('Pędzel w obrębie konturu', st.clip, (v) => settings.set({ clip: v })),
      ),
      h(
        'div',
        { class: 'row' },
        h('button', { class: 'btn', type: 'button', onclick: () => { close(); showCalibration(); } }, '👓 Kalibracja okularów'),
        h(
          'button',
          {
            class: 'btn ghost',
            type: 'button',
            onclick: () => {
              if (confirm('Przywrócić ustawienia domyślne?')) {
                settings.reset();
                render();
              }
            },
          },
          'Przywróć domyślne',
        ),
      ),
    );
  };
  render();
  document.body.append(overlay);
}
