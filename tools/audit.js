// Clue-bank audit (adapted from Khatfa's, for 5 values and an English-only bank).
// Run: npm run audit   (after npm run build)
// Reports real counts from bank.js and flags problems. Exits with code 1 on errors
// (things that must be fixed); warnings are things a person should review.
//   node tools/audit.js            full report
//   node tools/audit.js --json     machine-readable summary (used by the tests)
//   node tools/audit.js --links    also list clues that mention another clue's response
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
const PER_ROW_GOAL = 4; // clues per row per category, so boards don't repeat quickly
const LINKS = process.argv.includes('--links');

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
const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const toks = (s) => new Set(norm(s).split(' ').filter((w) => w && !STOP.has(w)));
const jacc = (a, b) => { let i = 0; a.forEach((x) => { if (b.has(x)) i++; }); return i / (a.size + b.size - i || 1); };
const stripArticle = (s) => norm(s).replace(/^(the|a|an) /, '');
const NON_LATIN = /[֐-ࣿЀ-ӿ぀-ヿ一-鿿]/; // the bank is English-only

qs.forEach((q) => {
  if (!VALUES.includes(q.points)) errors.push(q.id + ': invalid value ' + q.points);
  if (!q.q) errors.push(q.id + ': missing clue text');
  if (!q.a) errors.push(q.id + ': missing response');
  if (NON_LATIN.test(q.q + ' ' + q.a + ' ' + q.alt.join(' ') + ' ' + (q.note || ''))) errors.push(q.id + ': non-English script in the clue — the bank is English-only');
  if (q.tier >= 4 && !q.ref) errors.push(q.id + ': 800/1000 clues need a verification reference (r)');
  if (q.tier === 3 && !q.ref) warns.push(q.id + ': 600 clue has no verification reference (r)');
  if (q.check && !q.asOf) errors.push(q.id + ': time-sensitive (c) but no asOf date');
  if (q.asOf && !/^\d{4}-\d{2}$/.test(q.asOf)) errors.push(q.id + ': asOf must look like YYYY-MM');
  if (q.verified && !/^web:\d{4}-\d{2}-\d{2}$/.test(q.verified)) errors.push(q.id + ': v must look like web:YYYY-MM-DD');
  if (q.q && /\?\s*$/.test(q.q.trim())) warns.push(q.id + ': clue ends with "?" — clues should be statements');
  if (/^(what|who|where|when) (is|are|was|were)\b/i.test(q.a)) errors.push(q.id + ': response is phrased as a question; store the plain answer');
  if (q.a.length > 60) warns.push(q.id + ': long response (' + q.a.length + ' chars)');
  q.alt.forEach((a) => { if (!String(a).trim() || String(a).trim().toLowerCase() === q.a.trim().toLowerCase()) warns.push(q.id + ': accepted response "' + a + '" is empty or the same as the main one'); });
  const ans = stripArticle(q.a);
  if (ans.length > 3 && !q.reviewed && norm(q.q).includes(ans)) warns.push(q.id + ': the response appears in the clue');
});

// Pictures and sounds: the file must exist, have a neutral name, a description (pictures) and a credit.
qs.filter((q) => q.media).forEach((q) => {
  const m = q.media;
  if (m.src && !fs.existsSync(path.join(root, m.src))) errors.push(q.id + ': media file missing: ' + m.src);
  if (m.src && !/^[0-9a-f]{12}$/.test(path.basename(m.src).replace(/\.[a-z0-9]+$/, ''))) warns.push(q.id + ': media file name is not neutral (could give the response away): ' + m.src);
  if (m.type === 'image' && !m.alt) warns.push(q.id + ': picture has no description (alt)');
  if (!m.credit) warns.push(q.id + ': media has no credit/licence');
});

// Exact and near duplicates, skipping pairs that share a declared fact key on purpose.
// A picture/sound clue is identified by its text plus its file.
const mediaKey = (q) => (q.media ? ' #' + q.media.src : '');
const ex = new Map();
qs.forEach((q) => { const k = norm(q.q) + mediaKey(q); if (ex.has(k)) errors.push('exact duplicate clue: ' + ex.get(k) + ' / ' + q.id); else ex.set(k, q.id); });
const T = qs.map((q) => ({ q, t: toks(q.q), a: stripArticle(q.a) }));
for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) {
  const A = T[i], C = T[j];
  if (A.q.facts.some((k) => C.q.facts.includes(k))) continue;
  if (A.q.reviewed || C.q.reviewed) continue;
  if (A.q.media && C.q.media) { if (mediaKey(A.q) === mediaKey(C.q)) warns.push('same media used twice: ' + A.q.id + ' / ' + C.q.id); continue; }
  const s = jacc(A.t, C.t);
  if (s >= 0.6 || (s >= 0.35 && A.a && A.a === C.a)) warns.push('possible near-duplicate (' + s.toFixed(2) + '): ' + A.q.id + ' / ' + C.q.id);
  if (LINKS && A.a.length > 4 && !/^\d+$/.test(A.a) && norm(C.q.q).includes(A.a)) warns.push('clue ' + C.q.id + ' mentions the response of ' + A.q.id + ' ("' + A.q.a + '")');
  if (LINKS && C.a.length > 4 && !/^\d+$/.test(C.a) && norm(A.q.q).includes(C.a)) warns.push('clue ' + A.q.id + ' mentions the response of ' + C.q.id + ' ("' + C.q.a + '")');
}

