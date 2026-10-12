/* ============================================================
   GAME ENGINE — pure functions: (game, ...) → new game.
   The host screens, the TV view and the tests all use these.

   Phases:   board ⇄ clue → between → (board of round 2 ⇄ clue → between) → final → done
   A clue goes through stages:
     normal:   open (teams buzz out loud; host taps who was first) → answer → right: reveal
                                                              wrong: back to open for the others, or reveal
     Risk It:  wager (picking team only) → answer → reveal
   Final:    category → wager (secret, phone passed around) → clue (timer) → judge (lowest score first) → done
   Every step that changes the game is one undo step. Times are absolute ms timestamps.
   ============================================================ */
const DEFAULT_RULES = {
  values: [200, 400, 600, 800, 1000], // rows 1–5 in round 1; round 2 doubles them
  rounds: 2,                // board rounds (1 or 2)
  final: true,              // the final wager round
  catsPerBoard: 6,
  finalTime: 30,            // seconds to write the final response
  questionForm: false,      // responses must be phrased as a question (the host judges)
  exclude: [],              // category ids the host switched off
  // optional modifiers (all OFF by default)
  noMinus: false,           // wrong answers on normal clues don't lose points
  answerClock: false,       // a countdown once a team has buzzed
  answerTime: 10,
  strict: false,            // Strict No-Repeats across games
};
const FINAL_TIMES = [20, 30, 45, 60];
const ANSWER_TIMES = [5, 10, 15, 20];
const HISTORY_MAX = 60;
const MAX_VALUE = 100000;

function cleanRules(r) {
  const x = { ...DEFAULT_RULES, ...(r || {}) };
  const v = Array.isArray(x.values) ? x.values.map((n) => Math.round(+n)) : [];
  x.values = v.length === 5 && v.every((n) => n > 0 && n <= MAX_VALUE) ? v : [...DEFAULT_RULES.values];
  x.rounds = x.rounds === 1 ? 1 : 2;
  x.final = x.final !== false;
  x.catsPerBoard = 6;
  x.finalTime = clamp(Math.round(x.finalTime) || 30, 5, 300);
  x.answerTime = clamp(Math.round(x.answerTime) || 10, 3, 120);
  x.exclude = Array.isArray(x.exclude) ? x.exclude.filter((id) => typeof id === 'string') : [];
  ['questionForm', 'noMinus', 'answerClock', 'strict'].forEach((k) => { x[k] = !!x[k]; });
  return x;
}
const valuesAscending = (vals) => vals.every((n, i) => i === 0 || n > vals[i - 1]);

const teamById = (g, id) => g.teams.find((t) => t.id === id);
const boardOf = (g, round) => (g.boards || []).find((b) => b.round === (round || g.round)) || null;
const cellById = (g, id) => { for (const b of g.boards || []) { const c = b.cells.find((x) => x.id === id); if (c) return c; } return null; };
const catById = (g, id) => { for (const b of g.boards || []) { const c = b.cats.find((x) => x.id === id); if (c) return c; } return g.final && g.final.cat.id === id ? g.final.cat : null; };
const openCells = (g) => { const b = boardOf(g); return b ? b.cells.filter((c) => c.status === 'open') : []; };
const isBoardDone = (g) => openCells(g).length === 0;
const pickerTeam = (g) => teamById(g, g.picker) || g.teams[0];
const roundTop = (g, round) => Math.max(...g.rules.values) * ((round || g.round) === 2 ? 2 : 1);
const hasNextRound = (g) => g.round < g.rules.rounds;
const hasFinal = (g) => !!(g.rules.final && g.final && g.final.q);
// Lowest score first; ties keep team order. (Used for the final reveal and who picks first in round 2.)
const lowestFirst = (g) => [...g.teams].sort((a, b) => a.score - b.score || g.teams.indexOf(a) - g.teams.indexOf(b)).map((t) => t.id);

// Snapshot for undo (history itself is never nested).
function withHistory(g, label) {
  const { history, ...snap } = g;
  return { ...g, history: [...(history || []), { label, snap }].slice(-HISTORY_MAX) };
}
function undo(g) {
  const h = g.history || [];
  if (!h.length) return g;
  const last = h[h.length - 1];
  return { ...last.snap, history: h.slice(0, -1) };
}
const undoLabel = (g) => { const h = g.history || []; return h.length ? h[h.length - 1].label : null; };
const addScore = (g, teamId, d) => ({ ...g, teams: g.teams.map((tm) => (tm.id === teamId ? { ...tm, score: tm.score + d } : tm)) });

