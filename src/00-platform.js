/* ============================================================
   PLATFORM: helpers, storage, files, backup, install/update.
   Adapted from Khatfa's 00-platform.js (same storage design as Draft Night).
   ============================================================ */
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const shuffleWith = (arr, rand) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const buzz = (p) => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} };
function onColor(hex) {
  const h = (hex || '#888888').replace('#', ''); const r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255;
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b; return L > 0.55 ? '#1a1300' : '#ffffff';
}
const tStyle = (team) => (team ? { '--c': team.color, '--on': onColor(team.color) } : undefined);

// Team colours. Lime (the game's own accent) is left out so a team never looks like a Risk It square.
const COLORS = ['#ff4f64', '#3d8bff', '#ffc83d', '#a46bff', '#ff8a3a', '#ff5cbc', '#22cfd6', '#2fd17c'];
const EMOJIS = ['🦅', '🐆', '🐺', '🦁', '🐪', '🔥', '⚡', '👑', '🚀', '💎', '🦈', '🐉', '🎯', '🧠', '🌙', '⭐'];

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// Game pacing. Tests set window.__JB_TEST_SPEED to run timers faster; players always get 1.
const GAME_SPEED = (typeof window !== 'undefined' && window.__JB_TEST_SPEED) || 1;
const ms = (n) => Math.max(1, Math.round(n * GAME_SPEED));
const reducedMotion = () => {
  const m = document.documentElement.getAttribute('data-motion');
  if (m === 'reduce') return true; if (m === 'full') return false;
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
};

/* ============================================================
   STORAGE
   An in-memory copy the UI reads synchronously. Writes go to IndexedDB,
   falling back to localStorage, then memory only. The game never waits.
   ============================================================ */
const K = { settings: 'jb_settings_v1', current: 'jb_current_v1', past: 'jb_past_v1', history: 'jb_history_v1', issues: 'jb_issues_v1', packs: 'jb_packs_v1' };
const STORE_KEYS = Object.values(K);

const store = (() => {
  const mem = {};
  let backend = 'memory';
  let db = null;
  let onError = null;
  const pending = new Map();
  let timer = null;

  const lsGet = (k) => { try { const v = localStorage.getItem(k); return v == null ? undefined : JSON.parse(v); } catch (e) { return undefined; } };
  function openIDB() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('IndexedDB unavailable'));
      let req;
      try { req = indexedDB.open('jeopardy-board', 1); } catch (e) { return reject(e); }
      req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains('kv')) req.result.createObjectStore('kv'); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('IndexedDB blocked'));
      setTimeout(() => reject(new Error('IndexedDB timed out')), 5000);
    });
  }
  const idbReq = (mode, fn) => new Promise((resolve, reject) => {
    const tx = db.transaction('kv', mode); const st = tx.objectStore('kv'); const r = fn(st);
    tx.oncomplete = () => resolve(r && r.result); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error || new Error('aborted'));
  });
  function idbAll() {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('kv', 'readonly'); const st = tx.objectStore('kv');
      const kr = st.getAllKeys(); const vr = st.getAll();
      tx.oncomplete = () => { const out = {}; (kr.result || []).forEach((k, i) => { out[k] = vr.result[i]; }); resolve(out); };
      tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error || new Error('aborted'));
    });
  }
  function report(err) {
    const quota = err && (err.name === 'QuotaExceededError' || /quota/i.test(String(err.message || err)));
    if (onError) onError(quota ? 'storeFull' : 'storeFail');
  }
  async function flush() {
    timer = null;
    const batch = [...pending.entries()]; pending.clear();
    if (!batch.length || backend === 'memory') return;
    try {
      if (backend === 'indexeddb') {
        await idbReq('readwrite', (st) => { batch.forEach(([k, v]) => (v === undefined ? st.delete(k) : st.put(v, k))); return null; });
      } else {
        batch.forEach(([k, v]) => (v === undefined ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v))));
      }
    } catch (e) { report(e); }
  }
  const schedule = () => { if (!timer) timer = setTimeout(flush, 120); };

  return {
    async init() {
      try {
        db = await openIDB();
        Object.assign(mem, await idbAll());
        backend = 'indexeddb';
        if (!STORE_KEYS.some((k) => mem[k] !== undefined)) {
          STORE_KEYS.forEach((k) => { const v = lsGet(k); if (v !== undefined) { mem[k] = v; pending.set(k, v); } });
          await flush();
        }
      } catch (e) {
        db = null;
        try {
          localStorage.setItem('jb__probe', '1'); localStorage.removeItem('jb__probe');
          STORE_KEYS.forEach((k) => { const v = lsGet(k); if (v !== undefined) mem[k] = v; });
          backend = 'localStorage';
        } catch (e2) { backend = 'memory'; }
      }
      try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
      window.addEventListener('pagehide', () => flush());
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
    },
    get(k, fallback) { const v = mem[k]; return v === undefined || v === null ? fallback : v; },
    set(k, v) { mem[k] = v; pending.set(k, v); schedule(); return true; },
    del(k) { delete mem[k]; pending.set(k, undefined); schedule(); return true; },
    flush,
    get backend() { return backend; },
    set onError(fn) { onError = fn; },
  };
})();

