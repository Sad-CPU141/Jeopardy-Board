/* ============================================================
   CLUE BANK — runtime for the data files in src/bank/.
   build.js joins src/bank/*.js (in name order) into bank.js, which
   index.html loads before app.js. The game reads window.JB_BANK.
   Clue history (what's been seen) is stored separately on the device.
   Same row format as Khatfa's question bank, with five values.

   Category meta: { g: group, e: emoji, en, ar, subs, pop: 1 = broadly popular, niche: 1 = specialist topic }
   Writing clues (one row per clue):
     ['id', value, 'Clue (English)', 'التلميح (عربي)', 'Response', 'الإجابة', { options }]
   The clue is a STATEMENT; the response is the short answer ("Rome", not "What is Rome?").
   value: 200 · 400 · 600 · 800 · 1000 = difficulty row 1–5 (easiest → hardest).
     The host can change the points in setup; the row (difficulty) stays the same.
   options (all optional):
     s:   subcategory key (from the category's subs)
     alt: other acceptable responses, English  (string or array)
     altAr: other acceptable responses, Arabic
     n / nAr: a short note shown after the response
     r:   where to verify it (a Wikipedia article title, or a full URL)
     v:   'web:YYYY-MM-DD' ONLY when the fact was actually checked online on that date
     f:   fact key(s) — clues sharing a key give each other away and never share a game
     c:   1 = time-sensitive; must also have asOf
     asOf:'YYYY-MM' the date the response was true
     ok:  1 = a person reviewed this clue's audit warnings
   Clue ids are permanent: never reuse or renumber them.
   ============================================================ */
(function () {
  var B = window.JB_BANK = { groups: [], cats: [], clues: [], errors: [] };
  var VALUES = { 200: 1, 400: 2, 600: 3, 800: 4, 1000: 5 };
  B.group = function (id, emoji, en, ar) { B.groups.push({ id: id, emoji: emoji, name: { en: en, ar: ar } }); };
  var arr = function (v) { return v == null ? [] : Array.isArray(v) ? v : [v]; };
  B.cat = function (id, meta, rows) {
    var subs = {};
    Object.keys(meta.subs || {}).forEach(function (k) { subs[k] = { en: meta.subs[k][0], ar: meta.subs[k][1] }; });
    var c = { id: id, group: meta.g, emoji: meta.e, name: { en: meta.en, ar: meta.ar }, subs: subs, count: [0, 0, 0, 0, 0], popular: meta.pop ? 1 : 0, nicheTopic: meta.niche ? 1 : 0 };
    B.cats.push(c);
    addRows(c, rows);
  };
  // More clues for a category defined elsewhere.
  B.more = function (id, rows) {
    var c = B.cats.filter(function (x) { return x.id === id; })[0];
    if (!c) { B.errors.push('more(): unknown category "' + id + '"'); return; }
    addRows(c, rows);
  };
  function addRows(c, rows) {
    var id = c.id, subs = c.subs;
    rows.forEach(function (row) {
      var o = row[6] || {};
      var tier = VALUES[row[1]];
      var q = {
        id: id + '.' + row[0], cat: id, tier: tier || 0, points: row[1], sub: o.s || null,
        q: { en: row[2], ar: row[3] }, a: { en: row[4], ar: row[5] },
        alt: { en: arr(o.alt), ar: arr(o.altAr) },
        note: o.n || o.nAr ? { en: o.n || '', ar: o.nAr || '' } : null,
        ref: o.r || null, verified: o.v || null,
        facts: arr(o.f), reviewed: o.ok ? 1 : 0, check: o.c ? 1 : 0, asOf: o.asOf || null,
      };
      if (!tier) B.errors.push(q.id + ': value must be 200, 400, 600, 800 or 1000 (got ' + row[1] + ')');
      if (q.sub && !subs[q.sub]) B.errors.push(q.id + ': unknown subcategory "' + q.sub + '"');
      if (tier) c.count[tier - 1]++;
      B.clues.push(q);
    });
  }
})();
