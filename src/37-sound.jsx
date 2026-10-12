/* ============================================================
   SOUND: one central sound manager for game events (adapted from Khatfa).
   Where a sound comes from (first one found wins):
     1. Your own recording for that event (Settings → Sound), saved in this browser (IndexedDB).
     2. A file in the site's sounds/ folder named after the event (e.g. sounds/correct.mp3);
        build.js lists them in SOUND_FILES.
     3. A simple built-in sound, generated in the browser (no files, nothing copyrighted).
        Can be switched off.
     4. Nothing: the game works the same with no sound at all.
   Only ONE device plays: the TV window if one is open (unless the host chose "play here"),
   otherwise this device. Every event has a unique id, so a repeated message, a re-render or
   an undo never plays it twice. Muted = nothing plays (and nothing is queued for later).
   There is no "thinking music": the final round's clock just ticks in its last 5 seconds.
   ============================================================ */
const SFX = [
  { id: 'countdown-tick', en: 'Clock ticks (last 5 s)', ar: 'تكتكة الساعة (آخر ٥ ثواني)' },
  { id: 'clue-open', en: 'A clue opens', ar: 'فتح تلميح' },
  { id: 'correct', en: 'Right answer', ar: 'جواب صح', voice: 1 },
  { id: 'wrong', en: 'Wrong answer', ar: 'جواب غلط', voice: 1 },
  { id: 'risk-it', en: 'Risk It square found', ar: 'خانة «خاطِر»', voice: 1 },
  { id: 'round-end', en: 'End of a round', ar: 'نهاية جولة' },
  { id: 'final-category', en: 'Final Wager category', ar: 'فئة الرهان الأخير', voice: 1 },
  { id: 'final-clue', en: 'Final clue shown', ar: 'عرض التلميح الأخير' },
  { id: 'game-intro', en: 'Game intro', ar: 'بداية اللعبة', voice: 1 },
  { id: 'winner-fanfare', en: 'Winner', ar: 'الفائز', voice: 1 },
];
const DEFAULT_SOUND = { volume: 0.8, muted: false, builtin: true, files: {} };
const cleanSound = (s) => {
  const x = { ...DEFAULT_SOUND, ...(s || {}) };
  x.volume = clamp(+x.volume || 0, 0, 1); x.muted = !!x.muted; x.builtin = x.builtin !== false;
  x.files = x.files && typeof x.files === 'object' ? x.files : {};
  return x;
};
const SOUND_MAX_BYTES = 3 * 1024 * 1024, SOUND_MAX_SECONDS = 20;
const REPO_SOUNDS = (typeof SOUND_FILES !== 'undefined' && SOUND_FILES) || {};

