// Clue-bank audit (adapted from Khatfa's for 5 values). Run: npm run audit   (after npm run build)
// Reports real counts from bank.js and flags problems. Exits with code 1 on errors
// (things that must be fixed); warnings are things a person should review.
//   node tools/audit.js            full report
//   node tools/audit.js --json     machine-readable summary (used by the tests)
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const code = fs.readFileSync(path.join(root, 'bank.js'), 'utf8');
const sandbox = {}; sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
const B = sandbox.JB_BANK;
const VALUES = [200, 400, 600, 800, 1000];
const PER_ROW_GOAL = 4;
const LINKS = process.argv.includes('--links'); // clues per row per category, so boards don't repeat quickly

const errors = [...B.errors];
const warns = [];
const qs = B.clues;
const ids = new Map();
qs.forEach((q) => { ids.set(q.id, (ids.get(q.id) || 0) + 1); });
[...ids].filter(([, n]) => n > 1).forEach(([id, n]) => errors.push('duplicate id ' + id + ' (×' + n + ')'));
const catIds = new Map(); B.cats.forEach((c) => catIds.set(c.id, (catIds.get(c.id) || 0) + 1));
[...catIds].filter(([, n]) => n > 1).forEach(([id]) => errors.push('duplicate category id ' + id));
const groupIds = new Set(B.groups.map((g) => g.id));
B.cats.forEach((c) => { if (!groupIds.has(c.group)) errors.push(c.id + ': unknown group "' + c.group + '"'); });

const STOP = new Set('the a an of in on at to is was which what who whose whom how many much does did do for by with from and or as that this its it be are were his her their name called known first these this'.split(' '));
const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9؀-ۿ ]+/g, ' ').replace(/\s+/g, ' ').trim();
const toks = (s) => new Set(norm(s).split(' ').filter((w) => w && !STOP.has(w)));
const jacc = (a, b) => { let i = 0; a.forEach((x) => { if (b.has(x)) i++; }); return i / (a.size + b.size - i || 1); };
const stripArticle = (s) => norm(s).replace(/^(the|a|an) /, '');

qs.forEach((q) => {
  if (!VALUES.includes(q.points)) errors.push(q.id + ': invalid value ' + q.points);
  if (!q.q.en || !q.q.ar) errors.push(q.id + ': missing clue text (' + (!q.q.en ? 'en' : 'ar') + ')');
  if (!q.a.en || !q.a.ar) errors.push(q.id + ': missing response (' + (!q.a.en ? 'en' : 'ar') + ')');
  if (q.tier >= 4 && !q.ref) errors.push(q.id + ': 800/1000 clues need a verification reference (r)');
  if (q.tier === 3 && !q.ref) warns.push(q.id + ': 600 clue has no verification reference (r)');
  if (q.check && !q.asOf) errors.push(q.id + ': time-sensitive (c) but no asOf date');
  if (q.asOf && !/^\d{4}-\d{2}$/.test(q.asOf)) errors.push(q.id + ': asOf must look like YYYY-MM');
  if (q.verified && !/^web:\d{4}-\d{2}-\d{2}$/.test(q.verified)) errors.push(q.id + ': v must look like web:YYYY-MM-DD');
  // Clues are statements, not questions.
  if (q.q.en && /\?\s*$/.test(q.q.en.trim())) warns.push(q.id + ': English clue ends with "?" — clues should be statements');
  if (q.q.ar && /[?؟]\s*$/.test(q.q.ar.trim())) warns.push(q.id + ': Arabic clue ends with "؟" — clues should be statements');
  // Responses are short answers, not "What is …?"
  if (/^(what|who|where|when) (is|are|was|were)\b/i.test(q.a.en)) errors.push(q.id + ': response is phrased as a question; store the plain answer');
  if (q.a.en.length > 60) warns.push(q.id + ': long response (' + q.a.en.length + ' chars)');
  [...q.alt.en, ...q.alt.ar].forEach((a) => { const l = (x) => String(x || '').trim().toLowerCase(); if (!l(a) || l(a) === l(q.a.en) || l(a) === l(q.a.ar)) warns.push(q.id + ': accepted response "' + a + '" is empty or the same as the main one'); });
  const ans = stripArticle(q.a.en);
  if (ans.length > 3 && !q.reviewed && norm(q.q.en).split(' ').join(' ').includes(ans)) warns.push(q.id + ': the response appears in the clue');
});

// Exact and near duplicates across the bank, skipping pairs that share a declared fact key on purpose.
const ex = new Map();
qs.forEach((q) => { const k = norm(q.q.en); if (ex.has(k)) errors.push('exact duplicate clue: ' + ex.get(k) + ' / ' + q.id); else ex.set(k, q.id); });
const T = qs.map((q) => ({ q, t: toks(q.q.en), a: stripArticle(q.a.en) }));
for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) {
  const A = T[i], C = T[j];
  if (A.q.facts.some((k) => C.q.facts.includes(k))) continue;
  if (A.q.reviewed || C.q.reviewed) continue;
  const s = jacc(A.t, C.t);
  if (s >= 0.6 || (s >= 0.35 && A.a && A.a === C.a)) warns.push('possible near-duplicate (' + s.toFixed(2) + '): ' + A.q.id + ' / ' + C.q.id);
  // --links: one clue's response named in another clue's text (review by hand; most are harmless).
  if (LINKS && A.a.length > 4 && !/^\d+$/.test(A.a) && norm(C.q.q.en).includes(A.a)) warns.push('clue ' + C.q.id + ' mentions the response of ' + A.q.id + ' ("' + A.q.a.en + '") — add a shared f key');
  if (LINKS && C.a.length > 4 && !/^\d+$/.test(C.a) && norm(A.q.q.en).includes(C.a)) warns.push('clue ' + A.q.id + ' mentions the response of ' + C.q.id + ' ("' + C.q.a.en + '") — add a shared f key');
}

