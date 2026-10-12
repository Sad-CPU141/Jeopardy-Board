// Layout check: plays through a game in real Chromium (Playwright) and takes screenshots
// at phone (360×780), laptop (1366×768) and TV (1920×1080) sizes. Also the clue editor and picture/sound clues.
// Fails if any screen scrolls sideways or the page logs an error.
// Run: npm run shots   (needs Playwright installed globally; serves the site on a local port)
const path = require('path');
const fs = require('fs');
const http = require('http');
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'shots');
fs.mkdirSync(outDir, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
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
    const tvOn = async () => { await page.locator('[aria-label="TV mode"]').first().click(); await page.locator('.modal .btn-gold').click(); await page.waitForTimeout(150); };
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
      await page.locator('[aria-label="Menu"]').first().click();
      await page.locator('.sheet .btn', { hasText: /End this round/ }).click();
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
      await page.locator('[aria-label="Menu"]').first().click(); await page.waitForTimeout(60);
      if (r === 0) await shot('menu');
      await page.locator('.sheet .btn', { hasText: /End this round/ }).click();
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
    await page.locator('[aria-label="Settings"]').first().click(); await page.waitForTimeout(80);
    await shot('settings');
  }
  if (errors.length) fail(tag + ': page errors: ' + errors.slice(0, 3).join(' | ')); else pass(tag + ': no page errors, no sideways scrolling');
  await ctx.close();
}