/* ---------- setup ---------- */
// teams: [{ name, color, emoji }]; ctx: { bank, recent, catSeen, gameNo, rand, used }
function createGame(teams, rules, ctx, now = Date.now()) {
  const r = cleanRules(rules);
  const sel = selectGame(r, { ...ctx, gameNo: ctx.gameNo || 1 });
  const tms = teams.map((tm, i) => ({ id: 't' + i, name: (tm.name || '').trim(), color: tm.color || COLORS[i], emoji: tm.emoji || EMOJIS[i], score: 0 }));
  return {
    v: 1, id: uid(), createdAt: now, gameNo: ctx.gameNo || 1,
    rules: r, teams: tms,
    boards: sel.boards, final: sel.final ? { cat: sel.final.cat, q: sel.final.q, stage: 'category', wagers: {}, order: [], judged: {}, endsAt: null, pausedLeft: null } : null,
    report: sel.report,
    round: 1, phase: 'board', picker: tms[0].id, current: null,
    log: [], history: [], invalid: [],
  };
}
// The next game with the same teams and rules.
function rematch(g, ctx, now = Date.now()) {
  return createGame(g.teams.map(({ name, color, emoji }) => ({ name, color, emoji })), g.rules, ctx, now);
}

/* ---------- a clue ---------- */
/* Sound playback is part of the game state, so the host's buttons drive whichever screen
   plays it (a TV window, or this device). Nothing plays until the host presses play.
   seq goes up on every Replay. These aren't undo steps. */
const freshPlay = () => ({ state: 'idle', seq: 0, vol: 0.9 });
function mediaCmd(g, cmd, v) {
  const key = g.phase === 'final' ? 'final' : 'current';
  const cur = g[key]; if (!cur) return g;
  const p = { ...freshPlay(), ...(cur.play || {}) };
  if (cmd === 'play') p.state = 'playing';
  else if (cmd === 'pause') p.state = 'paused';
  else if (cmd === 'replay') { p.state = 'playing'; p.seq = (p.seq || 0) + 1; }
  else if (cmd === 'stop') p.state = 'idle';
  else if (cmd === 'vol') p.vol = clamp(+v || 0, 0, 1);
  else return g;
  return { ...g, [key]: { ...cur, play: p } };
}
// After a reload nothing should start playing by itself.
function quietMedia(g) {
  if (!g) return g;
  const calm = (c) => (c && c.play && c.play.state === 'playing' ? { ...c, play: { ...c.play, state: 'paused' } } : c);
  return { ...g, current: calm(g.current), final: calm(g.final) };
}
const curCell = (g) => (g.current ? cellById(g, g.current.cell) : null);
const curValue = (g) => { const c = curCell(g); const cur = g.current; if (!c || !cur) return 0; return cur.wager ? (cur.bet || 0) : c.value; };
// The most a team may wager on a Risk It square: its score, or the round's top value if that's higher.
const maxRiskWager = (g, teamId) => Math.max(teamById(g, teamId).score, roundTop(g));
const minRiskWager = 0;

