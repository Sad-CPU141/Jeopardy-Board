/* ============================================================
   CLUE BANK — runtime for the data files in src/bank/.
   build.js joins src/bank/*.js (in name order) into bank.js, which
   index.html loads before app.js. The game reads window.JB_BANK.
   Clue history (what's been seen) is stored separately on the device.

   Category meta: { g: group, e: emoji, name, pop: 1 = broadly popular, niche: 1 = specialist topic }
   Writing clues (one row per clue):
     ['id', value, 'Clue', 'Response', { options }]
   The clue is a STATEMENT; the response is the short answer ("Rome", not "What is Rome?").
   value: 200 · 400 · 600 · 800 · 1000 = difficulty row 1–5 (easiest → hardest).
     The host can change the points in setup; the row (difficulty) stays the same.
   options (all optional):
     alt: other acceptable responses (string or array)
     n:   a short note shown after the response
     r:   where to verify it (a Wikipedia article title, or a full URL)
     v:   'web:YYYY-MM-DD' ONLY when the fact was actually checked online on that date
     f:   fact key(s) — clues sharing a key give each other away and never share a game
     c:   1 = time-sensitive; must also have asOf
     asOf:'YYYY-MM' the date the response was true
     ok:  1 = a person reviewed this clue's audit warnings
     m:   a picture or sound, e.g.
            { type: 'image', src: '@flag-jp', alt: 'A description', credit: '…' }
            { type: 'audio', src: '@snd-doorbell', credit: '…' }
          '@key' points at a built-in file listed in src/bank/02-media.js. File names are
          content hashes, so they never give the response away.
   Clue ids are permanent: never reuse or renumber them.
   ============================================================ */
(function () {
  var B = window.JB_BANK = { groups: [], cats: [], clues: [], errors: [], media: {} };
  var VALUES = { 200: 1, 400: 2, 600: 3, 800: 4, 1000: 5 };
  B.group = function (id, emoji, name) { B.groups.push({ id: id, emoji: emoji, name: name }); };
  var arr = function (v) { return v == null ? [] : Array.isArray(v) ? v : [v]; };
  B.cat = function (id, meta, rows) {
    var c = { id: id, group: meta.g, emoji: meta.e, name: meta.name, count: [0, 0, 0, 0, 0], popular: meta.pop ? 1 : 0, nicheTopic: meta.niche ? 1 : 0 };
    B.cats.push(c);
    addRows(c, rows);
  };
  B.more = function (id, rows) {
    var c = B.cats.filter(function (x) { return x.id === id; })[0];
    if (!c) { B.errors.push('more(): unknown category "' + id + '"'); return; }
    addRows(c, rows);
  };
  function addRows(c, rows) {
    rows.forEach(function (row) {
      var o = row[4] || {};
      var tier = VALUES[row[1]];
      var media = null;
      if (o.m) {
        media = {}; Object.keys(o.m).forEach(function (k) { media[k] = o.m[k]; });
        if (typeof media.src === 'string' && media.src.charAt(0) === '@') {
          var key = media.src.slice(1);
          media.src = B.media[key] || null;
          if (!media.src) B.errors.push(c.id + '.' + row[0] + ': unknown media file "' + key + '"');
        }
      }
      var q = {
        id: c.id + '.' + row[0], cat: c.id, tier: tier || 0, points: row[1],
        q: row[2], a: row[3], alt: arr(o.alt), note: o.n || null,
        ref: o.r || null, verified: o.v || null,
        facts: arr(o.f), reviewed: o.ok ? 1 : 0, check: o.c ? 1 : 0, asOf: o.asOf || null,
        type: media ? media.type : 'text', media: media,
      };
      if (!tier) B.errors.push(q.id + ': value must be 200, 400, 600, 800 or 1000 (got ' + row[1] + ')');
      if (typeof q.q !== 'string' || typeof q.a !== 'string') B.errors.push(q.id + ': clue and response must be text');
      if (o.m && ['image', 'audio'].indexOf(o.m.type) < 0) B.errors.push(q.id + ': unknown media type');
      if (o.m && !media.src) B.errors.push(q.id + ': media without a file');
      if (tier) c.count[tier - 1]++;
      B.clues.push(q);
    });
  }
})();
