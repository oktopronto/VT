import './style.css';
import { applyTheme } from './settings';
import { showGallery } from './ui/gallery';

applyTheme();

// iPad: blokada gestów przeglądarki (zoom szczypaniem, menu kontekstowe).
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('contextmenu', (e) => e.preventDefault());

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

showGallery();