function openCell(g, cellId, now = Date.now()) {
  const c = cellById(g, cellId);
  const b = boardOf(g);
  if (g.phase !== 'board' || !c || !b || !b.cells.includes(c) || c.status !== 'open') return g;
  const n = withHistory(g, 'open');
  const base = { cell: c.id, round: g.round, tried: [], changes: [], result: null, endsAt: null, pausedLeft: null, opener: g.picker, play: freshPlay() };
  const current = c.wager ? { ...base, wager: 1, stage: 'wager', team: g.picker, bet: null } : { ...base, wager: 0, stage: 'open', team: null };
  return { ...n, phase: 'clue', current };
}
// Risk It: the picking team's wager (the host types it in).
function setRiskWager(g, amount, now = Date.now()) {
  const cur = g.current;
  if (g.phase !== 'clue' || !cur || !cur.wager || cur.stage !== 'wager') return g;
  const a = Math.round(+amount);
  if (!(a >= minRiskWager) || a > maxRiskWager(g, cur.team)) return g;
  const n = withHistory(g, 'wager');
  return { ...n, current: { ...cur, stage: 'answer', bet: a, endsAt: g.rules.answerClock ? now + ms(g.rules.answerTime * 1000) : null, pausedLeft: null } };
}
// The host taps the team that buzzed first.
function buzzIn(g, teamId, now = Date.now()) {
  const cur = g.current;
  if (g.phase !== 'clue' || !cur || cur.wager || cur.stage !== 'open' || !teamById(g, teamId) || cur.tried.includes(teamId)) return g;
  const n = withHistory(g, 'buzz');
  return { ...n, current: { ...cur, stage: 'answer', team: teamId, endsAt: g.rules.answerClock ? now + ms(g.rules.answerTime * 1000) : null, pausedLeft: null } };
}
function markRight(g) {
  const cur = g.current;
  if (g.phase !== 'clue' || !cur || cur.stage !== 'answer') return g;
  const value = curValue(g);
  let n = withHistory(g, 'right');
  n = addScore(n, cur.team, value);
  // Whoever is right picks next.
  return { ...n, picker: cur.team, current: { ...cur, stage: 'reveal', endsAt: null, pausedLeft: null, changes: [...cur.changes, { team: cur.team, delta: value }], result: { kind: 'right', team: cur.team, points: value } } };
}
function markWrong(g) {
  const cur = g.current;
  if (g.phase !== 'clue' || !cur || cur.stage !== 'answer') return g;
  const value = curValue(g);
  const lose = cur.wager ? value : (g.rules.noMinus ? 0 : value);
  let n = withHistory(g, 'wrong');
  if (lose) n = addScore(n, cur.team, -lose);
  const changes = lose ? [...cur.changes, { team: cur.team, delta: -lose }] : cur.changes;
  const tried = [...cur.tried, cur.team];
  // Risk It: only the picking team plays it.
  if (cur.wager) return { ...n, current: { ...cur, stage: 'reveal', endsAt: null, pausedLeft: null, tried, changes, result: { kind: 'wrong', team: cur.team, points: -lose } } };
  const left = n.teams.filter((tm) => !tried.includes(tm.id));
  if (left.length) return { ...n, current: { ...cur, stage: 'open', team: null, endsAt: null, pausedLeft: null, tried, changes } };
  return { ...n, current: { ...cur, stage: 'reveal', team: null, endsAt: null, pausedLeft: null, tried, changes, result: { kind: 'none', team: null, points: 0 } } };
}
// Nobody buzzed (or the rest gave up): show the response, no points.
function nobody(g) {
  const cur = g.current;
  if (g.phase !== 'clue' || !cur || cur.wager || cur.stage !== 'open') return g;
  const n = withHistory(g, 'nobody');
  return { ...n, current: { ...cur, stage: 'reveal', team: null, result: { kind: 'none', team: null, points: 0 } } };
}
// Skip: no more points, the clue is used up (points already won or lost stay).
function skipClue(g) {
  const cur = g.current;
  if (g.phase !== 'clue' || !cur || cur.stage === 'reveal') return g;
  const n = withHistory(g, 'skip');
  return { ...n, current: { ...cur, stage: 'reveal', team: null, endsAt: null, pausedLeft: null, result: { kind: 'skipped', team: null, points: 0 } } };
}
// Opened by mistake: back on the board, same team still picks. Only before anyone answered.
function putBack(g) {
  const cur = g.current;
  if (g.phase !== 'clue' || !cur || cur.changes.length || cur.tried.length || !(cur.stage === 'open' || cur.stage === 'wager')) return g;
  const n = withHistory(g, 'putBack');
  return { ...n, phase: 'board', current: null };
}
// After the reveal: close the tile, log it, back to the board (or the end of the round).
function finishClue(g, now = Date.now()) {
  const cur = g.current; const c = curCell(g);
  if (g.phase !== 'clue' || !cur || cur.stage !== 'reveal' || !c) return g;
  const r = cur.result || {};
  let n = withHistory(g, 'next');
  const entry = { kind: 'clue', cell: c.id, qid: c.q && c.q.id, round: g.round, cat: c.cat, tier: c.tier, value: c.value, wager: cur.wager ? 1 : 0, bet: cur.bet == null ? null : cur.bet, result: r.kind, team: r.team || null, changes: cur.changes, tried: cur.tried, at: now };
  n = { ...n, boards: n.boards.map((b) => (b.round !== g.round ? b : { ...b, cells: b.cells.map((x) => (x.id === c.id ? { ...x, status: 'done', result: { kind: r.kind, team: r.team || null } } : x)) })), log: [...n.log, entry], current: null, phase: 'board' };
  if (isBoardDone(n)) n = endOfBoard(n, now);
  return n;
}
function endOfBoard(g, now) {
  if (hasNextRound(g) || hasFinal(g)) return { ...g, phase: 'between', log: [...g.log, { kind: 'round-end', round: g.round, at: now }] };
  return { ...g, phase: 'done', endedAt: now };
}
// The host ends this round early (the rest of the board is skipped).
function endRound(g, now = Date.now()) {
  if (g.phase !== 'board') return g;
  const n = withHistory(g, 'endRound');
  return endOfBoard({ ...n, log: [...n.log, { kind: 'round-cut', round: g.round, left: openCells(g).length, at: now }] }, now);
}
// From the in-between screen: round 2 (lowest score picks first), or the final, or the end.
function nextStage(g, now = Date.now()) {
  if (g.phase !== 'between') return g;
  const n = withHistory(g, 'nextStage');
  if (hasNextRound(g)) return { ...n, round: g.round + 1, phase: 'board', picker: lowestFirst(g)[0] };
  if (hasFinal(g)) return { ...n, phase: 'final', final: { ...g.final, stage: 'category' } };
  return { ...n, phase: 'done', endedAt: now };
}
function endGame(g, now = Date.now()) {
  if (g.phase === 'done') return g;
  const n = withHistory(g, 'end');
  return { ...n, phase: 'done', current: null, endedAt: now, endedEarly: true };
}
// Host fixes a mistake by hand. Logged so it shows in the game log.
function adjustScore(g, teamId, delta, now = Date.now()) {
  if (!delta || !teamById(g, teamId)) return g;
  const n = withHistory(g, 'adjust');
  return { ...addScore(n, teamId, delta), log: [...n.log, { kind: 'adjust', team: teamId, points: delta, at: now }] };
}
// The optional answer clock.
const timeLeft = (g, now = Date.now()) => {
  const cur = g.phase === 'final' ? g.final : g.current;
  if (!cur || cur.endsAt == null) return null;
  if (cur.pausedLeft != null) return cur.pausedLeft;
  return Math.max(0, cur.endsAt - now);
};
function pauseTimer(g, now = Date.now()) {
  const key = g.phase === 'final' ? 'final' : 'current'; const cur = g[key];
  if (!cur || cur.endsAt == null || cur.pausedLeft != null) return g;
  return { ...g, [key]: { ...cur, pausedLeft: Math.max(0, cur.endsAt - now) } };
}
function resumeTimer(g, now = Date.now()) {
  const key = g.phase === 'final' ? 'final' : 'current'; const cur = g[key];
  if (!cur || cur.pausedLeft == null) return g;
  return { ...g, [key]: { ...cur, endsAt: now + cur.pausedLeft, pausedLeft: null } };
}