/* ============================================================
   FILE STORE: your own sound recordings (Settings → Sound) and the pictures and
   sounds in your clue packs (My clues), kept in
   their own IndexedDB database and referenced as "idb:<id>".
   (Same design as Khatfa's media store.)
   ============================================================ */
const fileStore = (() => {
  let dbp = null; const mem = new Map();
  const open = () => {
    if (dbp) return dbp;
    dbp = new Promise((resolve) => {
      try {
        if (!('indexedDB' in window)) return resolve(null);
        const req = indexedDB.open('jeopardy-board-files', 1);
        req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains('files')) req.result.createObjectStore('files'); };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
        setTimeout(() => resolve(null), 5000);
      } catch (e) { resolve(null); }
    });
    return dbp;
  };
  const tx = (mode, fn) => open().then((db) => new Promise((resolve, reject) => {
    if (!db) return resolve(undefined);
    const t = db.transaction('files', mode); const st = t.objectStore('files'); const r = fn(st);
    t.oncomplete = () => resolve(r && r.result); t.onerror = () => reject(t.error); t.onabort = () => reject(t.error || new Error('aborted'));
  }));
  return {
    async put(rec) {
      const id = 'f' + uid();
      try { const db = await open(); if (db) { await tx('readwrite', (st) => st.put(rec, id)); return id; } } catch (e) { if (e && /quota/i.test(e.name + e.message)) throw new Error('quota'); throw e; }
      mem.set(id, rec); return id; // no IndexedDB: kept until the page closes
    },
    async get(id) { if (mem.has(id)) return mem.get(id); try { return await tx('readonly', (st) => st.get(id)); } catch (e) { return undefined; } },
    async del(id) { mem.delete(id); try { await tx('readwrite', (st) => st.delete(id)); } catch (e) {} },
    async keys() { try { return (await tx('readonly', (st) => st.getAllKeys())) || [...mem.keys()]; } catch (e) { return [...mem.keys()]; } },
  };
})();
const isLocalFile = (src) => typeof src === 'string' && src.startsWith('idb:');
// Deletes stored files that nothing uses any more. It always looks at the SAVED sound settings
// and EVERY pack, so cleaning up after one pack can never delete another pack's files.
async function cleanFiles(soundFiles, packs) {
  const snd = soundFiles || ((store.get(K.settings, {}) || {}).sound || {}).files || {};
  const used = new Set(Object.values(snd).filter(isLocalFile).map((s) => s.slice(4)));
  packFileIds(packs || store.get(K.packs, [])).forEach((id) => used.add(id));
  const keys = await fileStore.keys();
  await Promise.all((keys || []).filter((k) => !used.has(k)).map((k) => fileStore.del(k)));
}
// How long an audio file is (rejects things that aren't audio).
function checkAudio(blob) {
  return new Promise((resolve, reject) => {
    if (!/^audio\//.test(blob.type) && !/\.(mp3|m4a|aac|wav|ogg|oga|opus|webm)$/i.test(blob.name || '')) return reject(new Error('sndNotAudio'));
    const url = URL.createObjectURL(blob); const a = new Audio(); let done = false;
    const end = (fn, v) => { if (done) return; done = true; URL.revokeObjectURL(url); fn(v); };
    a.preload = 'metadata';
    a.onloadedmetadata = () => end(resolve, a.duration);
    a.onerror = () => end(reject, new Error('sndUnsupported'));
    setTimeout(() => end(reject, new Error('sndUnsupported')), 8000);
    a.src = url;
  });
}

/* ============================================================
   FILES
   ============================================================ */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
const todayStamp = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

/* ============================================================
   BACKUP FORMAT (versioned, same shape as Khatfa's)
   ============================================================ */
const BACKUP_APP = 'jeopardy-board';
const BACKUP_FORMAT = 1;
function makeBackup(state) {
  return { app: BACKUP_APP, format: BACKUP_FORMAT, exportedAt: new Date().toISOString(),
    data: { settings: state.settings || {}, current: state.game || null, past: state.past || [], history: state.history || null, issues: state.issues || [], packs: state.packs || [] } };
}
// Returns { ok, error (string key), data, summary }
function validateBackup(obj) {
  if (!obj || typeof obj !== 'object' || obj.app !== BACKUP_APP) return { ok: false, error: 'bkNotOurs' };
  if (typeof obj.format !== 'number' || obj.format > BACKUP_FORMAT) return { ok: false, error: 'bkNewer' };
  const d = obj.data || {};
  if (!Array.isArray(d.past)) return { ok: false, error: 'bkDamaged' };
  const games = [...d.past, ...(d.current ? [d.current] : [])];
  if (games.some((g) => !g || !Array.isArray(g.teams) || !g.rules || !Array.isArray(g.log))) return { ok: false, error: 'bkDamaged' };
  if (d.history != null && (typeof d.history !== 'object' || typeof d.history.seen !== 'object')) return { ok: false, error: 'bkDamaged' };
  if (d.issues != null && !Array.isArray(d.issues)) return { ok: false, error: 'bkDamaged' };
  if (d.packs != null && (!Array.isArray(d.packs) || d.packs.some((p) => !p || typeof p.id !== 'string' || !Array.isArray(p.clues) || !Array.isArray(p.categories)))) return { ok: false, error: 'bkDamaged' };
  return { ok: true, data: d, summary: { past: d.past.length, current: !!d.current, packs: (d.packs || []).length, exportedAt: obj.exportedAt } };
}

/* ============================================================
   APP INSTALL + UPDATES (service worker) — same as Khatfa
   ============================================================ */
const pwa = (() => {
  let deferred = null; let waiting = null; const subs = new Set();
  const emit = () => subs.forEach((fn) => fn());
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; emit(); });
  window.addEventListener('appinstalled', () => { deferred = null; emit(); });
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').then((reg) => {
        const watch = (w) => { if (!w) return; w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) { waiting = w; emit(); } }); };
        if (reg.waiting && navigator.serviceWorker.controller) { waiting = reg.waiting; emit(); }
        reg.addEventListener('updatefound', () => watch(reg.installing));
        setInterval(() => reg.update().catch(() => {}), 30 * 60e3);
      }).catch(() => {});
      let reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded) { reloaded = true; location.reload(); } });
    });
  }
  return {
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    get canPrompt() { return !!deferred; },
    async prompt() { if (!deferred) return; deferred.prompt(); try { await deferred.userChoice; } catch (e) {} deferred = null; emit(); },
    get updateReady() { return !!waiting; },
    applyUpdate() { store.flush(); if (waiting) waiting.postMessage('skipWaiting'); else location.reload(); },
  };
})();
function usePwa() { const [, f] = useState(0); useEffect(() => pwa.subscribe(() => f((x) => x + 1)), []); return pwa; }
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
