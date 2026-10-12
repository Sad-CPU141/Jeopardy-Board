// Jeopardy-Board tests: game rules (and hundreds of random games), what the TV is allowed to see,
// a click-through of the app in a simulated browser (jsdom, same approach as Khatfa),
// backup/restore, persistence, sound events, and the TV window link (BroadcastChannel).
// Run: npm test   (after npm install and npm run build)
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
let failures = 0, passes = 0;
const ok = (cond, msg) => { if (cond) { passes++; if (!process.env.QUIET) console.log('  ✓ ' + msg); } else { failures++; console.log('  ✗ ' + msg); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function boot({ idb = true, storage, speed, url, bc, navLang } = {}) {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/g, '').replace(/<link[^>]*>/g, '');
  const dom = new JSDOM(html, { url: url || 'https://sad-cpu141.github.io/Jeopardy-Board/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  w.__JB_TEST__ = true;
  w.addEventListener('error', (e) => { failures++; console.log('    PAGE ERROR:', e.error && (e.error.stack || e.error.message)); });
  w.console.error = (...a) => { failures++; console.log('    CONSOLE.ERROR:', String(a[0]).slice(0, 400)); };
  if (speed) w.__JB_TEST_SPEED = speed;
  if (navLang) { Object.defineProperty(w.navigator, 'language', { value: navLang, configurable: true }); Object.defineProperty(w.navigator, 'languages', { value: [navLang], configurable: true }); }
  if (bc) w.BroadcastChannel = globalThis.BroadcastChannel;
  w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
  w.scrollTo = () => {};
  w.navigator.vibrate = () => true;
  w.URL.createObjectURL = () => 'blob:test'; w.URL.revokeObjectURL = () => {};
  if (idb) { const fake = require('fake-indexeddb'); w.indexedDB = fake.indexedDB; w.IDBKeyRange = fake.IDBKeyRange; }
  if (storage) Object.entries(storage).forEach(([k, v]) => w.localStorage.setItem(k, v));
  for (const f of ['vendor/react.production.min.js', 'vendor/react-dom.production.min.js', 'bank.js', 'app.js']) w.eval(fs.readFileSync(path.join(root, f), 'utf8'));
  await sleep(150);
  return { dom, w, d: w.document, J: w.__JB };
}
const btn = (d, text) => [...d.querySelectorAll('button')].find((b) => b.textContent.replace(/\s+/g, ' ').trim().toLowerCase().includes(text.toLowerCase()) && !b.disabled);
async function click(w, el) { if (!el) throw new Error('missing element'); el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await sleep(25); }
async function type(w, el, value) { const set = Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, 'value').set; set.call(el, value); el.dispatchEvent(new w.Event('input', { bubbles: true })); await sleep(20); }
const text = (d) => d.body.textContent;
const closeFlash = async (w, d) => { const f = d.querySelector('.flash'); if (f) await click(w, f); };
// A seeded random number generator so random games are repeatable.
const seeded = (s) => () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };

(async () => {
  console.log('Game rules');
  const { J } = await boot();
  const B = J.BANK;
  const teams = [{ name: 'A' }, { name: 'B' }, { name: 'C' }];
  const ctx = (seed) => ({ bank: B, recent: {}, catSeen: {}, gameNo: 1, rand: seed ? seeded(seed) : Math.random });
  let g = J.createGame(teams, {}, ctx(1), 1000);
  const r = g.rules;
  ok(r.values.join() === '200,400,600,800,1000' && r.rounds === 2 && r.final === true, 'defaults: 200…1000, 2 rounds, final on');
  ok(!r.questionForm && !r.noMinus && !r.answerClock && !r.strict, 'defaults: question form and every optional modifier are OFF');
  ok(g.boards.length === 2 && g.boards.every((b) => b.cats.length === 6 && b.cells.length === 30), 'two boards of 6 categories × 5 clues');
  ok(g.boards[0].cells.every((c) => c.q && c.status === 'open'), 'every tile has a clue');
  ok(g.boards[0].cells.filter((c) => c.tier === 3).every((c) => c.value === 600) && g.boards[1].cells.filter((c) => c.tier === 3).every((c) => c.value === 1200), 'round 2 doubles the values');
  const catIds = J.gameCatIds(g);
  ok(new Set(catIds).size === catIds.length && catIds.length === 13, 'no category repeats across the two boards and the final (13 in all)');
  ok(g.final && g.final.q && g.final.q.tier >= 4, 'the final clue is one of its category’s hardest');
  ok(g.boards[0].cells.filter((c) => c.wager).length === 1 && g.boards[1].cells.filter((c) => c.wager).length === 2, 'Risk It squares: 1 in round 1, 2 in round 2');
  ok(g.boards.every((b) => b.cells.filter((c) => c.wager).every((c) => c.tier >= 2)), 'Risk It squares are never in the top row');
  ok(new Set(g.boards[1].cells.filter((c) => c.wager).map((c) => c.cat)).size === 2, 'round 2’s two Risk It squares are in different categories');
  const allIds = [...g.boards.flatMap((b) => b.cells.map((c) => c.q.id)), g.final.q.id];
  ok(new Set(allIds).size === allIds.length, 'no clue is used twice in a game');
  const facts = allIds.map((id) => B.byCat[id.split('.')[0]].find((q) => q.id === id)).flatMap((q) => q.facts);
  ok(new Set(facts).size === facts.length, 'clues sharing a fact key never share a game');
  ok(!JSON.stringify(g).includes('"clues"'), 'the saved game holds only its own clues, not the whole bank');
  ok(J.pickerTeam(g).id === 't0', 'team 1 picks first');

  // a normal clue: wrong, then another team right
  const normal = g.boards[0].cells.find((c) => !c.wager && c.tier === 2);
  let x = J.openCell(g, normal.id, 2000);
  ok(x.phase === 'clue' && x.current.stage === 'open', 'opening a clue waits for someone to buzz');
  ok(J.buzzIn(x, 't9', 1) === x, 'buzzing an unknown team does nothing');
  x = J.buzzIn(x, 't1', 2100);
  ok(x.current.stage === 'answer' && x.current.team === 't1' && x.current.endsAt === null, 'the host taps who buzzed first (no clock by default)');
  x = J.markWrong(x);
  ok(x.teams[1].score === -400 && x.current.stage === 'open' && x.current.tried.includes('t1'), 'wrong: −400 and the other teams can buzz');
  ok(J.buzzIn(x, 't1', 1) === x, 'a team that already got it wrong can’t buzz again');
  x = J.buzzIn(x, 't2', 2200); x = J.markRight(x);
  ok(x.teams[2].score === 400 && x.current.stage === 'reveal' && x.picker === 't2', 'right: +400 and that team picks next');
  x = J.finishClue(x, 2300);
  ok(x.phase === 'board' && J.boardOf(x).cells.find((c) => c.id === normal.id).status === 'done', 'back to the board, tile used');
  ok(x.log.length === 1 && x.log[0].changes.length === 2, 'the log records every score change for the clue');
  // everyone wrong
  const n2 = J.boardOf(x).cells.find((c) => !c.wager && c.status === 'open' && c.tier === 1);
  let y = J.openCell(x, n2.id, 3000);
  for (const id of ['t0', 't1', 't2']) { y = J.buzzIn(y, id, 3000); y = J.markWrong(y); }
  ok(y.current.stage === 'reveal' && y.current.result.kind === 'none' && y.picker === 't2', 'all wrong: response shown, picker unchanged');
  ok(y.teams[0].score === -200 && y.teams[1].score === -600, 'each wrong answer loses the value (scores can go negative)');
  // nobody buzzes
  let z = J.openCell(x, n2.id, 3000); z = J.nobody(z);
  ok(z.current.stage === 'reveal' && z.current.result.kind === 'none' && z.teams.every((t, i) => t.score === x.teams[i].score), 'nobody: no points change');
  // undo
  ok(J.undo(J.buzzIn(J.openCell(x, n2.id, 1), 't0', 1)).current.stage === 'open', 'undo takes back a buzz');
  // put back
  ok(J.putBack(J.openCell(x, n2.id, 1)).phase === 'board', 'put back: an opened clue goes back on the board');
  ok(J.putBack(J.markWrong(J.buzzIn(J.openCell(x, n2.id, 1), 't0', 1))).phase === 'clue', 'can’t put back once someone answered');
  // no-minus modifier
  let nm = J.createGame(teams, { noMinus: true }, ctx(2), 1);
  const nmc = J.boardOf(nm).cells.find((c) => !c.wager);
  nm = J.markWrong(J.buzzIn(J.openCell(nm, nmc.id, 1), 't0', 1));
  ok(nm.teams[0].score === 0 && nm.current.tried.includes('t0'), 'modifier “no minus points”: a wrong answer costs nothing');
  // answer clock modifier
  let ac = J.createGame(teams, { answerClock: true, answerTime: 10 }, ctx(3), 1);
  ac = J.buzzIn(J.openCell(ac, J.boardOf(ac).cells.find((c) => !c.wager).id, 1), 't0', 5000);
  ok(ac.current.endsAt === 15000 && J.timeLeft(ac, 9000) === 6000, 'modifier “answer clock”: 10 s after a buzz');
  ok(J.timeLeft(J.pauseTimer(ac, 9000), 99999) === 6000, 'the clock can be paused');

  // Risk It
  console.log('Risk It');
  const rc = J.boardOf(g).cells.find((c) => c.wager);
  let rk = J.openCell(g, rc.id, 1);
  ok(rk.current.wager && rk.current.stage === 'wager' && rk.current.team === 't0', 'a Risk It square: only the picking team plays');
  ok(J.maxRiskWager(rk, 't0') === 1000, 'with 0 points a team may still wager up to the round’s top value (1000)');
  ok(J.setRiskWager(rk, 1001) === rk && J.setRiskWager(rk, -5) === rk && J.setRiskWager(rk, 'abc') === rk, 'wagers outside 0…max are refused');
  ok(J.buzzIn(rk, 't1', 1) === rk, 'nobody else can buzz on a Risk It square');
  rk = J.setRiskWager(rk, 700);
  ok(rk.current.stage === 'answer' && rk.current.bet === 700, 'the wager is locked, then the clue is played');
  const rkWrong = J.markWrong(rk);
  ok(rkWrong.teams[0].score === -700 && rkWrong.current.stage === 'reveal' && rkWrong.picker === 't0', 'Risk It wrong: −wager, no steals, same team still picks');
  const rkRight = J.markRight(rk);
  ok(rkRight.teams[0].score === 700, 'Risk It right: +wager');
  let rich = J.adjustScore(g, 't0', 2500);
  ok(J.maxRiskWager(J.openCell(rich, rc.id, 1), 't0') === 2500, 'with more points than the top value, the limit is the team’s score');
  ok(J.maxRiskWager(J.openCell(J.adjustScore(g, 't0', 300), rc.id, 1), 't0') === 1000, 'with fewer points, the limit is the round’s top value');
  let nmRisk = J.createGame(teams, { noMinus: true }, ctx(2), 1);
  const nmrc = J.boardOf(nmRisk).cells.find((c) => c.wager);
  nmRisk = J.markWrong(J.setRiskWager(J.openCell(nmRisk, nmrc.id, 1), 400));
  ok(nmRisk.teams[0].score === -400, '“no minus points” doesn’t apply to Risk It');

  // TV never sees secrets
  console.log('What the TV can see');
  const tv0 = J.tvGame(g);
  ok(tv0.boards.every((b) => b.cells.every((c) => !c.wager && !c.q)), 'TV: no clue texts and no Risk It positions on the board');
  ok(!('history' in tv0) && tv0.final.q === null, 'TV: no undo history and no final clue before the final');
  const tvRisk = J.tvGame(J.openCell(g, rc.id, 1));
  ok(tvRisk.boards[0].cells.find((c) => c.id === rc.id).q === null, 'TV: a Risk It clue stays hidden until the wager is in');
  const tvAns = J.tvGame(J.buzzIn(J.openCell(g, normal.id, 1), 't0', 1));
  const tc = tvAns.boards[0].cells.find((c) => c.id === normal.id);
  ok(tc.q && tc.q.q && tc.q.a === null && tc.q.alt === null, 'TV: an open clue shows the text but not the response');
  const tvRev = J.tvGame(J.markRight(J.buzzIn(J.openCell(g, normal.id, 1), 't0', 1)));
  ok(tvRev.boards[0].cells.find((c) => c.id === normal.id).q.a !== null, 'TV: the response appears at the reveal');
  ok(!JSON.stringify(J.tvGame(g)).includes(g.boards[1].cells[0].q.a.en) || g.boards[1].cells[0].q.a.en.length < 4, 'TV: round 2 responses are not sent');

  // full game to the final
  console.log('A full game');
  const play = (gg, rand) => {
    let s = gg; let guard = 0;
    while ((s.phase === 'board' || s.phase === 'clue' || s.phase === 'between') && guard++ < 500) {
      if (s.phase === 'between') { s = J.nextStage(s, 1); continue; }
      if (s.phase === 'board') { const open = J.openCells(s); s = J.openCell(s, open[Math.floor(rand() * open.length)].id, 1); continue; }
      const cur = s.current;
      if (cur.stage === 'wager') s = J.setRiskWager(s, Math.floor(rand() * (J.maxRiskWager(s, cur.team) + 1)), 1);
      else if (cur.stage === 'open') { const left = s.teams.filter((t) => !cur.tried.includes(t.id)); s = rand() < 0.15 ? J.nobody(s) : J.buzzIn(s, left[Math.floor(rand() * left.length)].id, 1); }
      else if (cur.stage === 'answer') s = rand() < 0.6 ? J.markRight(s) : J.markWrong(s);
      else if (cur.stage === 'reveal') s = J.finishClue(s, 1);
    }
    return s;
  };
  let full = play(g, seeded(7));
  ok(full.phase === 'final' && full.round === 2 && full.final.stage === 'category', 'after both boards: the final, with its category shown first');
  ok(full.log.filter((e) => e.kind === 'clue').length === 60 && full.log.filter((e) => e.kind === 'round-end').length === 2, '60 clues played over two rounds');
  const scoreSum = (s) => s.teams.reduce((n, t) => n + t.score, 0);
  const logSum = full.log.filter((e) => e.kind === 'clue').reduce((n, e) => n + e.changes.reduce((m, c) => m + c.delta, 0), 0);
  ok(scoreSum(full) === logSum, 'scores always equal the sum of the logged changes');
  // round 2 picker = lowest after round 1
  {
    let s = g; const rr = seeded(5);
    while (s.phase !== 'between') { if (s.phase === 'board') s = J.openCell(s, J.openCells(s)[0].id, 1); else { const c = s.current; s = c.stage === 'wager' ? J.setRiskWager(s, 0, 1) : c.stage === 'open' ? J.buzzIn(s, s.teams[Math.floor(rr() * 3)].id, 1) : c.stage === 'answer' ? (rr() < 0.5 ? J.markRight(s) : J.markWrong(s)) : J.finishClue(s, 1); } }
    const low = J.lowestFirst(s)[0];
    const s2 = J.nextStage(s, 1);
    ok(s2.round === 2 && s2.phase === 'board' && s2.picker === low, 'round 2: the lowest-scoring team picks first');
    ok(J.undo(s2).phase === 'between', 'undo goes back to the in-between screen');
  }
  // final
  let f = J.adjustScore(J.adjustScore(J.adjustScore(full, 't0', 3000 - full.teams[0].score), 't1', 1000 - full.teams[1].score), 't2', -200 - full.teams[2].score);
  ok(J.setFinalWager(f, 't0', 100) === f, 'no wagers before the host starts the wager step');
  f = J.finalToWagers(f);
  ok(J.maxFinalWager(f, 't0') === 3000 && J.maxFinalWager(f, 't2') === 0, 'final wager limit: your score (0 if you have none)');
  ok(J.setFinalWager(f, 't0', 3001) === f && J.setFinalWager(f, 't2', 1) === f, 'final wagers over the limit are refused');
  f = J.setFinalWager(f, 't0', 2000);
  ok(J.showFinalClue(f, 1) === f, 'the clue can’t be shown until every team has wagered');
  const tvF = J.tvGame(f);
  ok(Object.keys(tvF.final.wagers).length === 0 && tvF.final.locked.t0 === true && !JSON.stringify(tvF).includes('"t0":2000'), 'TV: a locked wager shows as locked, never the amount');
  f = J.clearFinalWager(f, 't0'); ok(f.final.wagers.t0 == null, 'the host can clear a wager so the team enters it again');
  f = J.setFinalWager(J.setFinalWager(J.setFinalWager(f, 't0', 2000), 't1', 1000), 't2', 0);
  ok(J.tvGame(f).final.q === null, 'TV: the final clue is hidden until it is shown');
  f = J.showFinalClue(f, 10000);
  ok(f.final.stage === 'clue' && f.final.endsAt === 40000, 'the final clue comes with a 30 s timer');
  const tvClue = J.tvGame(f);
  ok(tvClue.final.q && tvClue.final.q.q && tvClue.final.q.a === null, 'TV: the final clue shows without its response');
  f = J.startJudging(f);
  ok(f.final.order.join() === 't2,t1,t0', 'judging order: lowest score first');
  ok(J.judgeFinal(f, 't0', true) === f, 'teams are judged strictly in that order');
  f = J.judgeFinal(f, 't2', true);
  f = J.judgeFinal(f, 't1', false);
  const tvJ = J.tvGame(f);
  ok(tvJ.final.wagers.t1 === 1000 && tvJ.final.wagers.t0 === undefined, 'TV: each wager appears only once that team is judged');
  f = J.judgeFinal(f, 't0', true);
  ok(f.final.stage === 'done' && f.teams.map((t) => t.score).join() === '5000,0,-200', 'final: right +wager, wrong −wager');
  ok(J.tvGame(f).final.q.a !== null, 'TV: the correct response is shown at the end');
  f = J.finishGame(f, 1);
  ok(f.phase === 'done' && J.winners(f)[0].id === 't0', 'results: the winner');
  ok(J.undo(f).phase === 'final', 'undo works after the end too');

  // fix scores
  let fx = J.adjustScore(g, 't1', -300);
  ok(fx.teams[1].score === -300 && fx.log[fx.log.length - 1].kind === 'adjust' && J.undo(fx).teams[1].score === 0, 'fix scores: logged and undoable');

  // This is wrong
  console.log('This is wrong');
  let w0 = J.openCell(g, normal.id, 1); w0 = J.markWrong(J.buzzIn(w0, 't0', 1)); w0 = J.markRight(J.buzzIn(w0, 't1', 1));
  const ref = J.invalidRefunds(w0, normal.id);
  ok(ref.length === 2 && ref.find((x) => x.team === 't0').delta === 400 && ref.find((x) => x.team === 't1').delta === -400, 'refunds reverse exactly this clue’s changes');
  const rep = J.findReplacement(w0, normal.cat, normal.tier, { bank: B, recent: {}, rand: seeded(3) });
  ok(rep && rep.q.cat === normal.cat && rep.q.tier === normal.tier && rep.how === 'same', 'a replacement comes from the same category and row');
  let w1 = J.invalidateClue(w0, normal.id, { qid: normal.q.id, replacement: rep, now: 5 });
  ok(w1.teams[0].score === 0 && w1.teams[1].score === 0, 'scores restored');
  ok(w1.current.stage === 'open' && w1.current.tried.length === 0 && J.curCell(w1).q.id === rep.q.id, 'the new clue opens straight away');
  ok(J.invalidateClue(w1, normal.id, { qid: normal.q.id, replacement: rep }) === w1, 'idempotent: flagging the same clue again does nothing');
  ok(J.isInvalidated(w1, normal.q.id) && J.undo(w1).teams[1].score === 400, 'recorded, and one undo step');
  // a played Risk It
  let w2 = J.finishClue(J.markRight(J.setRiskWager(J.openCell(g, rc.id, 1), 900)), 1);
  w2 = J.invalidateClue(w2, rc.id, { qid: rc.q.id, replacement: 'empty', now: 1 });
  ok(w2.teams[0].score === 0 && J.boardOf(w2).cells.find((c) => c.id === rc.id).status === 'empty' && w2.log.find((e) => e.cell === rc.id).void, 'a played Risk It: its wager is reversed, the tile left empty, the log entry voided');
  // final flagged after judging
  let w3 = J.judgeFinal(J.startJudging(J.showFinalClue(J.setFinalWager(J.setFinalWager(J.setFinalWager(J.finalToWagers(full), 't0', 0), 't1', 0), 't2', 0), 1)), J.lowestFirst(full)[0], true, 1);
  const frep = J.findReplacement(w3, w3.final.cat.id, w3.final.q.tier, { bank: B, recent: {}, rand: seeded(4) });
  const w4 = J.invalidateClue(w3, 'final', { qid: w3.final.q.id, replacement: frep, now: 100 });
  ok(w4.final.stage === 'clue' && Object.keys(w4.final.judged).length === 0 && w4.final.q.id === frep.q.id && w4.final.wagers.t0 === 0, 'a bad final clue: replaced, judging starts again, wagers kept');

  // many random games
  console.log('Random games');
  let bad = 0;
  for (let i = 0; i < 300; i++) {
    const rand = seeded(1000 + i);
    const n = 2 + (i % 3);
    const rules = { rounds: i % 5 === 0 ? 1 : 2, final: i % 7 !== 0, noMinus: i % 4 === 0, values: i % 6 === 0 ? [100, 200, 300, 400, 500] : undefined };
    let s = J.createGame(teams.concat([{ name: 'D' }]).slice(0, n), rules, { bank: B, recent: {}, catSeen: {}, gameNo: 1, rand }, 1);
    s = play(s, rand);
    if (s.phase === 'final') {
      s = J.finalToWagers(s);
      s.teams.forEach((t) => { s = J.setFinalWager(s, t.id, Math.floor(rand() * (J.maxFinalWager(s, t.id) + 1))); });
      s = J.startJudging(J.showFinalClue(s, 1));
      while (J.finalNext(s)) s = J.judgeFinal(s, J.finalNext(s), rand() < 0.5, 1);
      s = J.finishGame(s, 1);
    }
    const sum = s.log.reduce((m, e) => m + (e.kind === 'clue' ? e.changes.reduce((k, c) => k + c.delta, 0) : e.kind === 'final' ? e.delta : e.kind === 'adjust' ? e.points : 0), 0);
    if (s.phase !== 'done' || scoreSum(s) !== sum || s.log.filter((e) => e.kind === 'clue').length !== 30 * s.rules.rounds) { bad++; if (bad < 3) console.log('    bad game', i, s.phase, scoreSum(s), sum); }
  }
  ok(bad === 0, '300 random games (2–4 teams, 1–2 rounds, final on/off, modifiers) finish with consistent scores');

  // sound events
  console.log('Sound events');
  ok(J.soundEvents(null, g).join() === 'game-intro', 'a new game plays the intro');
  const o1 = J.openCell(g, normal.id, 1);
  ok(J.soundEvents(g, o1).join() === 'clue-open', 'opening a clue');
  ok(J.soundEvents(g, J.openCell(g, rc.id, 1)).join() === 'risk-it', 'finding a Risk It square');
  const b1 = J.buzzIn(o1, 't0', 1);
  ok(J.soundEvents(b1, J.markRight(b1)).join() === 'correct' && J.soundEvents(b1, J.markWrong(b1)).join() === 'wrong', 'right / wrong');
  ok(J.soundEvents(J.markRight(b1), J.undo(J.markRight(b1))).length === 0, 'undo plays nothing');
  ok(J.tickKey(J.buzzIn(J.openCell(J.createGame(teams, { answerClock: true, answerTime: 10 }, ctx(3), 1), J.boardOf(J.createGame(teams, {}, ctx(3), 1)).cells.find((c) => !c.wager).id, 1), 't0', 0), 6000) !== null, 'ticks in the last 5 s of the answer clock');

  // selection & history
  console.log('Clue selection');
  const seen = {}; J.boardOf(g).cells.forEach((c) => { seen[c.q.id] = 1; });
  let repeats = 0;
  for (let i = 0; i < 20; i++) { const g2 = J.createGame(teams, {}, { bank: B, recent: seen, catSeen: {}, gameNo: 2, rand: seeded(50 + i) }, 1); repeats += g2.boards.flatMap((b) => b.cells).filter((c) => seen[c.q.id]).length; }
  ok(repeats < 20, 'clues seen in the last game rarely come back (' + repeats + ' repeats in 20 new games)');
  const strict = J.createGame(teams, { strict: true }, { bank: B, recent: seen, catSeen: {}, gameNo: 2, rand: seeded(9) }, 1);
  ok(strict.boards.flatMap((b) => b.cells).every((c) => !seen[c.q.id]), 'strict no-repeats: no recently seen clue comes back while others are left');
  const ex = J.cleanRules({ exclude: B.cats.slice(0, B.cats.length - 12).map((c) => c.id) });
  ok(J.usableCats(B, ex).length === 12 && J.catsNeeded(ex) === 13, 'setup knows when too few categories are switched on');
  ok(J.cleanRules({ values: [5, 0, 1, 2, 3] }).values.join() === '200,400,600,800,1000' && !J.valuesAscending([300, 200, 400, 500, 600]), 'bad point values fall back to the defaults; values must go up');

  console.log('Picture and sound clues');
  {
    const media = B.cats.filter((c) => ['flags', 'shapes', 'sounds'].includes(c.id));
    ok(media.length === 3 && media.every((c) => J.tierCounts(B.byCat[c.id]).every((n) => n === 4)), 'three built-in media categories, 4 clues per row');
    const files = Object.values(w0Media()).flat();
    function w0Media() { return B.cats.filter((c) => ['flags', 'shapes', 'sounds'].includes(c.id)).map((c) => B.byCat[c.id].map((q) => q.media.src)); }
    ok(files.every((f) => fs.existsSync(path.join(root, f)) && /^media\/[ia]\/[0-9a-f]{12}\.(svg|mp3)$/.test(f)), 'every built-in picture/sound file exists, with a neutral name');
    // force a board that contains the sound category
    const only = J.cleanRules({ rounds: 1, final: false, exclude: B.cats.filter((c) => c.id !== 'sounds').slice(5).map((c) => c.id) });
    let mg = J.createGame(teams, only, ctx(21), 1);
    const sc = J.boardOf(mg).cells.find((c) => c.cat === 'sounds' && !c.wager);
    ok(!!sc && sc.q.media.type === 'audio', 'a board can include sound clues');
    mg = J.openCell(mg, sc.id, 1);
    ok(mg.current.play && mg.current.play.state === 'idle', 'a sound clue opens silent (the host presses play)');
    const tvm = J.tvGame(mg).boards[0].cells.find((c) => c.id === sc.id).q;
    ok(tvm.media && tvm.media.src === sc.q.media.src && tvm.a === null, 'TV gets the sound file but not the response');
    let pl = J.mediaCmd(mg, 'play');
    ok(pl.current.play.state === 'playing' && J.mediaCmd(pl, 'replay').current.play.seq === 1 && J.mediaCmd(pl, 'pause').current.play.state === 'paused', 'play / replay / pause');
    ok(J.quietMedia(pl).current.play.state === 'paused', 'after a reload a playing sound is paused, not restarted');
    ok(pl.history.length === mg.history.length, 'playback isn’t an undo step');
    let finals = 0;
    for (let i = 0; i < 40; i++) { const gg = J.createGame(teams, {}, { bank: B, recent: {}, catSeen: {}, gameNo: 1, rand: seeded(300 + i) }, 1); if (gg.final.q.type !== 'text') finals++; }
    ok(finals === 0, 'the final clue is always a text clue (40 games)');
  }

  console.log('My clues (packs)');
  {
    const cat = { id: 'pk-x-1', emoji: '🧪', name: 'Lab Facts' };
    const mk = (v, q, a, extra) => ({ id: 'c' + v + (extra || ''), type: 'text', cat: cat.id, points: v, q, a, alt: [], note: '', ref: '', media: null });
    const pack = { id: 'px', name: 'Test pack', enabled: true, categories: [cat], clues: [200, 400, 600, 800].map((v) => mk(v, 'Clue ' + v + ' here.', 'Answer ' + v)) };
    ok(J.missingRows(pack.clues, cat.id).join() === '1000', 'a category reports which rows are still empty');
    let M = J.indexBank(J.mergePacks(J.store ? w0Bank() : null, [pack]));
    function w0Bank() { return J.BANK && J.BANK.cats ? { groups: B.groups, cats: B.cats, clues: [].concat(...Object.values(B.byCat)), errors: [] } : null; }
    ok(M.cats.some((c) => c.id === cat.id) && !J.usableCats(M, J.cleanRules({})).some((c) => c.id === cat.id), 'an incomplete pack category isn’t used on boards');
    pack.clues.push(mk(1000, 'Clue 1000 here.', 'Answer 1000'));
    pack.clues.push({ ...mk(1000, '', 'x', 'b'), q: '' });
    M = J.indexBank(J.mergePacks(w0Bank(), [pack]));
    ok(J.usableCats(M, J.cleanRules({})).some((c) => c.id === cat.id) && M.byCat[cat.id].length === 5, 'a complete pack category can go on a board; incomplete clues are left out');
    ok(J.clueProblems({ ...mk(200, 'x', 'What is Rome?') }).includes('vResponseQuestion'), 'a response written as a question is flagged');
    ok(J.clueProblems({ ...mk(200, 'x', 'y'), type: 'image', media: { type: 'image', src: null } }).includes('vNoPicture'), 'a picture clue needs a picture');
    const ex = J.cleanRules({ rounds: 1, final: false, exclude: M.cats.filter((c) => c.id !== cat.id).slice(5).map((c) => c.id) });
    const pg = J.createGame(teams, ex, { bank: M, recent: {}, catSeen: {}, gameNo: 1, rand: seeded(8) }, 1);
    ok(pg.boards[0].cats.some((c) => c.id === cat.id) && J.boardOf(pg).cells.filter((c) => c.cat === cat.id).every((c) => c.q && c.q.pack === 'px'), 'a game can use your own category');
    ok(J.mergePacks(w0Bank(), [{ ...pack, enabled: false }]).cats.every((c) => c.id !== cat.id), 'a switched-off pack stays out of games');
    const exported = await J.exportPack(pack);
    const v = J.validatePack(JSON.parse(JSON.stringify(exported)));
    ok(v.ok && v.summary.clues === 6 && v.summary.bad === 1, 'export → validate: a pack file round-trips (and counts incomplete clues)');
    ok(J.validatePack({ app: 'khatfa', kind: 'pack' }).error === 'pkNotPack' && J.validatePack({ ...exported, pack: { ...pack, clues: [{ ...mk(300, 'a', 'b') }] } }).error === 'pkBadPoints', 'other files and bad values are refused');
    ok(J.validatePack({ ...exported, pack: { ...pack, clues: [{ ...mk(200, 'a', 'b'), type: 'image', media: { type: 'image', src: 'https://example.com/x.png' } }] } }).error === 'bkDamaged', 'packs can’t point at outside web addresses');
    const imp = await J.importPack(v, [pack]);
    ok(imp.id !== pack.id && imp.name === 'Test pack (2)' && imp.categories[0].id !== cat.id && imp.clues.every((c) => c.cat === imp.categories[0].id), 'import makes a new pack with fresh ids');
    const bk = J.makeBackup({ settings: {}, game: null, past: [], history: null, issues: [], packs: [pack] });
    ok(J.validateBackup(JSON.parse(JSON.stringify(bk))).ok && JSON.parse(JSON.stringify(bk)).data.packs.length === 1, 'backups include your packs');
  }

  /* ---------------- the app in a simulated browser ---------------- */
  console.log('Click-through (jsdom)');
  {
    const { w, d, J: J2 } = await boot({ speed: 0.01 });
    ok(text(d).includes('Jeopardy-Board') && !!btn(d, 'New game'), 'home screen');
    await click(w, btn(d, 'New game'));
    ok(text(d).includes('Teams') && !!btn(d, 'Start the game'), 'setup screen');
    await click(w, btn(d, 'Add a team'));
    ok(d.querySelectorAll('.teamedit').length === 3, 'add a third team');
    await click(w, btn(d, 'Start the game'));
    ok(d.querySelectorAll('.board .tile.open').length === 30 && d.querySelectorAll('.bc-head').length === 6, 'the board: 6 categories × 5 tiles');
    const g0 = J2.store.get(J2.K.current);
    const target = J2.boardOf(g0).cells.find((c) => !c.wager && c.tier === 1);
    const tiles = [...d.querySelectorAll('.board .tile')]; const idx = (target.tier - 1) * 6 + J2.boardOf(g0).cats.findIndex((c) => c.id === target.cat);
    await click(w, tiles[idx]);
    ok(!!d.querySelector('.qtext') && text(d).includes('Who buzzed first?'), 'a clue opens; the host picks who buzzed');
    await click(w, d.querySelectorAll('.buzzbtn')[1]);
    await click(w, d.querySelector('.actions .btn-right'));
    await closeFlash(w, d);
    ok(text(d).includes('Right!') || d.querySelector('.result.k-right'), 'marked right');
    await click(w, btn(d, 'Back to the board'));
    const g1 = J2.store.get(J2.K.current);
    ok(g1.teams[1].score === 200 && g1.picker === 't1', 'the score went up and that team picks next');
    // Risk It through the UI
    const rcell = J2.boardOf(g1).cells.find((c) => c.wager);
    const ridx = (rcell.tier - 1) * 6 + J2.boardOf(g1).cats.findIndex((c) => c.id === rcell.cat);
    await click(w, [...d.querySelectorAll('.board .tile')][ridx]);
    await closeFlash(w, d);
    ok(!!d.querySelector('.wagerbox') && !d.querySelector('.qtext'), 'Risk It: wager first, clue hidden');
    await type(w, d.querySelector('.wagerin'), '500');
    await click(w, btn(d, 'Lock the wager'));
    ok(!!d.querySelector('.qtext') && !!d.querySelector('.actions .btn-wrong'), 'after the wager the clue appears');
    await click(w, d.querySelector('.actions .btn-wrong')); await closeFlash(w, d);
    ok(J2.store.get(J2.K.current).teams[1].score === -300, 'Risk It wrong: −500');
    // This is wrong
    await click(w, btn(d, 'This is wrong'));
    ok(!!d.querySelector('.wrongsheet') && text(d).includes('reversed'), 'the “This is wrong” sheet shows the refund');
    await click(w, btn(d, 'Reverse it'));
    await closeFlash(w, d);
    ok(J2.store.get(J2.K.current).teams[1].score === 200, '“This is wrong” reversed the Risk It');
    // menu → end round
    const st = J2.store.get(J2.K.current);
    if (st.phase === 'clue') { await click(w, d.querySelector('[aria-label="Menu"]')); await click(w, btn(d, 'Skip this clue')); await click(w, btn(d, 'Back to the board')); }
    await click(w, d.querySelector('[aria-label="Menu"]'));
    await click(w, btn(d, 'End this round now'));
    await click(w, [...d.querySelectorAll('.modal button')].find((b) => /End this round/.test(b.textContent)));
    ok(text(d).includes('End of round 1') && !!btn(d, 'Start round 2'), 'ending round 1 early → the in-between screen');
    await click(w, btn(d, 'Start round 2'));
    ok(d.querySelectorAll('.board .tile.open').length === 30 && J2.store.get(J2.K.current).round === 2, 'round 2 board');
    ok([...d.querySelectorAll('.board .tile.open')].some((t) => t.textContent.trim() === '2000'), 'round 2 values are doubled');
    await click(w, d.querySelector('[aria-label="Menu"]'));
    await click(w, btn(d, 'End this round now'));
    await click(w, [...d.querySelectorAll('.modal button')].find((b) => /End this round/.test(b.textContent)));
    await click(w, btn(d, 'Go to the final wager'));
    ok(text(d).includes('Final Wager') && !!btn(d, 'Collect the secret wagers'), 'the final: category first');
    await click(w, btn(d, 'Collect the secret wagers'));
    for (let i = 0; i < 3; i++) {
      await click(w, btn(d, 'Enter wager'));
      ok(!!d.querySelector('.passcover') && !d.querySelector('.qtext'), 'pass-the-phone cover for team ' + (i + 1) + ' (no clue on screen)');
      await click(w, d.querySelector('.passcover .btn-gold'));
      await type(w, d.querySelector('.wagerin'), '0');
      await click(w, btn(d, 'Lock the wager'));
      ok(text(d).includes('Wager locked') && !text(d).includes('Your secret wager'), 'locked, and the amount is no longer on screen');
      await click(w, btn(d, 'I’m the host'));
    }
    ok(!!btn(d, 'All in: show the final clue'), 'all wagers in');
    await click(w, btn(d, 'All in: show the final clue'));
    ok(!!d.querySelector('.qtext') && !!d.querySelector('.clock'), 'final clue with its timer');
    await click(w, btn(d, 'start judging'));
    for (let i = 0; i < 3; i++) { await click(w, d.querySelector('.actions .btn-right')); await closeFlash(w, d); }
    await click(w, btn(d, 'See the results'));
    ok(!!d.querySelector('.winner') && J2.store.get(J2.K.current).phase === 'done', 'results screen');
    await click(w, btn(d, 'Home'));
    ok(d.querySelectorAll('.pastrow').length === 1, 'the finished game is in Recent games');
    // TV mode on this screen
    await click(w, btn(d, 'New game')); await click(w, btn(d, 'Start the game'));
    await click(w, d.querySelector('[aria-label="TV mode"]'));
    await click(w, btn(d, 'Use this screen as the TV'));
    ok(!!d.querySelector('.tvmode .board.big') && !d.querySelector('.tvmode .tile.open[disabled]') === false, 'TV mode on this screen shows the big board (read-only)');
    await click(w, btn(d, 'Back to controls'));
    ok(!!d.querySelector('.boardscreen'), 'back to the controls');
    // English only
    await click(w, d.querySelector('[aria-label="Menu"]')); await click(w, btn(d, 'Home'));
    ok(!/[\u0600-\u06FF]/.test(d.body.textContent + w.eval('JSON.stringify(window.JB_BANK.clues)')) && !btn(d, 'العربية'), 'English only: no Arabic text in the app or the clue bank, no language switch');
  }

  console.log('My clues click-through (jsdom)');
  {
    const { w, d, J: J6 } = await boot();
    await click(w, btn(d, 'My clues'));
    ok(text(d).includes('Make your own clue packs'), 'the My clues screen opens from home');
    await click(w, btn(d, 'New pack'));
    await click(w, btn(d, 'Add a category'));
    await type(w, d.querySelector('.sheet input[dir="auto"]'), 'Lab Facts');
    await click(w, [...d.querySelectorAll('.sheet button')].find((b) => b.textContent.trim() === 'Save'));
    ok(text(d).includes('Lab Facts') && text(d).includes('needs clues for 200, 400, 600, 800, 1000'), 'a new category shows which rows it still needs');
    for (const v of [200, 400, 600, 800, 1000]) {
      await click(w, btn(d, 'Add a clue'));
      await click(w, [...d.querySelectorAll('.typegrid button')].find((b) => /Text/.test(b.textContent)));
      await click(w, [...d.querySelectorAll('.seg button')].find((b) => b.textContent.trim() === String(v)));
      const ta = d.querySelector('textarea.input');
      const set = Object.getOwnPropertyDescriptor(w.HTMLTextAreaElement.prototype, 'value').set; set.call(ta, 'Test clue worth ' + v + '.'); ta.dispatchEvent(new w.Event('input', { bubbles: true })); await sleep(20);
      await type(w, d.querySelectorAll('.qform input.input')[0], 'Answer ' + v);
      await click(w, [...d.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Save'));
    }
    const pk = J6.store.get(J6.K.packs);
    ok(pk.length === 1 && pk[0].clues.length === 5 && pk[0].clues.every((c) => c.cat === pk[0].categories[0].id), 'five clues saved into the pack’s own category');
    ok(text(d).includes('ready for the board'), 'the category is ready for the board');
    await click(w, d.querySelector('[aria-label="Back"]')); await click(w, d.querySelector('[aria-label="Back"]'));
    await click(w, btn(d, 'New game'));
    ok(text(d).includes('34 categories on') || /of 34 categories/.test(text(d)), 'setup counts the new category');
  }

  console.log('Persistence and backup');
  {
    const { w, d, J: J3 } = await boot();
    await click(w, btn(d, 'New game')); await click(w, btn(d, 'Start the game'));
    const gid = J3.store.get(J3.K.current).id;
    await J3.store.flush(); await sleep(50);
    const { d: d2, J: J4 } = await boot();
    ok(J4.store.get(J4.K.current) && J4.store.get(J4.K.current).id === gid && !!btn(d2, 'Continue game'), 'a game in progress survives a reload (IndexedDB)');
    const bk = J4.makeBackup({ settings: {}, game: J4.store.get(J4.K.current), past: [], history: { n: 1, seen: {}, cats: {} }, issues: [] });
    ok(J4.validateBackup(JSON.parse(JSON.stringify(bk))).ok, 'a backup validates');
    ok(J4.validateBackup({ app: 'khatfa', format: 1, data: {} }).error === 'bkNotOurs', 'another game’s backup is refused');
    ok(J4.validateBackup({ ...bk, format: 99 }).error === 'bkNewer', 'a newer backup format is refused');
    const { J: J5 } = await boot({ idb: false });
    ok(J5.store.backend === 'localStorage', 'without IndexedDB it falls back to localStorage');
  }

  console.log('TV window (BroadcastChannel)');
  {
    const host = await boot({ bc: true });
    await click(host.w, btn(host.d, 'New game')); await click(host.w, btn(host.d, 'Start the game'));
    const tv = await boot({ bc: true, url: 'https://sad-cpu141.github.io/Jeopardy-Board/#tv' });
    await sleep(300);
    ok(!!tv.d.querySelector('.tvmode .board.big'), 'the TV window shows the board');
    const hg = host.J.store.get(host.J.K.current);
    const secret = hg.boards[0].cells.find((c) => c.tier === 5).q.a.en;
    ok(!tv.d.body.textContent.includes(secret), 'the TV window doesn’t have the responses');
    host.w.close(); tv.w.close();
  }

  console.log(failures ? '\n' + failures + ' FAILED, ' + passes + ' passed' : '\nAll ' + passes + ' checks passed');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.log(e); process.exit(1); });
