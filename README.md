# VT — kolorowanki anaglificzne

Aplikacja webowa (PWA) do ćwiczeń antysupresyjnych w okularach anaglificznych
(czerwono-niebieskich / czerwono-zielonych). Dziecko koloruje obrazki, których kontury
są w kolorze 1 lub 2 — każde oko widzi tylko „swoje” kontury.

## Uruchomienie lokalne

```bash
npm install
npm run dev
```

## Deploy

Każdy push na `main` buduje aplikację i publikuje ją na GitHub Pages
(`.github/workflows/deploy.yml`). Jednorazowo: **Settings → Pages → Source: GitHub Actions**.

## Instalacja na iPadzie

Safari → adres aplikacji → Udostępnij → **Dodaj do ekranu początkowego**.
Aplikacja działa wtedy na pełnym ekranie i offline, a dane (ustawienia, rysunki)
są trzymane tylko lokalnie na urządzeniu.

## Struktura

- `src/painter.ts` — silnik malowania (warstwy koloru 1/2/palety, maski obszarów, cofnij, zapis w IndexedDB)
- `src/outline.ts` — rysowanie konturów z zasłanianiem
- `src/images/catalog.ts` — katalog obrazków (ścieżki SVG w układzie 1000×1000)
- `src/settings.ts` — ustawienia (kolory RGB, intensywność, szarość tła, kontury, paleta)
- `src/ui/` — ekrany: galeria, malowanie, ustawienia, kalibracja

### Jak dodać obrazek

Obszary (`regions`) podaje się w kolejności rysowania — późniejsze leżą na wcześniejszych
i zasłaniają ich kontury. Kształty z dziurami: `evenodd: true`. Linie bez wypełnienia
(np. wąsy): `lines`.