/* ---------- final round ----------
   Each team's wager is a secret: the phone is passed round, and neither the TV nor the
   host's screen shows a wager until that team is judged. Every team plays; the most a team
   can wager is its score (0 if it has no points). */
const maxFinalWager = (g, teamId) => Math.max(0, teamById(g, teamId).score);
function finalToWagers(g) {
  if (g.phase !== 'final' || g.final.stage !== 'category') return g;
  const n = withHistory(g, 'finalWagers');
  return { ...n, final: { ...g.final, stage: 'wager' } };
}
function setFinalWager(g, teamId, amount) {
  const f = g.final;
  if (g.phase !== 'final' || f.stage !== 'wager' || !teamById(g, teamId)) return g;
  const a = Math.round(+amount);
  if (!(a >= 0) || a > maxFinalWager(g, teamId)) return g;
  const n = withHistory(g, 'finalWager');
  return { ...n, final: { ...f, wagers: { ...f.wagers, [teamId]: a } } };
}
// The host clears a team's wager so it can enter it again.
function clearFinalWager(g, teamId) {
  const f = g.final;
  if (g.phase !== 'final' || f.stage !== 'wager' || f.wagers[teamId] == null) return g;
  const n = withHistory(g, 'finalWagerClear');
  const wagers = { ...f.wagers }; delete wagers[teamId];
  return { ...n, final: { ...f, wagers } };
}
const allWagersIn = (g) => g.teams.every((tm) => g.final.wagers[tm.id] != null);
function showFinalClue(g, now = Date.now()) {
  const f = g.final;
  if (g.phase !== 'final' || f.stage !== 'wager' || !allWagersIn(g)) return g;
  const n = withHistory(g, 'finalClue');
  return { ...n, final: { ...f, stage: 'clue', endsAt: now + ms(g.rules.finalTime * 1000), pausedLeft: null, play: freshPlay() } };
}
function startJudging(g) {
  const f = g.final;
  if (g.phase !== 'final' || f.stage !== 'clue') return g;
  const n = withHistory(g, 'finalJudge');
  return { ...n, final: { ...f, stage: 'judge', order: lowestFirst(g), endsAt: null, pausedLeft: null } };
}
const finalNext = (g) => { const f = g.final; return f && f.stage === 'judge' ? f.order.find((id) => !f.judged[id]) || null : null; };
// Judge the next team in the reveal order.
function judgeFinal(g, teamId, right, now = Date.now()) {
  const f = g.final;
  if (g.phase !== 'final' || f.stage !== 'judge' || finalNext(g) !== teamId) return g;
  const w = f.wagers[teamId] || 0;
  const delta = right ? w : -w;
  let n = withHistory(g, 'finalJudged');
  n = addScore(n, teamId, delta);
  const judged = { ...f.judged, [teamId]: { right: !!right, delta, wager: w } };
  const done = f.order.every((id) => judged[id]);
  return { ...n, final: { ...f, judged, stage: done ? 'done' : 'judge' }, log: [...n.log, { kind: 'final', team: teamId, right: !!right, wager: w, delta, at: now }] };
}
function finishGame(g, now = Date.now()) {
  if (g.phase !== 'final' || g.final.stage !== 'done') return g;
  const n = withHistory(g, 'finish');
  return { ...n, phase: 'done', endedAt: now };
}

