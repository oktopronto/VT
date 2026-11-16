const app = () => document.getElementById('app')!;
let cleanup: (() => void) | null = null;

/** Podmienia ekran. `render` zwraca opcjonalną funkcję sprzątającą. */
export function show(render: (root: HTMLElement) => (() => void) | void) {
  cleanup?.();
  cleanup = null;
  const root = app();
  root.replaceChildren();
  cleanup = render(root) || null;
}