// Difficulty sanity: a 1000 clue with the same response as a 200 clue in the same category.
B.cats.forEach((c) => {
  const mine = qs.filter((q) => q.cat === c.id);
  const easy = new Set(mine.filter((q) => q.tier <= 2).map((q) => stripArticle(q.a.en)));
  mine.filter((q) => q.tier >= 4 && !q.reviewed && easy.has(stripArticle(q.a.en))).forEach((q) => warns.push(q.id + ': hard clue has the same response as an easy one in ' + c.id + ' — check the difficulty'));
});

// Cultural balance: how much of the bank is about the Arab world / Middle East / Islam.
// Same rule as Khatfa's audit, so the two games' shares are comparable.
const ARAB_RE = /\b(saudi|arab|arabs|arabic|arabia|arabian|islam|islamic|muslim|muslims|mecca|makkah|medina|madinah|riyadh|jeddah|hejaz|hijazi|najd|najdi|gulf|qatar|qatari|kuwait|bahrain|oman|omani|emirati|emirates|uae|dubai|abu dhabi|yemen|yemeni|hijri|hijra|hajj|ramadan|eid|iftar|suhoor|caliph|caliphate|umayyad|abbasid|ottoman|egypt|egyptian|cairo|iraq|baghdad|damascus|syria|syrian|jordan|lebanon|lebanese|morocco|moroccan|algeria|tunisia|tunisian|levant|levantine|alula|neom|aramco|kabsa|oud|maqam)\b/i;
const isArab = (q) => { const c = B.cats.find((x) => x.id === q.cat); return (c && c.group === 'arab') || ARAB_RE.test(q.q.en + ' ' + q.a.en); };
const arabAll = qs.filter(isArab).length;

const per = (pred) => qs.filter(pred).length;
const byValue = VALUES.map((p) => per((q) => q.points === p));
const cats = B.cats.map((c) => {
  const mine = qs.filter((q) => q.cat === c.id);
  const t = [1, 2, 3, 4, 5].map((x) => mine.filter((q) => q.tier === x).length);
  return { id: c.id, group: c.group, name: c.name.en, total: mine.length, tiers: t, web: mine.filter((q) => q.verified).length, timeSensitive: mine.filter((q) => q.check).length, arab: mine.filter(isArab).length };
});
const missingRow = cats.filter((c) => c.tiers.some((n) => n === 0));
const under = cats.filter((c) => c.tiers.some((n) => n < PER_ROW_GOAL));
const summary = {
  clues: qs.length, groups: B.groups.length, categories: B.cats.length,
  byValue: Object.fromEntries(VALUES.map((v, i) => [v, byValue[i]])),
  webChecked: per((q) => q.verified), timeSensitive: per((q) => q.check), withRef: per((q) => q.ref),
  missingRow: missingRow.map((c) => c.id), underfilled: under.map((c) => c.id),
  errors: errors.length, warnings: warns.length,
  arabShare: { all: arabAll, pct: Math.round((arabAll / Math.max(1, qs.length)) * 1000) / 10 },
  byGroup: Object.fromEntries(B.groups.map((g) => [g.id, { categories: B.cats.filter((c) => c.group === g.id).length, clues: qs.filter((q) => (B.cats.find((c) => c.id === q.cat) || {}).group === g.id).length }])),
  smallest: Math.min(...cats.map((c) => c.total)),
};

if (process.argv.includes('--json')) { console.log(JSON.stringify({ summary, cats, errors, warns })); process.exit(errors.length ? 1 : 0); }

const pad = (s, n) => String(s).padEnd(n);
console.log('CLUE BANK AUDIT');
console.log('Clues: ' + summary.clues + ' · ' + summary.categories + ' categories in ' + summary.groups + ' groups · smallest category: ' + summary.smallest);
console.log('By value: ' + VALUES.map((v, i) => v + ' → ' + byValue[i]).join(' · '));
console.log('Checked online (v): ' + summary.webChecked + ' · time-sensitive (c): ' + summary.timeSensitive + ' · with a source reference (r): ' + summary.withRef);
console.log('Arab / Middle East / Islam related: ' + arabAll + ' (' + summary.arabShare.pct + '% of all; target about 10–12%)');
console.log('By topic group: ' + B.groups.map((g) => g.id + ' ' + summary.byGroup[g.id].clues + ' (' + summary.byGroup[g.id].categories + ')').join(' · '));
console.log('');
console.log(pad('category', 18) + pad('group', 9) + pad('total', 7) + VALUES.map((v) => pad(v, 6)).join('') + pad('arab', 6) + pad('c:1', 5) + 'v:');
cats.forEach((c) => console.log(pad(c.id, 18) + pad(c.group, 9) + pad(c.total, 7) + c.tiers.map((n) => pad(n, 6)).join('') + pad(c.arab, 6) + pad(c.timeSensitive, 5) + c.web));
console.log('');
console.log('Missing a row: ' + (missingRow.length ? missingRow.map((c) => c.id).join(', ') : 'none'));
console.log('Under ' + PER_ROW_GOAL + ' clues in a row: ' + (under.length ? under.map((c) => c.id + ' [' + c.tiers.join('/') + ']').join(', ') : 'none'));
console.log('');
console.log('ERRORS (' + errors.length + ')'); errors.forEach((e) => console.log('  ✗ ' + e));
console.log('WARNINGS (' + warns.length + ')'); warns.forEach((w) => console.log('  ! ' + w));
process.exit(errors.length ? 1 : 0);