/* ---------- results ---------- */
function winners(g) {
  const top = Math.max(...g.teams.map((tm) => tm.score));
  const w = g.teams.filter((tm) => tm.score === top);
  return w.length === g.teams.length && g.teams.length > 1 ? [] : w; // [] = draw
}
function gameStats(g) {
  const per = {};
  g.teams.forEach((tm) => { per[tm.id] = { right: 0, wrong: 0, won: 0 }; });
  let bestRisk = null;
  g.log.forEach((e) => {
    if (e.kind !== 'clue' || e.void) return;
    (e.changes || []).forEach((ch) => { const p = per[ch.team]; if (!p) return; if (ch.delta > 0) { p.right++; p.won += ch.delta; } else p.wrong++; });
    if (e.wager && e.result === 'right' && (!bestRisk || e.bet > bestRisk.bet)) bestRisk = e;
  });
  const list = g.teams.map((tm) => ({ team: tm, ...per[tm.id] }));
  return { list, bestRisk };
}
// A finished game, slimmed down for the "recent games" list.
const pastEntry = (g) => ({ id: g.id, createdAt: g.createdAt, endedAt: g.endedAt, gameNo: g.gameNo, rules: g.rules, teams: g.teams, log: g.log, phase: 'done' });

/* ---------- "This is wrong": a bad clue ----------
   The host flags a clue: the open one, one already played, or the final clue.
   1. Exactly the score changes that clue caused are reversed (every + and − recorded for it,
      including a Risk It wager or final wagers already judged).
   2. The clue is recorded in g.invalid and can't come back this game.
   3. A replacement from the same row is found: same category first, then a category this game
      isn't using; if there's none, the tile is left empty. Nothing is silently repeated.
   Idempotent: the call names the clue id; once that clue is no longer there, it does nothing.
   One undo step. Who picks next is not changed. */
