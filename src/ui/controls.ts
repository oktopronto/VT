import { h } from '../dom';

/** Duży suwak przyjazny dotykowi: etykieta + wartość + input range. */
export function slider(opts: {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  unit?: string;
  accent?: string;
  onInput: (v: number) => void;
}) {
  const out = h('span', { class: 'slider-val' }, `${opts.value}${opts.unit ?? ''}`);
  const input = h('input', {
    type: 'range',
    min: opts.min,
    max: opts.max,
    step: opts.step ?? 1,
  });
  input.value = String(opts.value);
  if (opts.accent) input.style.accentColor = opts.accent;
  input.addEventListener('input', () => {
    const v = Number(input.value);
    out.textContent = `${v}${opts.unit ?? ''}`;
    opts.onInput(v);
  });
  const el = h('label', { class: 'slider' }, h('span', { class: 'slider-label' }, opts.label), out, input);
  return {
    el,
    set(v: number) {
      input.value = String(v);
      out.textContent = `${v}${opts.unit ?? ''}`;
    },
  };
}

/** Grupa przycisków — wybór jednej opcji. */
export function segmented<T extends string>(
  options: { value: T; label: string }[],
  value: T,
  onChange: (v: T) => void,
) {
  const btns = options.map((o) =>
    h('button', { class: 'seg' + (o.value === value ? ' on' : ''), type: 'button' }, o.label),
  );
  btns.forEach((b, i) =>
    b.addEventListener('click', () => {
      btns.forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      onChange(options[i].value);
    }),
  );
  return h('div', { class: 'segmented' }, ...btns);
}

export function toggle(label: string, value: boolean, onChange: (v: boolean) => void) {
  const input = h('input', { type: 'checkbox' });
  input.checked = value;
  input.addEventListener('change', () => onChange(input.checked));
  return h('label', { class: 'toggle' }, input, h('span', { class: 'toggle-ui' }), h('span', {}, label));
}
