/* ============================================================
   CLUE SELECTION — pure functions, no UI.
   · Each board has 6 categories × 5 rows (row 1 easiest … row 5 hardest).
   · Categories are drawn at random from the ones switched on, spread across
     topic groups, avoiding categories used in recent games.
   · A clue is never used twice in one game, and two clues that give each other
     away (same `f` fact key) never share a game.
   · Clues seen in recent games are avoided (soft by default; Strict No-Repeats
     excludes them until the category runs out).
   · The final round uses a category that isn't on either board, and one of its
     hardest clues.
   ============================================================ */
const ROWS = 5;
const STRICT_WINDOW = 50; // games: "recently seen" for Strict No-Repeats

// Index the bank once: categories with live counts, clues by category.
function indexBank(raw) {
  const B = raw || (typeof window !== 'undefined' && window.JB_BANK) || { groups: [], cats: [], clues: [] };
  const byCat = {};
  B.cats.forEach((c) => { byCat[c.id] = []; });
  B.clues.forEach((q) => { if (q.tier && byCat[q.cat]) byCat[q.cat].push(q); });
  return { groups: B.groups, cats: B.cats, byCat, total: B.clues.filter((q) => q.tier).length, errors: B.errors || [] };
}
const tierCounts = (qs) => [1, 2, 3, 4, 5].map((t) => qs.filter((q) => q.tier === t).length);
// A category can go on a board when it has at least one clue in every row.
const canFillColumn = (qs) => tierCounts(qs || []).every((n) => n > 0);
// Categories this game may use (host's switched-on list, able to fill a column).
function usableCats(bank, rules) {
  return bank.cats.filter((c) => !(rules.exclude || []).includes(c.id) && canFillColumn(bank.byCat[c.id]));
}
// How many categories one game needs.
const catsNeeded = (rules) => rules.catsPerBoard * rules.rounds + (rules.final ? 1 : 0);

function weightedPick(items, weights, rand) {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return items[Math.floor(rand() * items.length)];
  let r = rand() * total;
  for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}
// Recently seen = less likely (never impossible, unless Strict No-Repeats).
const ageWeight = (seenAt, gameNo) => {
  if (seenAt == null || gameNo == null) return 1;
  const age = Math.max(1, gameNo - seenAt);
  return age <= 1 ? 0.01 : age <= 3 ? 0.05 : age <= 10 ? 0.2 : 0.6;
};

/* Pick `n` categories. Varied: each pick prefers a topic group not used yet.
   ctx: { rand, catSeen: { catId: gameNo }, gameNo, taken: Set(catIds) } */
function pickCategories(cands, n, ctx) {
  const rand = ctx.rand || Math.random;
  const out = []; const taken = new Set(ctx.taken || []); const groups = new Set();
  for (let k = 0; k < n; k++) {
    const left = cands.filter((c) => !taken.has(c.id));
    if (!left.length) break;
    const fresh = left.filter((c) => !groups.has(c.group));
    const pool = fresh.length ? fresh : left;
    const c = weightedPick(pool, pool.map((x) => ageWeight(ctx.catSeen && ctx.catSeen[x.id], ctx.gameNo)), rand);
    out.push(c); taken.add(c.id); groups.add(c.group);
  }
  return out;
}

/* Pick one clue of `tier` from `pool`.
   ctx: { used:Set(ids), facts:Set(keys), recent:{id:gameNo}, gameNo, rand, strict } */
function pickClue(pool, tier, ctx) {
  const rand = ctx.rand || Math.random;
  const keys = (q) => (q.facts && q.facts.length ? q.facts : [q.id]);
  const left = pool.filter((q) => q.tier === tier && !ctx.used.has(q.id) && !keys(q).some((k) => ctx.facts.has(k)));
  if (!left.length) return { q: null, repeat: false };
  const recentOf = (q) => ctx.recent && ctx.recent[q.id] != null && ctx.gameNo != null && ctx.gameNo - ctx.recent[q.id] <= STRICT_WINDOW;
  let choose = left;
  if (ctx.strict) {
    const fresh = left.filter((q) => !recentOf(q));
    if (fresh.length) choose = fresh;
    else { const oldest = Math.min(...left.map((q) => ctx.recent[q.id])); choose = left.filter((q) => ctx.recent[q.id] === oldest); }
  }
  const q = weightedPick(choose, choose.map((x) => ageWeight(ctx.recent && ctx.recent[x.id], ctx.gameNo)), rand);
  ctx.used.add(q.id); keys(q).forEach((k) => ctx.facts.add(k));
  return { q, repeat: recentOf(q) };
}

const catInfo = (c) => ({ id: c.id, emoji: c.emoji, name: c.name, group: c.group });
// What a tile is worth: the row's value from setup, doubled in round 2.
const cellValue = (rules, round, tier) => (rules.values[tier - 1] || 0) * (round === 2 ? 2 : 1);

/* Build everything a game needs, up front, so a saved game always shows the same clues.
   ctx: { bank, recent, catSeen, gameNo, rand, used: [clue ids to leave out] }
   Returns { boards: [{ round, cats, cells }], final: { cat, q } | null, report: { short, repeats } } */