// Difficulty sanity: a hard clue with the same response as an easy one in the same category.
B.cats.forEach((c) => {
  const mine = qs.filter((q) => q.cat === c.id);
  const easy = new Set(mine.filter((q) => q.tier <= 2).map((q) => stripArticle(q.a)));
  mine.filter((q) => q.tier >= 4 && !q.reviewed && easy.has(stripArticle(q.a))).forEach((q) => warns.push(q.id + ': hard clue has the same response as an easy one in ' + c.id + ' — check the difficulty'));
});

const per = (pred) => qs.filter(pred).length;
const byValue = VALUES.map((p) => per((q) => q.points === p));
const cats = B.cats.map((c) => {
  const mine = qs.filter((q) => q.cat === c.id);
  const t = [1, 2, 3, 4, 5].map((x) => mine.filter((q) => q.tier === x).length);
  return { id: c.id, group: c.group, name: c.name, total: mine.length, tiers: t, web: mine.filter((q) => q.verified).length, timeSensitive: mine.filter((q) => q.check).length, media: mine.filter((q) => q.media).length };
});
const missingRow = cats.filter((c) => c.tiers.some((n) => n === 0));
const under = cats.filter((c) => c.tiers.some((n) => n < PER_ROW_GOAL));
const summary = {
  clues: qs.length, groups: B.groups.length, categories: B.cats.length,
  byValue: Object.fromEntries(VALUES.map((v, i) => [v, byValue[i]])),
  byType: { text: per((q) => !q.media), image: per((q) => q.media && q.media.type === 'image'), audio: per((q) => q.media && q.media.type === 'audio') },
  webChecked: per((q) => q.verified), timeSensitive: per((q) => q.check), withRef: per((q) => q.ref),
  missingRow: missingRow.map((c) => c.id), underfilled: under.map((c) => c.id),
  errors: errors.length, warnings: warns.length,
  byGroup: Object.fromEntries(B.groups.map((g) => [g.id, { categories: B.cats.filter((c) => c.group === g.id).length, clues: qs.filter((q) => (B.cats.find((c) => c.id === q.cat) || {}).group === g.id).length }])),
  smallest: Math.min(...cats.map((c) => c.total)),
};

if (process.argv.includes('--json')) { console.log(JSON.stringify({ summary, cats, errors, warns })); process.exit(errors.length ? 1 : 0); }

const pad = (s, n) => String(s).padEnd(n);
console.log('CLUE BANK AUDIT');
console.log('Clues: ' + summary.clues + ' · ' + summary.categories + ' categories in ' + summary.groups + ' groups · smallest category: ' + summary.smallest);
console.log('By value: ' + VALUES.map((v, i) => v + ' → ' + byValue[i]).join(' · '));
console.log('By type: text ' + summary.byType.text + ' · pictures ' + summary.byType.image + ' · sounds ' + summary.byType.audio);
console.log('Checked online (v): ' + summary.webChecked + ' · time-sensitive (c): ' + summary.timeSensitive + ' · with a source reference (r): ' + summary.withRef);
console.log('By topic group: ' + B.groups.map((g) => g.id + ' ' + summary.byGroup[g.id].clues + ' (' + summary.byGroup[g.id].categories + ')').join(' · '));
console.log('');
console.log(pad('category', 18) + pad('group', 9) + pad('total', 7) + VALUES.map((v) => pad(v, 6)).join('') + pad('media', 7) + pad('c:1', 5) + 'v:');
cats.forEach((c) => console.log(pad(c.id, 18) + pad(c.group, 9) + pad(c.total, 7) + c.tiers.map((n) => pad(n, 6)).join('') + pad(c.media, 7) + pad(c.timeSensitive, 5) + c.web));
console.log('');
console.log('Missing a row: ' + (missingRow.length ? missingRow.map((c) => c.id).join(', ') : 'none'));
console.log('Under ' + PER_ROW_GOAL + ' clues in a row: ' + (under.length ? under.map((c) => c.id + ' [' + c.tiers.join('/') + ']').join(', ') : 'none'));
console.log('');
console.log('ERRORS (' + errors.length + ')'); errors.forEach((e) => console.log('  ✗ ' + e));
console.log('WARNINGS (' + warns.length + ')'); warns.forEach((w) => console.log('  ! ' + w));
process.exit(errors.length ? 1 : 0);