// Picture and sound clues + the clue editor. A game made only of the picture/sound categories
// (plus a few others) is saved with the same engine the app uses, then played through the UI.
async function media(browser, base, { w, h, tag, tv }) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => { window.__JB_TEST__ = true; window.__JB_TEST_SPEED = 0.02; });
  await page.goto(base); await page.waitForSelector('.hero');
  const shot = async (name) => {
    await page.waitForTimeout(250);
    const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (wide) fail(tag + ' ' + name + ': scrolls sideways');
    await page.screenshot({ path: path.join(outDir, tag + '-' + name + '.png'), fullPage: !tv });
  };
  await page.evaluate(async () => {
    const J = window.__JB; const B = J.BANK;
    const keep = ['flags', 'shapes', 'sounds', 'capitals', 'space', 'music'];
    const rules = J.cleanRules({ rounds: 1, final: false, exclude: B.cats.map((c) => c.id).filter((id) => !keep.includes(id)) });
    let g = J.createGame([{ name: 'Falcons' }, { name: 'Leopards' }], rules, { bank: B, recent: {}, catSeen: {}, gameNo: 1, rand: Math.random }, Date.now());
    g = { ...g, boards: g.boards.map((b) => ({ ...b, cells: b.cells.map((c) => ({ ...c, wager: 0 })) })) };
    J.store.set(J.K.current, g); await J.store.flush();
  });
  await page.reload(); await page.waitForSelector('.hero');
  await page.locator('.resume').click(); await page.waitForTimeout(150);
  const openTile = async (cat, tier) => {
    const g = await page.evaluate(() => window.__JB.store.get(window.__JB.K.current));
    const b = g.boards[0]; const i = (tier - 1) * b.cats.length + b.cats.findIndex((c) => c.id === cat);
    await page.locator('.board .tile').nth(i).click(); await page.waitForTimeout(150);
  };
  const tvOn = async () => { await page.locator('[aria-label="TV mode"]').first().click(); await page.locator('.modal .btn-gold').click(); await page.waitForTimeout(250); };
  const tvOff = async () => { await page.locator('.tvbar .pillbtn').last().click(); await page.waitForTimeout(80); };
  await openTile('flags', 3);
  if (tv) { await tvOn(); await shot('media-flag'); await tvOff(); } else await shot('media-flag');
  await page.locator('.actions .btn-ghost').last().click(); await page.waitForTimeout(60); // nobody
  if (tv) {
    await tvOn(); await shot('media-flag-reveal');
    const fits = await page.evaluate(() => { const c = document.querySelector('.qcard'); return c ? Math.round(c.getBoundingClientRect().bottom) + '/' + window.innerHeight : 'none'; });
    const [b, hh] = fits.split('/').map(Number);
    if (b <= hh) pass(tag + ': picture clue with its response fits on the TV screen (' + fits + ')'); else fail(tag + ': picture clue runs off the TV screen (' + fits + ')');
    await tvOff();
  }
  await page.locator('.actions .btn-gold').click(); await page.waitForTimeout(60);
  await openTile('shapes', 2);
  if (tv) { await tvOn(); await shot('media-shape'); await tvOff(); } else await shot('media-shape');
  await page.locator('.actions .btn-ghost').last().click(); await page.locator('.actions .btn-gold').click(); await page.waitForTimeout(60);
  await openTile('sounds', 1);
  await page.locator('.mctl .btn-gold').click(); await page.waitForTimeout(400);
  if (tv) { await tvOn(); await shot('media-sound'); await tvOff(); } else await shot('media-sound');
  const played = await page.evaluate(() => { const a = document.querySelector('audio'); return a ? { paused: a.paused, t: a.currentTime } : null; });
  if (!tv) { if (played && !played.paused) pass(tag + ': the sound clue plays in a real browser (audio element running)'); else fail(tag + ': sound did not start: ' + JSON.stringify(played)); }
  if (!tv) {
    await page.locator('[aria-label="Menu"]').click(); await page.locator('.sheet .menu2').last().click(); await page.waitForTimeout(80);
    await page.locator('.btn', { hasText: 'My clues' }).click(); await page.waitForTimeout(80);
    await page.locator('.btn-gold', { hasText: 'New pack' }).click(); await page.waitForTimeout(80);
    await page.locator('.btn', { hasText: 'Add a category' }).click();
    await page.locator('.sheet input[dir="auto"]').fill('Family Trivia'); await page.locator('.sheet .btn-gold').click(); await page.waitForTimeout(60);
    await shot('editor-pack');
    await page.locator('.btn-gold', { hasText: 'Add a clue' }).click(); await page.locator('.typegrid .btn', { hasText: 'Picture' }).click(); await page.waitForTimeout(80);
    await page.locator('input[type=file]').setInputFiles(path.join(root, 'icons/icon-512.png')); await page.waitForTimeout(500);
    await page.locator('textarea.input').fill('This is the logo of the game you are playing.'); await page.locator('.qform input.input').first().fill('Jeopardy-Board');
    await shot('editor-clue');
    await page.locator('.btn-gold', { hasText: 'Save' }).click(); await page.waitForTimeout(150);
    const saved = await page.evaluate(() => { const p = window.__JB.store.get(window.__JB.K.packs); return p && p[0].clues[0] && p[0].clues[0].media && p[0].clues[0].media.src; });
    const stored = saved ? await page.evaluate((id) => window.__JB.fileStore.get(id.slice(4)).then((r) => !!(r && r.blob)), saved) : false;
    if (saved && stored) pass(tag + ': a picture clue saves with its file in IndexedDB'); else fail(tag + ': picture clue not saved: ' + saved);
    await shot('editor-list');
  }
  if (errors.length) fail(tag + ' media: page errors: ' + errors.slice(0, 3).join(' | ')); else pass(tag + ' media: no page errors, no sideways scrolling');
  await ctx.close();
}

server.listen(0, async () => {
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  const browser = await chromium.launch();
  try {
    const lang = 'en';
    await run(browser, base, { lang, w: 360, h: 780, tag: 'phone' });
    await run(browser, base, { lang, w: 1366, h: 768, tag: 'laptop' });
    await run(browser, base, { lang, w: 1920, h: 1080, tag: 'tv', tv: true });
    await media(browser, base, { w: 360, h: 780, tag: 'phone' });
    await media(browser, base, { w: 1920, h: 1080, tag: 'tv', tv: true });
  } catch (e) { fail('crashed: ' + (e.stack || e.message)); }
  await browser.close(); server.close();
  console.log(problems ? problems + ' problem(s)' : 'Screenshots in shots/');
  process.exit(problems ? 1 : 0);
});