function selectGame(rules, ctx) {
  const rand = ctx.rand || Math.random;
  const bank = ctx.bank;
  const c = { used: new Set(ctx.used || []), facts: new Set(), recent: ctx.recent || {}, gameNo: ctx.gameNo, rand, strict: !!rules.strict };
  const cands = usableCats(bank, rules);
  const report = { short: 0, repeats: 0 };
  const taken = new Set();
  // The final category first, from the categories with the deepest hard rows, so the final clue is a real test.
  let final = null;
  if (rules.final) {
    const deep = cands.filter((x) => tierCounts(bank.byCat[x.id])[4] >= 1);
    const [fc] = pickCategories(deep.length ? deep : cands, 1, { rand, catSeen: ctx.catSeen, gameNo: ctx.gameNo });
    if (fc) {
      taken.add(fc.id);
      final = { cat: catInfo(fc), q: null }; // its clue is picked after the boards
    }
  }
  const boards = [];
  for (let round = 1; round <= rules.rounds; round++) {
    const cats = pickCategories(cands, rules.catsPerBoard, { rand, catSeen: ctx.catSeen, gameNo: ctx.gameNo, taken });
    cats.forEach((x) => taken.add(x.id));
    const cells = [];
    cats.forEach((cat) => {
      for (let tier = 1; tier <= ROWS; tier++) {
        const r = pickClue(bank.byCat[cat.id] || [], tier, c);
        if (r.repeat) report.repeats++;
        if (!r.q) report.short++;
        cells.push({ id: 'r' + round + ':' + cat.id + ':' + tier, cat: cat.id, tier, value: cellValue(rules, round, tier), q: r.q, status: r.q ? 'open' : 'empty', wager: 0 });
      }
    });
    // Hidden Risk It squares: 1 in round 1, 2 in round 2 (in different categories), never in the top row.
    const want = round === 1 ? 1 : 2;
    const spots = shuffleWith(cells.filter((x) => x.status === 'open' && x.tier >= 2), rand);
    const usedCats = new Set();
    for (const s of spots) { if (usedCats.size >= want) break; if (usedCats.has(s.cat)) continue; s.wager = 1; usedCats.add(s.cat); }
    boards.push({ round, cats: cats.map(catInfo), cells });
  }
  if (final) {
    const pool = bank.byCat[final.cat.id] || [];
    const r = pickClue(pool, 5, c).q || pickClue(pool, 4, c).q || pickClue(pool, 3, c).q;
    if (r) final.q = r; else { final = null; report.short++; }
  }
  return { boards, final, report };
}

/* A replacement for a clue flagged as wrong: same row, same category first,
   then any category this game isn't using. Never a clue the game has already used. */
function findReplacement(g, catId, tier, ctx) {
  if (!ctx || !ctx.bank) return null;
  const { used, facts } = gameUsed(g);
  (ctx.exclude || []).forEach((id) => used.add(id));
  const c = { used, facts, recent: ctx.recent || {}, gameNo: g.gameNo, rand: ctx.rand || Math.random, strict: false };
  const same = pickClue(ctx.bank.byCat[catId] || [], tier, c).q;
  if (same) return { q: same, how: 'same' };
  const inGame = new Set(gameCatIds(g));
  for (const cat of shuffleWith(usableCats(ctx.bank, g.rules).filter((x) => !inGame.has(x.id)), c.rand)) {
    const q = pickClue(ctx.bank.byCat[cat.id] || [], tier, c).q;
    if (q) return { q, how: 'other' };
  }
  return null;
}
const gameCatIds = (g) => [...(g.boards || []).flatMap((b) => b.cats.map((x) => x.id)), ...(g.final ? [g.final.cat.id] : [])];
// Every clue id this game has used or ruled out (so a replacement is always fresh).
function gameUsed(g) {
  const used = new Set(); const facts = new Set();
  const add = (q) => { if (!q) return; used.add(q.id); (q.facts && q.facts.length ? q.facts : [q.id]).forEach((k) => facts.add(k)); };
  (g.boards || []).forEach((b) => b.cells.forEach((x) => add(x.q)));
  if (g.final) add(g.final.q);
  (g.invalid || []).forEach((x) => { used.add(x.qid); (x.facts || []).forEach((k) => facts.add(k)); });
  return { used, facts };
}

/* ---------- clue history (kept apart from the bank) ---------- */
// history = { n: games started, seen: { clueId: game number when shown }, cats: { catId: game number } }
const emptyHistory = () => ({ n: 0, seen: {}, cats: {} });
function markSeen(history, qid, gameNo) {
  const h = history || emptyHistory();
  return { ...h, seen: { ...h.seen, [qid]: gameNo } };
}
function markCatsUsed(history, ids, gameNo) {
  const h = history || emptyHistory();
  const cats = { ...(h.cats || {}) }; ids.forEach((id) => { cats[id] = gameNo; });
  return { ...h, n: Math.max(h.n || 0, gameNo), cats };
}
function startGameNo(history) { return ((history && history.n) || 0) + 1; }
// Keep history small: forget clues not seen for a long time.
function trimHistory(h, keepGames = 200) {
  if (!h) return emptyHistory();
  const seen = {}; Object.keys(h.seen || {}).forEach((id) => { if (h.n - h.seen[id] < keepGames) seen[id] = h.seen[id]; });
  return { n: h.n || 0, seen, cats: h.cats || {} };
}
