export type Category = 'animals' | 'digits' | 'objects';

export interface Region {
  /** Ścieżka SVG w układzie viewBox 0 0 1000 1000. */
  d: string;
  /** Reguła wypełnienia evenodd — dla kształtów z dziurami (np. cyfra 8). */
  evenodd?: boolean;
}

export interface Picture {
  id: string;
  name: string;
  category: Category;
  /** 1 = łatwy, 2 = średni, 3 = trudny */
  level: 1 | 2 | 3;
  /**
   * Obszary do kolorowania, w kolejności rysowania:
   * późniejsze leżą NA wcześniejszych (np. oko na głowie).
   */
  regions?: Region[];
  /** Linie dekoracyjne (wąsy, usta) — tylko kontur, bez wypełnienia. */
  lines?: string[];
}

export const CATEGORIES: { id: Category; name: string; icon: string }[] = [
  { id: 'animals', name: 'Zwierzęta', icon: '🐱' },
  { id: 'digits', name: 'Cyfry', icon: '🔢' },
  { id: 'objects', name: 'Przedmioty', icon: '☂️' },
];