const sound = (() => {
  let ctx = null; let master = null;
  let cfg = cleanSound();
  const seen = new Set(); const seenOrder = [];
  const buffers = new Map(); // src → Promise<AudioBuffer|null>
  const log = []; // what was played (for tests and the settings screen)
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  function ensure() {
    if (!AC) return null;
    if (!ctx) { try { ctx = new AC(); master = ctx.createGain(); master.connect(ctx.destination); } catch (e) { ctx = null; return null; } }
    master.gain.value = cfg.volume;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  const remember = (id) => { if (!id) return false; if (seen.has(id)) return true; seen.add(id); seenOrder.push(id); if (seenOrder.length > 400) seen.delete(seenOrder.shift()); return false; };
  async function bufferFor(src) {
    if (!buffers.has(src)) {
      buffers.set(src, (async () => {
        const c = ensure(); if (!c) return null;
        try {
          let ab;
          if (isLocalFile(src)) { const rec = await fileStore.get(src.slice(4)); if (!rec || !rec.blob) return null; ab = await rec.blob.arrayBuffer(); }
          else { const r = await fetch(src); if (!r.ok) return null; ab = await r.arrayBuffer(); }
          return await new Promise((res) => { try { const p = c.decodeAudioData(ab, res, () => res(null)); if (p && p.catch) p.catch(() => res(null)); } catch (e) { res(null); } });
        } catch (e) { return null; }
      })());
    }
    return buffers.get(src);
  }
  const sourceOf = (name) => (cfg.files[name] ? 'custom' : REPO_SOUNDS[name] ? 'file' : cfg.builtin ? 'builtin' : 'none');
  async function playFile(src) {
    const c = ensure(); if (!c) return false;
    const b = await bufferFor(src); if (!b) return false;
    const n = c.createBufferSource(); n.buffer = b; n.connect(master); n.start();
    return true;
  }
  async function playNow(name) {
    const via = sourceOf(name);
    const entry = { name, via, at: Date.now(), result: 'pending' };
    log.push(entry); if (log.length > 200) log.shift();
    let res = 'none';
    try {
      if (via === 'custom' && await playFile(cfg.files[name])) res = 'custom';
      else if ((via === 'custom' || via === 'file') && REPO_SOUNDS[name] && await playFile(REPO_SOUNDS[name])) res = 'file';
      else if (cfg.builtin) { const c = ensure(); if (c) { synth(c, master, name); res = 'builtin'; } }
    } catch (e) { res = 'error'; }
    entry.result = res; // a missing/broken file falls back to the built-in sound (or silence)
    return res;
  }
  return {
    play(name, id) {
      if (remember(id)) return false;
      if (cfg.muted || !SFX.some((x) => x.id === name)) return false;
      playNow(name);
      return true;
    },
    preview(name) { if (!cfg.muted) playNow(name); },
    unlock() { ensure(); },
    setConfig(c) { const next = cleanSound(c); Object.keys(cfg.files).forEach((k) => { if (cfg.files[k] !== next.files[k]) buffers.delete(cfg.files[k]); }); cfg = next; if (master) master.gain.value = cfg.volume; },
    get config() { return cfg; },
    get unlocked() { return !!ctx && ctx.state === 'running'; },
    sourceOf, log,
    reset() { seen.clear(); seenOrder.length = 0; log.length = 0; },
  };
})();

/* ---------- built-in sounds (generated; short and simple; our own) ---------- */
function synth(c, out, name) {
  const t0 = c.currentTime + 0.01;
  const tone = (f, at, dur, { type = 'sine', vol = 0.35, f2 = null, attack = 0.01 } = {}) => {
    const o = c.createOscillator(); const g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, at); if (f2) o.frequency.exponentialRampToValueAtTime(f2, at + dur);
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + attack); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); g.connect(out); o.start(at); o.stop(at + dur + 0.05);
  };
  const seq = (notes, step, opts) => notes.forEach((f, i) => tone(f, t0 + i * step, opts && opts.dur ? opts.dur : step * 1.6, opts));
  switch (name) {
    case 'countdown-tick': tone(1400, t0, 0.05, { type: 'square', vol: 0.16, attack: 0.002 }); break;
    case 'clue-open': tone(660, t0, 0.12, { type: 'triangle', vol: 0.22 }); tone(990, t0 + 0.08, 0.2, { type: 'triangle', vol: 0.2 }); break;
    case 'correct': seq([659, 880, 1175], 0.08, { type: 'triangle', vol: 0.32, dur: 0.3 }); break;
    case 'wrong': tone(240, t0, 0.32, { type: 'square', vol: 0.12, f2: 160 }); break;
    case 'risk-it': [0, 0.12, 0.24, 0.36].forEach((d, i) => tone(523 * Math.pow(1.26, i), t0 + d, 0.16, { type: 'sawtooth', vol: 0.12 })); tone(1047, t0 + 0.5, 0.7, { type: 'triangle', vol: 0.25 }); break;
    case 'round-end': seq([784, 659, 523], 0.14, { type: 'triangle', vol: 0.25, dur: 0.3 }); tone(392, t0 + 0.42, 0.6, { vol: 0.2 }); break;
    case 'final-category': tone(196, t0, 0.9, { type: 'triangle', vol: 0.25 }); tone(294, t0 + 0.25, 0.9, { type: 'triangle', vol: 0.2 }); tone(392, t0 + 0.5, 1.1, { type: 'triangle', vol: 0.22 }); break;
    case 'final-clue': tone(880, t0, 0.25, { vol: 0.2 }); tone(1320, t0 + 0.2, 0.4, { vol: 0.18 }); break;
    case 'game-intro': [[440, 0], [554, 0.14], [659, 0.28], [880, 0.42]].forEach(([f, d], i) => tone(f, t0 + d, i === 3 ? 0.8 : 0.16, { type: 'triangle', vol: 0.22 })); break;
    case 'winner-fanfare': [[523, 0], [659, 0.15], [784, 0.3], [1047, 0.45], [880, 0.75], [1047, 0.9]].forEach(([f, d], i) => tone(f, t0 + d, i === 5 ? 1.3 : 0.22, { type: 'triangle', vol: 0.22 })); tone(523, t0 + 0.9, 1.3, { vol: 0.15 }); break;
    default: break;
  }
}

