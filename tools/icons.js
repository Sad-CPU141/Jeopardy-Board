// Renders the app icons from the logo mark (SVG) with Playwright. Run: node tools/icons.js
// The mark: a 3×3 clue board in gold with one square lit in lime (a hidden Risk It square).
const path = require('path');
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const tiles = [];
for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) tiles.push(`<rect x="${10 + c * 15}" y="${12 + r * 15}" width="13" height="12" rx="3" fill="${r === 1 && c === 2 ? '#b6f23d' : '#ffc83d'}"/>`);
const mark = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%">
<defs><radialGradient id="g" cx="50%" cy="0%" r="90%"><stop offset="0" stop-color="#3a2f78"/><stop offset="1" stop-color="#0f0c21"/></radialGradient></defs>
<rect width="64" height="64" fill="url(#g)"/>
<g transform="translate(${pad} ${pad}) scale(${(64 - 2 * pad) / 64})">${tiles.join('')}</g></svg>`;
(async () => {
  const b = await chromium.launch();
  const out = [['icon-192.png', 192, 4], ['icon-512.png', 512, 4], ['apple-touch-icon.png', 180, 6], ['icon-maskable-512.png', 512, 13], ['favicon.png', 64, 1]];
  for (const [f, s, pad] of out) {
    const p = await b.newPage({ viewport: { width: s, height: s } });
    await p.setContent(`<html><body style="margin:0">${mark(pad)}</body></html>`);
    await p.screenshot({ path: path.join(__dirname, '..', 'icons', f) });
    await p.close();
  }
  await b.close(); console.log('icons done');
})();
