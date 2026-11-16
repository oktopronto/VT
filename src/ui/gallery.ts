import { drawings } from '../db';
import { h } from '../dom';
import { PICTURES } from '../images/catalog';
import { CATEGORIES, type Category } from '../images/types';
import { thumbnail } from '../outline';
import { settings } from '../settings';
import { showCalibration } from './calibration';
import { showPaint } from './paint';
import { show } from './router';
import { openSettings } from './settingsPanel';

const TAB_KEY = 'vt.tab';
const LEVELS = ['', 'Łatwy', 'Średni', 'Trudny'];

function lastTab(): Category {
  try {
    const t = localStorage.getItem(TAB_KEY);
    if (t === 'animals' || t === 'digits' || t === 'objects') return t;
  } catch {
    /* ignoruj */
  }
  return 'animals';
}

export function showGallery() {
  show((root) => {
    let tab = lastTab();
    let started = new Set<string>();
    const grid = h('div', { class: 'grid' });
    const tabs = h('nav', { class: 'tabs' });

    const renderTabs = () =>
      tabs.replaceChildren(
        ...CATEGORIES.map((c) =>
          h(
            'button',
            {
              class: 'tab' + (c.id === tab ? ' on' : ''),
              type: 'button',
              onclick: () => {
                tab = c.id;
                try {
                  localStorage.setItem(TAB_KEY, tab);
                } catch {
                  /* ignoruj */
                }
                renderTabs();
                renderGrid();
              },
            },
            h('span', { class: 'tab-icon' }, c.icon),
            c.name,
          ),
        ),
      );

    const renderGrid = () => {
      const st = settings.get();
      grid.replaceChildren(
        ...PICTURES.filter((p) => p.category === tab)
          .sort((a, b) => a.level - b.level)
          .map((p) => {
            const ready = !!p.regions;
            const card = h(
              'button',
              { class: 'pic' + (ready ? '' : ' soon'), type: 'button', disabled: !ready },
              h('div', { class: 'thumb' }, ready ? thumbnail(p, st) : h('span', { class: 'soon-label' }, 'wkrótce')),
              h(
                'div',
                { class: 'pic-meta' },
                h('span', { class: 'pic-name' }, p.name),
                h('span', { class: 'dots', title: LEVELS[p.level] }, '●'.repeat(p.level) + '○'.repeat(3 - p.level)),
              ),
              started.has(p.id) ? h('span', { class: 'badge' }, '✎') : null,
            );
            if (ready) card.addEventListener('click', () => showPaint(p));
            return card;
          }),
      );
    };

    renderTabs();
    renderGrid();
    void drawings.keys().then((k) => {
      started = new Set(k.map(String));
      renderGrid();
    });
    const unsub = settings.on(renderGrid);

    root.append(
      h(
        'div',
        { class: 'gallery' },
        h(
          'header',
          { class: 'topbar' },
          h('h1', {}, 'Kolorowanki'),
          h('div', { class: 'spacer' }),
          h('button', { class: 'btn', type: 'button', onclick: showCalibration }, '👓 Kalibracja'),
          h('button', { class: 'icon-btn', type: 'button', onclick: openSettings, 'aria-label': 'Ustawienia' }, '⚙'),
        ),
        tabs,
        grid,
      ),
    );
    return unsub;
  });
}