const INVALID_REASONS = ['answer', 'unclear', 'duplicate', 'other'];
const isInvalidated = (g, qid) => (g.invalid || []).some((x) => x.qid === qid);
// What reversing this clue would change: [{ team, delta }].
function invalidRefunds(g, where) {
  const sum = {};
  const add = (list) => (list || []).forEach((ch) => { sum[ch.team] = (sum[ch.team] || 0) - ch.delta; });
  if (where === 'final') { if (g.final) Object.keys(g.final.judged || {}).forEach((id) => { sum[id] = (sum[id] || 0) - g.final.judged[id].delta; }); }
  else {
    const c = cellById(g, where); if (!c) return [];
    if (g.current && g.current.cell === where) add(g.current.changes);
    else if (c.status === 'done') { const e = [...g.log].reverse().find((x) => x.kind === 'clue' && x.cell === where && !x.void); if (e) add(e.changes); }
  }
  return Object.keys(sum).filter((k) => sum[k]).map((team) => ({ team, delta: sum[team] }));
}
/* where: a cell id, or 'final'. opts: { qid (required), reason, note, replacement: { q, how } | 'empty', now } */
function invalidateClue(g, where, opts) {
  const o = opts || {}; const now = o.now || Date.now();
  if (where === 'final') {
    const f = g.final;
    if (g.phase !== 'final' || !f || !f.q || f.q.id !== o.qid || isInvalidated(g, o.qid)) return g;
    const refunds = invalidRefunds(g, 'final');
    const rep = o.replacement && o.replacement !== 'empty' && o.replacement.q ? o.replacement : null;
    if (!rep) return g; // the final always needs a clue
    let n = withHistory(g, 'invalid');
    refunds.forEach((r) => { n = addScore(n, r.team, r.delta); });
    const log = n.log.map((e) => (e.kind === 'final' && !e.void ? { ...e, void: true } : e));
    const replay = f.stage === 'clue' || f.stage === 'judge' || f.stage === 'done';
    n = { ...n, invalid: [...(n.invalid || []), invRecord(f.q, 'final', f.stage, o, refunds, rep, now)], log: [...log, { kind: 'invalid', where: 'final', refunds, replaced: true, at: now }],
      final: { ...f, q: rep.q, judged: {}, order: [], stage: replay ? 'clue' : f.stage, endsAt: replay ? now + ms(g.rules.finalTime * 1000) : null, pausedLeft: null, play: freshPlay() } };
    return n;
  }
  const c = cellById(g, where);
  if (!c || !c.q || c.q.id !== o.qid || isInvalidated(g, o.qid)) return g;
  const isCur = !!(g.current && g.current.cell === where);
  if (!isCur && c.status !== 'done') return g; // only an opened or already-played clue can be flagged
  const refunds = invalidRefunds(g, where);
  // A replacement can only be played on the board that's in play now.
  const rep = canReplaceCell(g, where) && o.replacement && o.replacement !== 'empty' && o.replacement.q ? o.replacement : null;
  let n = withHistory(g, 'invalid');
  refunds.forEach((r) => { n = addScore(n, r.team, r.delta); });
  const log = n.log.map((e) => (!isCur && e.kind === 'clue' && e.cell === where && !e.void ? { ...e, void: true } : e));
  log.push({ kind: 'invalid', where, round: g.round, cat: c.cat, tier: c.tier, value: c.value, refunds, replaced: !!rep, at: now });
  const boards = n.boards.map((b) => ({ ...b, cells: b.cells.map((x) => {
    if (x.id !== where) return x;
    const { result, ...rest } = x;
    return rep ? { ...rest, q: rep.q, status: 'open', replaced: (x.replaced || 0) + 1, why: undefined } : { ...rest, q: null, status: 'empty', why: 'invalid' };
  }) }));
  n = { ...n, boards, log, invalid: [...(n.invalid || []), invRecord(c.q, where, isCur ? g.current.stage : 'done', o, refunds, rep, now)] };
  if (isCur) {
    const cur = g.current;
    // The new clue opens straight away: a Risk It keeps its wager; a normal clue starts again.
    if (rep) n = { ...n, phase: 'clue', current: cur.wager && cur.bet != null
      ? { ...cur, stage: 'answer', team: cur.opener, tried: [], changes: [], result: null, endsAt: g.rules.answerClock ? now + ms(g.rules.answerTime * 1000) : null, pausedLeft: null, play: freshPlay() }
      : { ...cur, stage: cur.wager ? 'wager' : 'open', team: cur.wager ? cur.opener : null, tried: [], changes: [], result: null, endsAt: null, pausedLeft: null, play: freshPlay() } };
    else n = { ...n, phase: 'board', current: null };
  }
  if (n.phase === 'board' && isBoardDone(n)) n = endOfBoard(n, now);
  return n;
}
const canReplaceCell = (g, cellId) => { const b = boardOf(g); return !!b && (g.phase === 'board' || g.phase === 'clue') && b.cells.some((x) => x.id === cellId); };
const invRecord = (q, where, stage, o, refunds, rep, now) => ({ qid: q.id, where, facts: q.facts || [], stage, reason: INVALID_REASONS.includes(o.reason) ? o.reason : 'other', note: o.note ? String(o.note).slice(0, 300) : '', refunds, replacement: rep ? rep.q.id : null, how: rep ? rep.how : 'empty', at: now, q: { q: q.q, a: q.a } });
