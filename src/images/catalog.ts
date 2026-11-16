import type { Picture } from './types';

// Pomocnik: elipsa jako ścieżka SVG.
const ellipse = (cx: number, cy: number, rx: number, ry: number) =>
  `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx - rx} ${cy} Z`;

// ——— Gotowe obrazki ———

const catHead: Picture = {
  id: 'cat-head',
  name: 'Kocia głowa',
  category: 'animals',
  level: 1,
  regions: [
    { d: 'M 230 420 L 260 140 L 450 300 Z' }, // ucho L
    { d: 'M 770 420 L 740 140 L 550 300 Z' }, // ucho P
    { d: 'M 285 340 L 292 215 L 392 300 Z' }, // wnętrze ucha L
    { d: 'M 715 340 L 708 215 L 608 300 Z' }, // wnętrze ucha P
    { d: ellipse(500, 560, 300, 260) }, // głowa
    { d: ellipse(390, 520, 55, 70) }, // oko L
    { d: ellipse(610, 520, 55, 70) }, // oko P
    { d: 'M 462 618 L 538 618 L 500 662 Z' }, // nos
  ],
  lines: [
    'M 500 662 Q 475 712 432 692',
    'M 500 662 Q 525 712 568 692',
    'M 340 640 L 150 610',
    'M 340 668 L 150 692',
    'M 660 640 L 850 610',
    'M 660 668 L 850 692',
  ],
};

const digit8: Picture = {
  id: 'digit-8',
  name: 'Cyfra 8',
  category: 'digits',
  level: 3,
  regions: [
    {
      evenodd: true,
      d:
        'M 399.7 471.35 A 190 190 0 1 1 600.3 471.35 A 230 230 0 1 1 399.7 471.35 Z ' +
        ellipse(500, 310, 85, 85) +
        ' ' +
        ellipse(500, 690, 110, 110),
    },
  ],
};

const ball: Picture = {
  id: 'ball',
  name: 'Piłka',
  category: 'objects',
  level: 1,
  regions: [
    { d: 'M 500 160 A 340 340 0 0 0 500 840 Q 150 500 500 160 Z' },
    { d: 'M 500 160 Q 150 500 500 840 L 500 160 Z' },
    { d: 'M 500 160 L 500 840 Q 850 500 500 160 Z' },
    { d: 'M 500 160 Q 850 500 500 840 A 340 340 0 0 0 500 160 Z' },
    { d: ellipse(500, 262, 55, 55) },
  ],
};

// ——— Pełny katalog (obrazki bez `regions` są jeszcze w przygotowaniu) ———

const todo = (id: string, name: string, category: Picture['category'], level: Picture['level']): Picture => ({
  id,
  name,
  category,
  level,
});

export const PICTURES: Picture[] = [
  // Zwierzęta
  catHead,
  todo('fish', 'Ryba', 'animals', 1),
  todo('butterfly', 'Motyl', 'animals', 1),
  todo('cat-sitting', 'Kot siedzący', 'animals', 2),
  todo('cat-sleeping', 'Kot śpiący', 'animals', 2),
  todo('owl', 'Sowa', 'animals', 2),
  todo('dog', 'Pies', 'animals', 2),
  todo('cat-yarn', 'Kot z kłębkiem', 'animals', 3),
  todo('kitten-basket', 'Kotek w koszu', 'animals', 3),
  todo('cat-window', 'Kot w oknie', 'animals', 3),
  // Cyfry
  todo('digit-1', 'Cyfra 1', 'digits', 1),
  todo('digit-0', 'Cyfra 0', 'digits', 1),
  todo('digit-7', 'Cyfra 7', 'digits', 1),
  todo('digit-2', 'Cyfra 2', 'digits', 2),
  todo('digit-3', 'Cyfra 3', 'digits', 2),
  todo('digit-4', 'Cyfra 4', 'digits', 2),
  todo('digit-5', 'Cyfra 5', 'digits', 2),
  todo('digit-6', 'Cyfra 6', 'digits', 3),
  digit8,
  todo('digit-9', 'Cyfra 9', 'digits', 3),
  // Przedmioty
  ball,
  todo('mug', 'Kubek', 'objects', 1),
  todo('ice-cream', 'Lody', 'objects', 1),
  todo('umbrella', 'Parasol', 'objects', 2),
  todo('house', 'Domek', 'objects', 2),
  todo('dress', 'Sukienka', 'objects', 2),
  todo('scissors', 'Nożyczki', 'objects', 2),
  todo('car', 'Samochód', 'objects', 3),
  todo('bike', 'Rower', 'objects', 3),
  todo('clock', 'Zegar', 'objects', 3),
];
