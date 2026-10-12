// Layout check: plays through a game in real Chromium (Playwright) and takes screenshots
// at phone (360×780), laptop (1366×768) and TV (1920×1080) sizes, in English and Arabic.
// Fails if any screen scrolls sideways or the page logs an error.
// Run: npm run shots   (needs Playwright installed globally; serves the site on a local port)
const path = require('path');
const fs = require('fs');
const http = require('http');
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'shots');
fs.mkdirSync(outDir, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});

let problems = 0;
const fail = (m) => { problems++; console.log('  ✗ ' + m); };
const pass = (m) => console.log('  ✓ ' + m);

async function run(browser, base, { lang, w, h, tag, tv }) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: 'reduce', locale: lang === 'ar' ? 'ar-SA' : 'en-GB' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => { window.__JB_TEST__ = true; window.__JB_TEST_SPEED = 0.02; });
  await page.goto(base);
  await page.waitForSelector('.hero');
  const shot = async (name) => {
    await page.waitForTimeout(120);
    const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (wide) fail(tag + ' ' + name + ': scrolls sideways');
    await page.screenshot({ path: path.join(outDir, tag + '-' + name + '.png'), fullPage: !tv });
  };
  const clickText = async (re) => { const b = page.locator('button', { hasText: re }).first(); await b.click(); await page.waitForTimeout(60); };
  const closeFlash = async () => { await page.waitForTimeout(80); const f = page.locator('.flash'); if (await f.count()) await f.first().click(); await page.waitForTimeout(60); };
  const game = () => page.evaluate(() => window.__JB.store.get(window.__JB.K.current));
  const tile = async (pred) => {
    const g = await game();
    const b = g.boards.find((x) => x.round === g.round);
    const cell = b.cells.find((c) => c.status === 'open' && pred(c));
    const i = (cell.tier - 1) * b.cats.length + b.cats.findIndex((c) => c.id === cell.cat);
    await page.locator('.board .tile').nth(i).click(); await page.waitForTimeout(80);
  };
  if (tv) {
    // TV: set the game up on "this screen as the TV" and capture the big views.
    await page.locator('.btn-gold').first().click(); // new game
    await page.locator('.btn-gold').last().click();  // start
    const tvOn = async () => { await page.locator('[aria-label="TV mode"], [aria-label="وضع التلفزيون"]').first().click(); await page.locator('.modal .btn-gold').click(); await page.waitForTimeout(150); };
    const tvOff = async () => { await page.locator('.tvbar .pillbtn').last().click(); await page.waitForTimeout(80); };
    await tvOn(); await shot('tv-board'); await tvOff();
    await tile((c) => !c.wager && c.tier === 4);
    await page.locator('.buzzbtn').first().click(); await page.waitForTimeout(60);
    await tvOn(); await shot('tv-clue'); await tvOff();
    await page.locator('.actions .btn-right').click(); await closeFlash();
    await tvOn(); await shot('tv-reveal'); await tvOff();
    await page.locator('.actions .btn-gold').click(); await page.waitForTimeout(60);
    await tile((c) => c.wager); await closeFlash();
    await tvOn(); await shot('tv-riskit'); await tvOff();
    await page.locator('.wagerin').fill('0'); await page.locator('.wagerbox .btn-gold').click(); await page.waitForTimeout(60);
    await page.locator('.actions .btn-wrong').click(); await closeFlash();
    await page.locator('.actions .btn-gold').click(); await page.waitForTimeout(60);
    for (let r = 0; r < 2; r++) {
      await page.locator('[aria-label="Menu"], [aria-label="القائمة"]').first().click();
      await page.locator('.sheet .btn', { hasText: /End this round|أنهِ الجولة/ }).click();
      await page.locator('.modal .btn-gold').click(); await page.waitForTimeout(80);
      if (r === 0) { await tvOn(); await shot('tv-between'); await tvOff(); }
      await page.locator('.btn-gold').first().click(); await page.waitForTimeout(80);
    }
    await page.locator('.actions .btn-gold').click(); // collect wagers
    const n = await page.locator('.wagerrow').count();
    for (let i = 0; i < n; i++) {
      await page.locator('.wagerrow .btn-gold').first().click();
      await page.locator('.passcover .btn-gold').click();
      await page.locator('.wagerin').fill('0'); await page.locator('.passcover .btn-gold').click();
      await page.locator('.passcover .btn-gold').click(); await page.waitForTimeout(40);
    }
    await tvOn(); await shot('tv-final-wagers'); await tvOff();
    await page.locator('.actions .btn-gold').click(); await page.waitForTimeout(80);
    await tvOn(); await shot('tv-final-clue'); await tvOff();
    await page.locator('.actions .btn-gold').click(); await page.waitForTimeout(60);
    await page.locator('.actions .btn-right').click(); await closeFlash();
    await tvOn(); await shot('tv-final-judge'); await tvOff();
    while (await page.locator('.actions .btn-right').count()) { await page.locator('.actions .btn-right').click(); await closeFlash(); }
    await page.locator('.actions .btn-gold').click(); await page.waitForTimeout(80);
    await tvOn(); await shot('tv-results'); await tvOff();
  } else {
    await shot('home');
    await page.locator('.btn-gold').first().click(); await page.waitForTimeout(60);
    await page.locator('.btn-ghost', { hasText: /\+|＋/ }).first().click();
    await shot('setup');
    await page.locator('.btn-gold').last().click(); await page.waitForTimeout(100);
    await shot('board');
    await tile((c) => !c.wager && c.tier === 5);
    await shot('clue-open');
    await page.locator('.buzzbtn').nth(1).click(); await page.waitForTimeout(60);
    await shot('clue-answer');
    await page.locator('.actions .btn-wrong').click(); await closeFlash();
    await shot('clue-after-wrong');
    await page.locator('.buzzbtn').nth(0).click(); await page.locator('.actions .btn-right').click(); await closeFlash();
    await shot('clue-reveal');
    await page.locator('.actions .btn-gold').click(); await page.waitForTimeout(60);
    await tile((c) => c.wager); await closeFlash();
    await shot('riskit-wager');
    await page.locator('.wagerin').fill('400'); await page.locator('.wagerbox .btn-gold').click(); await page.waitForTimeout(60);
    await shot('riskit-clue');
    await page.locator('.actions .btn-right').click(); await closeFlash();
    await page.locator('.wrongbtn').click(); await page.waitForTimeout(60);
    await shot('this-is-wrong');
    await page.locator('.wrongsheet .btn-ghost').click(); await page.waitForTimeout(60);
    await page.locator('.actions .btn-gold').click(); await page.waitForTimeout(60);
    await page.locator('.scard.editable').first().click(); await page.waitForTimeout(60);
    await shot('fix-scores');
    await page.locator('.sheet .btn-gold').last().click(); await page.waitForTimeout(60);
    for (let r = 0; r < 2; r++) {
      await page.locator('[aria-label="Menu"], [aria-label="القائمة"]').first().click(); await page.waitForTimeout(60);
      if (r === 0) await shot('menu');
      await page.locator('.sheet .btn', { hasText: /End this round|أنهِ الجولة/ }).click();
      await page.locator('.modal .btn-gold').click(); await page.waitForTimeout(80);
      if (r === 0) await shot('between');
      await page.locator('.btn-gold').first().click(); await page.waitForTimeout(80);
      if (r === 0) await shot('round2-board');
    }
    await shot('final-category');
    await page.locator('.actions .btn-gold').click(); await page.waitForTimeout(60);
    await shot('final-wagers');
    const n = await page.locator('.wagerrow').count();
    for (let i = 0; i < n; i++) {
      await page.locator('.wagerrow .btn-gold').first().click(); await page.waitForTimeout(40);
      if (i === 0) await shot('final-pass-cover');
      await page.locator('.passcover .btn-gold').click(); await page.waitForTimeout(40);
      if (i === 0) await shot('final-wager-entry');
      await page.locator('.wagerin').fill('0'); await page.locator('.passcover .btn-gold').click(); await page.waitForTimeout(40);
      if (i === 0) await shot('final-locked');
      await page.locator('.passcover .btn-gold').click(); await page.waitForTimeout(40);
    }
    await page.locator('.actions .btn-gold').click(); await page.waitForTimeout(80);
    await shot('final-clue');
    await page.locator('.actions .btn-gold').click(); await page.waitForTimeout(60);
    await shot('final-judge');
    while (await page.locator('.actions .btn-right').count()) { await page.locator('.actions .btn-right').click(); await closeFlash(); }
    await page.locator('.actions .btn-gold').click(); await page.waitForTimeout(100);
    await shot('results');
    await page.locator('.topbar .iconbtn').first().click(); await page.waitForTimeout(60);
    await page.locator('[aria-label="Settings"], [aria-label="الإعدادات"]').first().click(); await page.waitForTimeout(80);
    await shot('settings');
  }
  if (errors.length) fail(tag + ': page errors: ' + errors.slice(0, 3).join(' | ')); else pass(tag + ': no page errors, no sideways scrolling');
  await ctx.close();
}

server.listen(0, async () => {
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  const browser = await chromium.launch();
  try {
    for (const lang of ['en', 'ar']) {
      await run(browser, base, { lang, w: 360, h: 780, tag: 'phone-' + lang });
      await run(browser, base, { lang, w: 1366, h: 768, tag: 'laptop-' + lang });
      await run(browser, base, { lang, w: 1920, h: 1080, tag: 'tv-' + lang, tv: true });
    }
  } catch (e) { fail('crashed: ' + (e.stack || e.message)); }
  await browser.close(); server.close();
  console.log(problems ? problems + ' problem(s)' : 'Screenshots in shots/');
  process.exit(problems ? 1 : 0);
});
