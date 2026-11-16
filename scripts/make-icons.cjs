// Generuje ikony PWA (PNG) z SVG. Uruchom: node scripts/make-icons.cjs (wymaga Playwright).
const { chromium } = require('playwright');
const path = require('path');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#3c3c3c"/>
  <circle cx="200" cy="256" r="120" fill="none" stroke="#ff0000" stroke-width="40"/>
  <circle cx="312" cy="256" r="120" fill="none" stroke="#0000ff" stroke-width="40"/>
</svg>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const size of [180, 192, 512]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<style>*{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
    await page.screenshot({ path: path.join(__dirname, '..', 'public', `icon-${size}.png`) });
  }
  await browser.close();
})();