/* ---------- which events happened (from one game state to the next) ----------
   Called once per change. Undo (history got shorter) and loading a saved game play nothing. */
function soundEvents(prev, next) {
  if (!next) return [];
  if (!prev || prev.id !== next.id) return next.log.length === 0 && next.phase === 'board' && !next.current ? ['game-intro'] : [];
  if ((next.history || []).length < (prev.history || []).length) return [];
  const out = [];
  const pc = prev.current, nc = next.current;
  if (nc && (!pc || pc.cell !== nc.cell)) out.push(nc.wager ? 'risk-it' : 'clue-open');
  if (nc && pc && pc.cell === nc.cell) {
    if (nc.changes.length > pc.changes.length) out.push(nc.changes[nc.changes.length - 1].delta > 0 ? 'correct' : 'wrong');
    else if (nc.tried.length > pc.tried.length) out.push('wrong'); // wrong with no minus points
  }
  if (next.phase === 'between' && prev.phase !== 'between') out.push('round-end');
  if (next.phase === 'final' && prev.phase !== 'final') out.push('final-category');
  if (next.phase === 'final' && next.final && prev.final) {
    if (next.final.stage === 'clue' && prev.final.stage !== 'clue') out.push('final-clue');
    const pj = Object.keys(prev.final.judged || {}).length;
    const nj = Object.keys(next.final.judged || {});
    if (nj.length > pj) { const last = next.final.judged[next.final.order.find((id) => next.final.judged[id] && !(prev.final.judged || {})[id])]; if (last) out.push(last.right ? 'correct' : 'wrong'); }
  }
  if (next.phase === 'done' && prev.phase !== 'done') out.push('winner-fanfare');
  return out;
}

/* ---------- clock ticks in the last 5 seconds (on the device that plays sound) ---------- */
function tickKey(g, now) {
  if (!g) return null;
  const cur = g.phase === 'final' ? g.final : g.phase === 'clue' ? g.current : null;
  if (!cur || cur.endsAt == null || cur.pausedLeft != null) return null;
  if (g.phase === 'final' && cur.stage !== 'clue') return null;
  if (g.phase === 'clue' && cur.stage !== 'answer') return null;
  const left = cur.endsAt - now;
  const sec = Math.ceil(left / ms(1000));
  if (left <= 0 || sec > 5 || sec < 1) return null;
  return (g.phase === 'final' ? 'final' : cur.cell + ':' + cur.team) + ':' + cur.endsAt + ':' + sec;
}
function useTicks(g, enabled, play) {
  const last = useRef(null); const latest = useRef(g); latest.current = g;
  useEffect(() => {
    if (!enabled) return undefined;
    const id = setInterval(() => {
      const k = tickKey(latest.current, Date.now());
      if (k && k !== last.current) { last.current = k; play('countdown-tick', 'tick:' + k); }
    }, ms(100));
    return () => clearInterval(id);
  }, [enabled]);
}
