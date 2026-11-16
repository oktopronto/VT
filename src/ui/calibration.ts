import { h } from '../dom';
import { css, effColor, settings } from '../settings';
import { show } from './router';
import { colorSection, graySection, swapButton } from './settingsPanel';
import { showGallery } from './gallery';

/** Ekran testu okularów: każde oko powinno widzieć tylko „swój” kwadrat. */
export function showCalibration() {
  show((root) => {
    const sq1 = h('div', { class: 'calib-sq' }, '1');
    const sq2 = h('div', { class: 'calib-sq' }, '2');
    const paint = () => {
      const st = settings.get();
      const c1 = css(effColor(st, 1));
      const c2 = css(effColor(st, 2));
      sq1.style.borderColor = sq1.style.color = c1;
      sq1.style.background = `repeating-linear-gradient(45deg, ${c1} 0 14px, transparent 14px 28px)`;
      sq2.style.borderColor = sq2.style.color = c2;
      sq2.style.background = `repeating-linear-gradient(-45deg, ${c2} 0 14px, transparent 14px 28px)`;
    };
    paint();
    const unsub = settings.on(paint);

    const controls = h('div', { class: 'calib-controls' });
    const renderControls = () =>
      controls.replaceChildren(
        colorSection(1),
        colorSection(2),
        swapButton(renderControls),
        h('section', { class: 'card' }, h('h3', {}, 'Tło'), graySection()),
      );
    renderControls();

    root.append(
      h(
        'div',
        { class: 'calib' },
        h(
          'header',
          { class: 'topbar' },
          h('button', { class: 'icon-btn', type: 'button', onclick: showGallery, 'aria-label': 'Wróć' }, '←'),
          h('h1', {}, 'Kalibracja okularów'),
        ),
        h(
          'div',
          { class: 'calib-body' },
          h(
            'div',
            { class: 'calib-view' },
            h('div', { class: 'calib-squares' }, sq1, sq2),
            h(
              'ol',
              { class: 'calib-help' },
              h('li', {}, 'Załóż okulary anaglificzne.'),
              h('li', {}, 'Zasłoń jedno oko. Drugie oko powinno widzieć tylko jeden kwadrat — drugi ma zlać się z tłem.'),
              h('li', {}, 'Zamień oko i sprawdź drugi kwadrat.'),
              h('li', {}, 'Jeśli „niewłaściwy” kwadrat prześwituje, zmieniaj suwaki R/G/B lub intensywność, aż zniknie.'),
            ),
          ),
          controls,
        ),
      ),
    );
    return unsub;
  });
}
