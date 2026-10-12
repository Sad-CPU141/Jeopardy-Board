/* Jeopardy-Board c09764e99b — built from src/ by build.js. Edit src/, not this file. */
"use strict";
(function(){
const APP_VERSION = "c09764e99b";
const SOUND_FILES = {};
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const shuffle = arr => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const shuffleWith = (arr, rand) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const buzz = p => {
  try {
    if (navigator.vibrate) navigator.vibrate(p);
  } catch (e) {}
};
function onColor(hex) {
  const h = (hex || '#888888').replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) / 255,
    g = parseInt(h.slice(2, 4), 16) / 255,
    b = parseInt(h.slice(4, 6), 16) / 255;
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return L > 0.55 ? '#1a1300' : '#ffffff';
}
const tStyle = team => team ? {
  '--c': team.color,
  '--on': onColor(team.color)
} : undefined;
const COLORS = ['#ff4f64', '#3d8bff', '#ffc83d', '#a46bff', '#ff8a3a', '#ff5cbc', '#22cfd6', '#2fd17c'];
const EMOJIS = ['🦅', '🐆', '🐺', '🦁', '🐪', '🔥', '⚡', '👑', '🚀', '💎', '🦈', '🐉', '🎯', '🧠', '🌙', '⭐'];
const {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback
} = React;
const GAME_SPEED = typeof window !== 'undefined' && window.__JB_TEST_SPEED || 1;
const ms = n => Math.max(1, Math.round(n * GAME_SPEED));
const reducedMotion = () => {
  const m = document.documentElement.getAttribute('data-motion');
  if (m === 'reduce') return true;
  if (m === 'full') return false;
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
};
const K = {
  settings: 'jb_settings_v1',
  current: 'jb_current_v1',
  past: 'jb_past_v1',
  history: 'jb_history_v1',
  issues: 'jb_issues_v1'
};
const STORE_KEYS = Object.values(K);
const store = (() => {
  const mem = {};
  let backend = 'memory';
  let db = null;
  let onError = null;
  const pending = new Map();
  let timer = null;
  const lsGet = k => {
    try {
      const v = localStorage.getItem(k);
      return v == null ? undefined : JSON.parse(v);
    } catch (e) {
      return undefined;
    }
  };
  function openIDB() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('IndexedDB unavailable'));
      let req;
      try {
        req = indexedDB.open('jeopardy-board', 1);
      } catch (e) {
        return reject(e);
      }
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains('kv')) req.result.createObjectStore('kv');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('IndexedDB blocked'));
      setTimeout(() => reject(new Error('IndexedDB timed out')), 5000);
    });
  }
  const idbReq = (mode, fn) => new Promise((resolve, reject) => {
    const tx = db.transaction('kv', mode);
    const st = tx.objectStore('kv');
    const r = fn(st);
    tx.oncomplete = () => resolve(r && r.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('aborted'));
  });
  function idbAll() {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('kv', 'readonly');
      const st = tx.objectStore('kv');
      const kr = st.getAllKeys();
      const vr = st.getAll();
      tx.oncomplete = () => {
        const out = {};
        (kr.result || []).forEach((k, i) => {
          out[k] = vr.result[i];
        });
        resolve(out);
      };
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('aborted'));
    });
  }
  function report(err) {
    const quota = err && (err.name === 'QuotaExceededError' || /quota/i.test(String(err.message || err)));
    if (onError) onError(quota ? 'storeFull' : 'storeFail');
  }
  async function flush() {
    timer = null;
    const batch = [...pending.entries()];
    pending.clear();
    if (!batch.length || backend === 'memory') return;
    try {
      if (backend === 'indexeddb') {
        await idbReq('readwrite', st => {
          batch.forEach(([k, v]) => v === undefined ? st.delete(k) : st.put(v, k));
          return null;
        });
      } else {
        batch.forEach(([k, v]) => v === undefined ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)));
      }
    } catch (e) {
      report(e);
    }
  }
  const schedule = () => {
    if (!timer) timer = setTimeout(flush, 120);
  };
  return {
    async init() {
      try {
        db = await openIDB();
        Object.assign(mem, await idbAll());
        backend = 'indexeddb';
        if (!STORE_KEYS.some(k => mem[k] !== undefined)) {
          STORE_KEYS.forEach(k => {
            const v = lsGet(k);
            if (v !== undefined) {
              mem[k] = v;
              pending.set(k, v);
            }
          });
          await flush();
        }
      } catch (e) {
        db = null;
        try {
          localStorage.setItem('jb__probe', '1');
          localStorage.removeItem('jb__probe');
          STORE_KEYS.forEach(k => {
            const v = lsGet(k);
            if (v !== undefined) mem[k] = v;
          });
          backend = 'localStorage';
        } catch (e2) {
          backend = 'memory';
        }
      }
      try {
        if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
      } catch (e) {}
      window.addEventListener('pagehide', () => flush());
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') flush();
      });
    },
    get(k, fallback) {
      const v = mem[k];
      return v === undefined || v === null ? fallback : v;
    },
    set(k, v) {
      mem[k] = v;
      pending.set(k, v);
      schedule();
      return true;
    },
    del(k) {
      delete mem[k];
      pending.set(k, undefined);
      schedule();
      return true;
    },
    flush,
    get backend() {
      return backend;
    },
    set onError(fn) {
      onError = fn;
    }
  };
})();
const fileStore = (() => {
  let dbp = null;
  const mem = new Map();
  const open = () => {
    if (dbp) return dbp;
    dbp = new Promise(resolve => {
      try {
        if (!('indexedDB' in window)) return resolve(null);
        const req = indexedDB.open('jeopardy-board-files', 1);
        req.onupgradeneeded = () => {
          if (!req.result.objectStoreNames.contains('files')) req.result.createObjectStore('files');
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
        setTimeout(() => resolve(null), 5000);
      } catch (e) {
        resolve(null);
      }
    });
    return dbp;
  };
  const tx = (mode, fn) => open().then(db => new Promise((resolve, reject) => {
    if (!db) return resolve(undefined);
    const t = db.transaction('files', mode);
    const st = t.objectStore('files');
    const r = fn(st);
    t.oncomplete = () => resolve(r && r.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('aborted'));
  }));
  return {
    async put(rec) {
      const id = 'f' + uid();
      try {
        const db = await open();
        if (db) {
          await tx('readwrite', st => st.put(rec, id));
          return id;
        }
      } catch (e) {
        if (e && /quota/i.test(e.name + e.message)) throw new Error('quota');
        throw e;
      }
      mem.set(id, rec);
      return id;
    },
    async get(id) {
      if (mem.has(id)) return mem.get(id);
      try {
        return await tx('readonly', st => st.get(id));
      } catch (e) {
        return undefined;
      }
    },
    async del(id) {
      mem.delete(id);
      try {
        await tx('readwrite', st => st.delete(id));
      } catch (e) {}
    },
    async keys() {
      try {
        return (await tx('readonly', st => st.getAllKeys())) || [...mem.keys()];
      } catch (e) {
        return [...mem.keys()];
      }
    }
  };
})();
const isLocalFile = src => typeof src === 'string' && src.startsWith('idb:');
async function cleanFiles(soundFiles) {
  const used = new Set(Object.values(soundFiles || {}).filter(isLocalFile).map(s => s.slice(4)));
  const keys = await fileStore.keys();
  await Promise.all((keys || []).filter(k => !used.has(k)).map(k => fileStore.del(k)));
}
function checkAudio(blob) {
  return new Promise((resolve, reject) => {
    if (!/^audio\//.test(blob.type) && !/\.(mp3|m4a|aac|wav|ogg|oga|opus|webm)$/i.test(blob.name || '')) return reject(new Error('sndNotAudio'));
    const url = URL.createObjectURL(blob);
    const a = new Audio();
    let done = false;
    const end = (fn, v) => {
      if (done) return;
      done = true;
      URL.revokeObjectURL(url);
      fn(v);
    };
    a.preload = 'metadata';
    a.onloadedmetadata = () => end(resolve, a.duration);
    a.onerror = () => end(reject, new Error('sndUnsupported'));
    setTimeout(() => end(reject, new Error('sndUnsupported')), 8000);
    a.src = url;
  });
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
const todayStamp = () => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};
const BACKUP_APP = 'jeopardy-board';
const BACKUP_FORMAT = 1;
function makeBackup(state) {
  return {
    app: BACKUP_APP,
    format: BACKUP_FORMAT,
    exportedAt: new Date().toISOString(),
    data: {
      settings: state.settings || {},
      current: state.game || null,
      past: state.past || [],
      history: state.history || null,
      issues: state.issues || []
    }
  };
}
function validateBackup(obj) {
  if (!obj || typeof obj !== 'object' || obj.app !== BACKUP_APP) return {
    ok: false,
    error: 'bkNotOurs'
  };
  if (typeof obj.format !== 'number' || obj.format > BACKUP_FORMAT) return {
    ok: false,
    error: 'bkNewer'
  };
  const d = obj.data || {};
  if (!Array.isArray(d.past)) return {
    ok: false,
    error: 'bkDamaged'
  };
  const games = [...d.past, ...(d.current ? [d.current] : [])];
  if (games.some(g => !g || !Array.isArray(g.teams) || !g.rules || !Array.isArray(g.log))) return {
    ok: false,
    error: 'bkDamaged'
  };
  if (d.history != null && (typeof d.history !== 'object' || typeof d.history.seen !== 'object')) return {
    ok: false,
    error: 'bkDamaged'
  };
  if (d.issues != null && !Array.isArray(d.issues)) return {
    ok: false,
    error: 'bkDamaged'
  };
  return {
    ok: true,
    data: d,
    summary: {
      past: d.past.length,
      current: !!d.current,
      exportedAt: obj.exportedAt
    }
  };
}
const pwa = (() => {
  let deferred = null;
  let waiting = null;
  const subs = new Set();
  const emit = () => subs.forEach(fn => fn());
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferred = e;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    emit();
  });
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').then(reg => {
        const watch = w => {
          if (!w) return;
          w.addEventListener('statechange', () => {
            if (w.state === 'installed' && navigator.serviceWorker.controller) {
              waiting = w;
              emit();
            }
          });
        };
        if (reg.waiting && navigator.serviceWorker.controller) {
          waiting = reg.waiting;
          emit();
        }
        reg.addEventListener('updatefound', () => watch(reg.installing));
        setInterval(() => reg.update().catch(() => {}), 30 * 60e3);
      }).catch(() => {});
      let reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!reloaded) {
          reloaded = true;
          location.reload();
        }
      });
    });
  }
  return {
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    get canPrompt() {
      return !!deferred;
    },
    async prompt() {
      if (!deferred) return;
      deferred.prompt();
      try {
        await deferred.userChoice;
      } catch (e) {}
      deferred = null;
      emit();
    },
    get updateReady() {
      return !!waiting;
    },
    applyUpdate() {
      store.flush();
      if (waiting) waiting.postMessage('skipWaiting');else location.reload();
    }
  };
})();
function usePwa() {
  const [, f] = useState(0);
  useEffect(() => pwa.subscribe(() => f(x => x + 1)), []);
  return pwa;
}
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
const APP_NAME = {
  en: 'Jeopardy-Board',
  ar: null
};
const S = {
  appName: ['Jeopardy-Board', 'Jeopardy-Board'],
  tagline: ['Pick a clue, buzz in first, and bet it all in the final round.', 'اختار تلميح، اسبق الكل بالجواب، وراهن بكل شي في الجولة الأخيرة.'],
  gameNight: ['Game night', 'ليلة ألعاب'],
  newGame: ['New game', 'لعبة جديدة'],
  continueGame: ['Continue game', 'كمّل اللعبة'],
  resumeRound: ['round {n} · {left} clues left', 'الجولة {n} · باقي {left} تلميح'],
  resumeFinal: ['final wager', 'الرهان الأخير'],
  howToPlay: ['How to play', 'طريقة اللعب'],
  settings: ['Settings', 'الإعدادات'],
  back: ['Back', 'رجوع'],
  close: ['Close', 'إغلاق'],
  cancel: ['Cancel', 'إلغاء'],
  confirm: ['Confirm', 'تأكيد'],
  done: ['Done', 'تم'],
  dismiss: ['OK', 'تمام'],
  menu: ['Menu', 'القائمة'],
  home: ['Home', 'الرئيسية'],
  reload: ['Reload', 'إعادة التحميل'],
  install: ['Install on this device', 'ثبّتها على جهازك'],
  updateReady: ['A new version is ready.', 'فيه نسخة جديدة جاهزة.'],
  langSwitch: ['العربية', 'English'],
  langSwitchLabel: ['Switch to Arabic', 'التبديل إلى الإنجليزية'],
  pastGames: ['Recent games', 'آخر الألعاب'],
  won: ['won', 'فاز'],
  draw: ['Draw', 'تعادل'],
  bankNote: ['{q} clues in {c} categories.', '{q} تلميح في {c} فئة.'],
  crashed: ['Something went wrong', 'صار خطأ'],
  crashedSub: ['Your game is saved. Reload to carry on.', 'لعبتك محفوظة. أعد التحميل وكمّل.'],
  seconds: ['{n}s', '{n} ث'],
  setupTitle: ['New game', 'لعبة جديدة'],
  teams: ['Teams', 'الفرق'],
  teamN: ['Team {n}', 'الفريق {n}'],
  defaultTeam1: ['Falcons', 'الصقور'],
  defaultTeam2: ['Leopards', 'النمور'],
  addTeam: ['Add a team (up to 4)', 'أضف فريق (حتى ٤)'],
  removeTeam: ['Remove team {n}', 'احذف الفريق {n}'],
  changeEmoji: ['Change emoji', 'غيّر الرمز'],
  colour: ['Colour', 'اللون'],
  categories: ['Categories', 'الفئات'],
  catsOn: ['{n} of {of} categories on', '{n} من {of} فئة مفعّلة'],
  catsPerGame: ['{n} per game', '{n} في كل لعبة'],
  chooseCats: ['Choose categories', 'اختر الفئات'],
  chooseCatsSub: ['Switched-on categories can come up. A game uses {n}.', 'الفئات المفعّلة ممكن تطلع. اللعبة تستخدم {n}.'],
  catsRandom: ['Each board gets 6 categories at random from the ones switched on, mixing topics and avoiding recent ones.', 'كل لوحة تاخذ ٦ فئات عشوائية من المفعّلة، متنوعة وبعيدة عن اللي لعبتوها قريب.'],
  cluesN: ['{n} clues', '{n} تلميح'],
  allOn: ['All on', 'الكل'],
  allOff: ['All off', 'ولا شي'],
  gameRules: ['Game rules', 'قوانين اللعبة'],
  rulesSummary: ['{r} round(s) · {f} · {v}', '{r} جولة · {f} · {v}'],
  withFinal: ['final wager', 'رهان أخير'],
  noFinal: ['no final', 'بدون رهان أخير'],
  rounds: ['Rounds', 'الجولات'],
  oneRound: ['1 round', 'جولة وحدة'],
  twoRounds: ['2 rounds', 'جولتين'],
  values: ['Points per row (round 1)', 'النقاط لكل صف (الجولة ١)'],
  valuesSub: ['Round 2 doubles them: {r2}.', 'الجولة ٢ تضاعفها: {r2}.'],
  rowN: ['Row {n} points', 'نقاط الصف {n}'],
  finalRound: ['Final wager round', 'جولة الرهان الأخير'],
  finalRoundSub: ['One last clue. Every team secretly bets on it.', 'تلميح أخير، وكل فريق يراهن عليه بالسر.'],
  finalTime: ['Time to write the final response', 'وقت كتابة الجواب الأخير'],
  questionForm: ['Responses must be a question', 'الجواب لازم يكون بصيغة سؤال'],
  questionFormSub: ['Teams answer “What is…?” / “Who is…?”. You judge.', 'الفرق تجاوب «ما هو…؟» / «من هو…؟». أنت الحكم.'],
  modifiers: ['Optional modifiers', 'إضافات اختيارية'],
  modifiersOff: ['All off', 'كلها مطفأة'],
  noMinus: ['No minus points', 'بدون خصم نقاط'],
  noMinusSub: ['A wrong answer on a normal clue costs nothing. (Risk It and the final still count.)', 'الجواب الغلط في التلميح العادي ما يخصم شي. (خاطِر والرهان الأخير ما يتغيرون.)'],
  answerClock: ['Answer clock', 'ساعة الجواب'],
  answerClockSub: ['A countdown starts when a team buzzes in.', 'عدّاد يبدأ لما فريق يضغط.'],
  answerTime: ['Time to answer', 'وقت الجواب'],
  strictRepeats: ['Strict no-repeats', 'منع التكرار الصارم'],
  strictRepeatsSub: ['Never reuse a clue seen in the last 50 games on this device, until a category runs out.', 'لا تعيد أي تلميح ظهر في آخر ٥٠ لعبة على هذا الجهاز، إلا إذا خلصت الفئة.'],
  needNames: ['Every team needs a name.', 'كل فريق يحتاج اسم.'],
  needAscending: ['Points must go up from row 1 to row 5.', 'النقاط لازم تزيد من الصف ١ إلى الصف ٥.'],
  needCats: ['Switch on more categories: {have} can fill a board, the game needs {need}.', 'فعّل فئات أكثر: {have} فئة تكفي، واللعبة تحتاج {need}.'],
  startGame: ['Start the game', 'ابدأ اللعبة'],
  roundN: ['Round {n}', 'الجولة {n}'],
  roundLeft: ['Round {n} · {left} left', 'الجولة {n} · باقي {left}'],
  picksNext: ['{team} picks a clue', '{team} يختار تلميح'],
  picksShort: ['Picks', 'يختار'],
  boardHint: ['Tap the tile the picking team calls out.', 'اضغط الخانة اللي يختارها الفريق.'],
  reportShort: ['{n} tiles are empty: not enough clues left in those categories.', '{n} خانة فاضية: ما بقى تلميحات كافية في فئاتها.'],
  tileEmpty: ['no clue left', 'ما بقى تلميح'],
  tileInvalid: ['removed as wrong', 'انحذف لأنه غلط'],
  buzzNow: ['Read the clue. Who buzzed first?', 'اقرأ التلميح. مين ضغط أول؟'],
  othersBuzz: ['The other teams can buzz now.', 'الفرق الثانية تقدر تضغط الحين.'],
  whoBuzzed: ['Who buzzed first?', 'مين ضغط أول؟'],
  nobody: ['Nobody — show the response', 'ولا أحد — اعرض الجواب'],
  nobodyElse: ['Nobody else — show the response', 'ولا أحد ثاني — اعرض الجواب'],
  answering: ['{team} is answering', '{team} يجاوب'],
  right: ['Right', 'صح'],
  wrong: ['Wrong', 'غلط'],
  wrongTeamTapped: ['Wrong team? Undo the buzz', 'اخترت فريق غلط؟ تراجع'],
  response: ['Response', 'الجواب'],
  alsoAccept: ['Also accept:', 'يُقبل أيضاً:'],
  asOf: ['True as of {d}', 'صحيح حتى {d}'],
  needsCheck: ['⏳ Time-sensitive (as of {d}): check before trusting it', '⏳ معلومة قابلة للتغير (حتى {d}): تأكد منها'],
  showResponse: ['Show the response (host)', 'اعرض الجواب (للمقدم)'],
  hideResponse: ['Hide the response', 'اخفِ الجواب'],
  qFormReminder: ['Answer in the form of a question', 'الجواب بصيغة سؤال'],
  qFormJudge: ['Only accept it if it was phrased as a question.', 'اقبله فقط إذا كان بصيغة سؤال.'],
  flashRight: ['Right!', 'صح!'],
  flashWrong: ['Wrong', 'غلط'],
  flashNone: ['Nobody', 'ولا أحد'],
  flashInvalid: ['Clue removed', 'انحذف التلميح'],
  nobodyGotIt: ['Nobody got it', 'محد جاوبها'],
  skipped: ['Skipped', 'تخطّي'],
  pointsTo: ['+{n} to {team}', '+{n} لـ {team}'],
  lostPoints: ['−{n} for {team}', '−{n} على {team}'],
  backToBoard: ['Back to the board', 'رجوع للوحة'],
  endOfRound: ['End of the round', 'نهاية الجولة'],
  timeUp: ['Time!', 'انتهى الوقت!'],
  riskIt: ['Risk It!', 'خاطِر!'],
  riskItSub: ['A hidden wager square', 'خانة رهان مخفية'],
  riskWagering: ['{team} found a Risk It square', '{team} لقى خانة «خاطِر»'],
  riskWagerQ: ['How much does {team} risk?', 'كم يخاطر {team}؟'],
  riskWagerRule: ['Score {score}. Bet anything from 0 up to {max} (your score, or the round’s top value if that’s more).', 'النقاط {score}. راهن من ٠ إلى {max} (نقاطك، أو أعلى قيمة في الجولة إذا كانت أكثر).'],
  riskHidden: ['Only this team plays it. The clue appears once the wager is locked.', 'هذا الفريق بس يلعبها. التلميح يظهر بعد تثبيت الرهان.'],
  wager: ['Wager', 'الرهان'],
  allIn: ['All in ({n})', 'الكل ({n})'],
  wagerRange: ['Enter a whole number from 0 to {max}.', 'اكتب رقم من ٠ إلى {max}.'],
  lockWager: ['Lock the wager', 'ثبّت الرهان'],
  bestRisk: ['Biggest Risk It won', 'أكبر «خاطِر» ناجحة'],
  roundOver: ['End of round {n}', 'نهاية الجولة {n}'],
  cutShort: ['ended early, {n} left', 'انتهت بدري، باقي {n}'],
  nextRound2: ['Round 2: double points', 'الجولة ٢: النقاط مضاعفة'],
  nextFinal: ['Next: the final wager', 'التالي: الرهان الأخير'],
  nextEnd: ['That’s the game', 'انتهت اللعبة'],
  round2Sub: ['New categories, every value doubled. {team} (lowest score) picks first.', 'فئات جديدة وكل القيم مضاعفة. {team} (أقل نقاط) يختار أول.'],
  finalSub: ['One category, one clue. Every team bets in secret.', 'فئة وحدة وتلميح واحد. كل فريق يراهن بالسر.'],
  startRound2: ['Start round 2', 'ابدأ الجولة ٢'],
  startFinal: ['Go to the final wager', 'روح للرهان الأخير'],
  seeResults: ['See the results', 'شوف النتائج'],
  finalWager: ['Final Wager', 'الرهان الأخير'],
  finalCatHint: ['Announce the category. Teams think about how much to bet.', 'أعلن الفئة. الفرق تفكر كم تراهن.'],
  startWagers: ['Collect the secret wagers', 'اجمع الرهانات السرية'],
  wagersHint: ['Pass the phone to each team in turn. Nobody else looks.', 'مرّر الجوال لكل فريق بالدور. محد غيرهم يشوف.'],
  maxWager: ['max {n}', 'حد أقصى {n}'],
  enterWager: ['Enter wager', 'سجّل الرهان'],
  locked: ['Locked', 'مثبّت'],
  redo: ['Redo', 'أعد'],
  redoQ: ['Redo {team}’s wager?', 'إعادة رهان {team}؟'],
  redoBody: ['Their wager is cleared and they enter it again.', 'ينمسح رهانهم ويسجلونه من جديد.'],
  passTo: ['Pass the phone to {team}', 'مرّر الجوال لـ {team}'],
  passToSub: ['Only {team} should look at the screen.', 'بس {team} يشوفون الشاشة.'],
  imTeam: ['We’re {team} — show', 'إحنا {team} — اعرض'],
  yourWager: ['Your secret wager', 'رهانكم السري'],
  finalWagerRule: ['Your score is {score}. Bet from 0 up to {max}.', 'نقاطكم {score}. راهنوا من ٠ إلى {max}.'],
  wagerLocked: ['Wager locked', 'تم تثبيت الرهان'],
  passBack: ['Pass the phone back to the host.', 'رجّع الجوال للمقدم.'],
  imHost: ['I’m the host — continue', 'أنا المقدم — كمّل'],
  showFinalClue: ['All in: show the final clue', 'الكل راهن: اعرض التلميح'],
  finalWriteHint: ['Teams write their response before time runs out.', 'الفرق تكتب جوابها قبل ما يخلص الوقت.'],
  startJudging: ['Time’s up: start judging', 'انتهى الوقت: ابدأ التحكيم'],
  judgeNext: ['{team}: what did they write?', '{team}: وش كتبوا؟'],
  judgingNow: ['Now', 'الحين'],
  wagerWas: ['bet {n}', 'راهن {n}'],
  finalTvCat: ['Think about your wager…', 'فكّروا في رهانكم…'],
  finalTvWagers: ['Wagers are being placed in secret', 'الرهانات تنكتب بالسر'],
  resultsTitle: ['Results', 'النتائج'],
  finalScores: ['Final scores', 'النتيجة النهائية'],
  winnerIs: ['The winner', 'الفائز'],
  sharedWin: ['Shared win', 'فوز مشترك'],
  itsADraw: ['It’s a draw!', 'تعادل!'],
  rightShort: ['right', 'صح'],
  wrongShort: ['wrong', 'غلط'],
  gameLog: ['Game log', 'سجل اللعبة'],
  logAdjust: ['Score fixed: {team} {d}', 'تعديل نقاط: {team} {d}'],
  logVoid: ['(reversed)', '(أُلغي)'],
  logInvalid: ['clue removed as wrong', 'انحذف التلميح لأنه غلط'],
  logInvalidRep: ['clue replaced as wrong', 'استُبدل التلميح لأنه غلط'],
  playAgain: ['Play again', 'العب مرة ثانية'],
  playAgainSub: ['Same teams and rules, new boards.', 'نفس الفرق والقوانين، لوحات جديدة.'],
  undo: ['Undo', 'تراجع'],
  undoWhat: ['Undo {what}', 'تراجع عن {what}'],
  nothingToUndo: ['Nothing to undo', 'ما فيه شي تتراجع عنه'],
  pause: ['Pause the clock', 'وقّف الساعة'],
  resume: ['Resume the clock', 'شغّل الساعة'],
  putBack: ['Put it back', 'رجّعه للوحة'],
  putBackSub: ['Opened by mistake: back on the board', 'انفتح بالغلط: يرجع للوحة'],
  skipClue: ['Skip this clue', 'تخطَّ هذا التلميح'],
  endRound: ['End this round now', 'أنهِ الجولة الحين'],
  endRoundQ: ['End the round?', 'إنهاء الجولة؟'],
  endRoundBody: ['The {n} clues left on this board are skipped.', 'الـ {n} تلميحات الباقية في اللوحة تنتخطّى.'],
  endGame: ['End the game', 'أنهِ اللعبة'],
  endGameQ: ['End the game now?', 'إنهاء اللعبة الحين؟'],
  endGameBody: ['Scores stay as they are and the winner is shown.', 'النقاط تبقى مثل ما هي ويظهر الفائز.'],
  quitHome: ['Home', 'الرئيسية'],
  quitHomeSub: ['The game is saved. Continue it from the home screen.', 'اللعبة محفوظة. كمّلها من الرئيسية.'],
  fixScores: ['Fix scores', 'تعديل النقاط'],
  fixScoresSub: ['For mistakes. Every change is in the game log and can be undone.', 'للأخطاء. كل تعديل ينحفظ في السجل وتقدر تتراجع عنه.'],
  fixStep: ['Step', 'الخطوة'],
  setScoreTo: ['Set to…', 'خلّه…'],
  setScoreFor: ['Set the score for {team}', 'حدد نقاط {team}'],
  setScore: ['Set', 'حدد'],
  undoLastFix: ['Undo the last fix', 'تراجع عن آخر تعديل'],
  fixWrongTip: ['A clue that was itself wrong? Use “This is wrong”: it reverses exactly what that clue did.', 'التلميح نفسه غلط؟ استخدم «هذا غلط»: يرجّع بالضبط اللي سواه التلميح.'],
  editScoreOf: ['Fix the score of {team}', 'عدّل نقاط {team}'],
  sndMute: ['Mute sounds', 'كتم الأصوات'],
  sndUnmute: ['Turn sounds on', 'شغّل الأصوات'],
  thisIsWrong: ['This is wrong', 'هذا غلط'],
  flagPlayed: ['Flag a played clue', 'بلّغ عن تلميح انلعب'],
  flagPlayedSub: ['Pick the clue that was wrong. Its points are reversed.', 'اختر التلميح الغلط. نقاطه ترجع.'],
  noPlayed: ['No clues played yet.', 'ما انلعب أي تلميح.'],
  wrongTitle: ['This clue is wrong', 'هذا التلميح غلط'],
  whyWrong: ['What’s wrong?', 'وش الغلط؟'],
  reason_answer: ['Wrong response', 'الجواب غلط'],
  reason_unclear: ['Unclear / two answers', 'غير واضح / له جوابين'],
  reason_duplicate: ['Already had it', 'تكرر'],
  reason_other: ['Something else', 'شي ثاني'],
  wrongNote: ['A note (optional)', 'ملاحظة (اختياري)'],
  willRefund: ['These changes will be reversed:', 'هذي التغييرات بترجع:'],
  refundLine: ['{team} {d}', '{team} {d}'],
  noRefund: ['No points changed hands on this clue.', 'ما تغيرت نقاط في هذا التلميح.'],
  repSame: ['Replace it with another {cat} clue', 'استبدله بتلميح ثاني من {cat}'],
  repOther: ['Replace it with a clue from {cat}', 'استبدله بتلميح من {cat}'],
  repNow: ['The new clue opens straight away.', 'التلميح الجديد ينفتح على طول.'],
  repBoard: ['The tile goes back on the board.', 'الخانة ترجع للوحة.'],
  repEmpty: ['The tile is left empty.', 'الخانة تبقى فاضية.'],
  repNone: ['No replacement left in this row: the tile is left empty.', 'ما بقى بديل في هذا الصف: الخانة تبقى فاضية.'],
  repPlayedOnly: ['That board is finished, so the points are reversed and nothing replaces it.', 'اللوحة خلصت، فالنقاط ترجع وما فيه بديل.'],
  repFinalSame: ['A new final clue from the same category ({cat}). Wagers stay.', 'تلميح أخير جديد من نفس الفئة ({cat}). الرهانات تبقى.'],
  repFinalOther: ['A new final clue from {cat}. Wagers stay.', 'تلميح أخير جديد من {cat}. الرهانات تبقى.'],
  repFinalNone: ['No replacement final clue is left.', 'ما بقى تلميح أخير بديل.'],
  reverseIt: ['Reverse it', 'رجّع النقاط'],
  removeIt: ['Remove it', 'احذفه'],
  wrongDone: ['Clue removed.', 'انحذف التلميح.'],
  wrongDoneRefund: ['Clue removed and its points reversed.', 'انحذف التلميح ورجعت نقاطه.'],
  tvMode: ['TV mode', 'وضع التلفزيون'],
  tvIntro: ['Show the board big on a TV. Answers and wagers never appear there before they’re revealed.', 'اعرض اللوحة كبيرة على التلفزيون. الأجوبة والرهانات ما تظهر قبل وقتها.'],
  tvHere: ['Use this screen as the TV', 'استخدم هذي الشاشة كتلفزيون'],
  tvHereSub: ['For a laptop plugged into the TV, or casting this screen.', 'للابتوب موصول بالتلفزيون، أو إذا تبث هذي الشاشة.'],
  tvWindow: ['Open a TV window', 'افتح نافذة للتلفزيون'],
  tvWindowSub: ['A second window in this browser (drag it onto the TV). This one stays the remote.', 'نافذة ثانية في نفس المتصفح (اسحبها للتلفزيون). هذي تبقى الريموت.'],
  tvOtherDevice: ['A TV on another device needs online rooms, which aren’t built yet.', 'تلفزيون على جهاز ثاني يحتاج غرف أونلاين، وهذي مو جاهزة.'],
  tvNoChannel: ['This browser can’t link two windows. Use “this screen as the TV” instead.', 'هذا المتصفح ما يقدر يربط نافذتين. استخدم «هذي الشاشة كتلفزيون».'],
  tvBlocked: ['The window was blocked. Allow pop-ups for this site.', 'النافذة انحجبت. اسمح بالنوافذ المنبثقة.'],
  tvFull: ['Full screen', 'ملء الشاشة'],
  tvBackToControls: ['Back to controls', 'رجوع للتحكم'],
  tvWaiting: ['Waiting for the host…', 'ننتظر المقدم…'],
  tvAllowSound: ['Allow sound', 'اسمح بالصوت'],
  language: ['Language', 'اللغة'],
  qLang: ['Clue language', 'لغة التلميحات'],
  qLangAuto: ['Same as the game', 'نفس لغة اللعبة'],
  qLangBoth: ['Both languages', 'اللغتين'],
  qLangSub: ['“Both” shows the other language under each clue.', '«اللغتين» تعرض اللغة الثانية تحت كل تلميح.'],
  hostPeek: ['Show the response to the host', 'اعرض الجواب للمقدم'],
  hostPeekSub: ['Turn off if the host is playing too.', 'طفّها إذا المقدم يلعب معهم.'],
  motion: ['Animations', 'الحركة'],
  motionSystem: ['System', 'حسب الجهاز'],
  motionFull: ['On', 'تشغيل'],
  motionReduce: ['Less', 'أقل'],
  tvZoom: ['TV text size', 'حجم خط التلفزيون'],
  qbank: ['Clue bank', 'بنك التلميحات'],
  historySub: ['{n} clues seen on this device over {g} games. Seen clues come up less often.', '{n} تلميح ظهر على هذا الجهاز في {g} لعبة. اللي ظهرت تطلع أقل.'],
  resetHistory: ['Forget seen clues', 'انسَ التلميحات اللي ظهرت'],
  resetHistoryQ: ['Forget seen clues?', 'نسيان التلميحات؟'],
  resetHistoryBody: ['Every clue can come up again as if new.', 'كل التلميحات ممكن تطلع من جديد.'],
  issues: ['Reported clues', 'التلميحات المبلّغ عنها'],
  issuesSub: ['Clues flagged with “This is wrong” on this device.', 'التلميحات اللي انبلّغ عنها بـ«هذا غلط» على هذا الجهاز.'],
  issuesN: ['{n} reported', '{n} بلاغ'],
  issuesNone: ['Nothing reported.', 'ما فيه بلاغات.'],
  skipReported: ['Don’t use reported clues again', 'لا تستخدم التلميحات المبلّغ عنها'],
  exportIssues: ['Export the list', 'صدّر القائمة'],
  clearIssues: ['Clear the list', 'امسح القائمة'],
  clearIssuesQ: ['Clear the reported list?', 'مسح قائمة البلاغات؟'],
  clearIssuesBody: ['Those clues can come up again.', 'هذي التلميحات ممكن تطلع مرة ثانية.'],
  backup: ['Backup', 'النسخ الاحتياطي'],
  backupSub: ['Save settings, the current game, recent games and history to a file, or load them back.', 'احفظ الإعدادات واللعبة الحالية والألعاب والسجل في ملف، أو استرجعها.'],
  exportBackup: ['Save backup', 'حفظ نسخة'],
  importBackup: ['Load backup', 'استرجاع نسخة'],
  importQ: ['Load this backup?', 'استرجاع هذي النسخة؟'],
  importBody: ['{past} recent games {cur}from {date}. It replaces what’s on this device.', '{past} لعبة {cur}من {date}. تستبدل اللي على الجهاز.'],
  importCur: ['and a game in progress ', 'ولعبة جارية '],
  restored: ['Backup loaded.', 'تم الاسترجاع.'],
  bkUnreadable: ['That file couldn’t be read.', 'ما قدرنا نقرأ الملف.'],
  bkNotOurs: ['That isn’t a Jeopardy-Board backup.', 'هذا مو ملف نسخة من Jeopardy-Board.'],
  bkNewer: ['That backup is from a newer version. Update the game first.', 'النسخة من إصدار أحدث. حدّث اللعبة أول.'],
  bkDamaged: ['That backup is damaged.', 'النسخة تالفة.'],
  storage: ['Storage', 'التخزين'],
  storageWhere: ['Saved on this device in {b}. Nothing is sent anywhere.', 'محفوظ على هذا الجهاز في {b}. ما يترسل شي لأي مكان.'],
  storeFull: ['This device is out of storage space.', 'مساحة الجهاز ممتلئة.'],
  storeFail: ['Couldn’t save on this device.', 'ما قدرنا نحفظ على الجهاز.'],
  installIos: ['On iPhone: Share → Add to Home Screen keeps your games safer.', 'على الآيفون: مشاركة ← إضافة للشاشة الرئيسية تحفظ ألعابك أكثر.'],
  clearAll: ['Delete everything', 'احذف كل شي'],
  clearAllQ: ['Delete everything?', 'حذف كل شي؟'],
  clearAllBody: ['Settings, games, history and recordings on this device are deleted.', 'الإعدادات والألعاب والسجل والتسجيلات على هذا الجهاز تنحذف.'],
  deleteIt: ['Delete', 'احذف'],
  credits: ['Credits', 'الحقوق'],
  creditsBody: ['Jeopardy-Board is an independent fan-made game, not affiliated with or endorsed by the Jeopardy! TV show, and uses none of its music, logo, set design or catchphrases. Fonts: Anton, Barlow, Barlow Semi Condensed and Cairo (SIL Open Font License). Built-in sounds are generated in the browser. Clues are written for this game.', 'Jeopardy-Board لعبة مستقلة من صنع معجبين، وما لها علاقة ببرنامج Jeopardy! التلفزيوني ولا تستخدم موسيقاه أو شعاره أو ديكوره أو عباراته. الخطوط: Anton و Barlow و Barlow Semi Condensed و Cairo (رخصة SIL المفتوحة). الأصوات المدمجة تتولد في المتصفح. التلميحات مكتوبة لهذي اللعبة.'],
  version: ['Version {v}', 'الإصدار {v}'],
  sndTitle: ['Sound', 'الصوت'],
  sndOnTap: ['Sound is on (tap to mute)', 'الصوت شغال (اضغط للكتم)'],
  sndMutedTap: ['Muted (tap for sound)', 'مكتوم (اضغط للتشغيل)'],
  sndVolume: ['Volume', 'مستوى الصوت'],
  sndBuiltin: ['Built-in sounds', 'الأصوات المدمجة'],
  sndBuiltinSub: ['Simple sounds made in the browser, used when there’s no recording for an event.', 'أصوات بسيطة يصنعها المتصفح، تُستخدم لما ما فيه تسجيل.'],
  sndTest: ['Test the sound', 'جرّب الصوت'],
  sndWhere: ['With a TV window open, sound plays there only. Otherwise on this device.', 'إذا نافذة التلفزيون مفتوحة، الصوت يطلع منها بس. غير كذا من هذا الجهاز.'],
  sndEvents: ['Sounds for each moment', 'صوت لكل لحظة'],
  sndEventsSub: ['Upload your own clip (up to 20 s, 3 MB). Only use sounds you made or may use.', 'ارفع مقطعك (حتى ٢٠ ثانية و٣ ميغا). استخدم بس أصوات من صنعك أو مسموح لك فيها.'],
  sndVoiceIdea: ['good spot for a voice line', 'مكان مناسب لتعليق صوتي'],
  sndSrcCustom: ['Your recording', 'تسجيلك'],
  sndSrcFile: ['File in sounds/', 'ملف في sounds/'],
  sndSrcBuiltin: ['Built-in', 'مدمج'],
  sndSrcNone: ['Silent', 'صامت'],
  sndPreview: ['Play', 'تشغيل'],
  sndUpload: ['Upload', 'رفع'],
  sndReplace: ['Replace', 'استبدال'],
  sndRemove: ['Remove', 'حذف'],
  sndSaved: ['Saved.', 'انحفظ.'],
  sndTooBig: ['That file is over 3 MB.', 'الملف أكبر من ٣ ميغا.'],
  sndTooLong: ['That clip is over 20 seconds.', 'المقطع أطول من ٢٠ ثانية.'],
  sndNotAudio: ['That isn’t an audio file.', 'هذا مو ملف صوت.'],
  sndUnsupported: ['This browser can’t play that file. Try MP3 or M4A.', 'المتصفح ما يقدر يشغّله. جرّب MP3 أو M4A.'],
  sndStorage: ['Recordings are saved in this browser only, and aren’t in backups.', 'التسجيلات محفوظة في هذا المتصفح بس، وما تدخل في النسخ الاحتياطي.'],
  howBody: [['One phone is the host’s remote. Show the board on a TV (📺): the TV never shows a response or a wager before it’s revealed.', 'Each round has a board of 6 categories × 5 clues. Higher values are harder. Round 2 has new categories and doubles every value.', 'The picking team calls a category and value. The host reads the clue out loud: it’s a statement, and teams give the short response.', 'Teams buzz out loud. The host taps who was first. Right = + the value, and that team picks next. Wrong = − the value, and the other teams can buzz.', 'If nobody gets it, the host shows the response and the same team picks again.', 'Risk It! squares are hidden on the board: 1 in round 1, 2 in round 2. Only the team that found it plays: it bets up to its score (or the round’s top value if that’s more), then sees the clue.', 'Final Wager: one category, then each team secretly bets on the phone, passed round with the screen hidden between teams. Then the clue, a timer, and the host judges each team, lowest score first.', 'Mistakes: Undo in the menu, Fix scores, or “This is wrong” on a bad clue, which reverses exactly what that clue did.'], ['جوال واحد يكون ريموت المقدم. اعرض اللوحة على التلفزيون (📺): التلفزيون ما يعرض جواب أو رهان قبل وقته.', 'كل جولة فيها لوحة من ٦ فئات × ٥ تلميحات. كل ما زادت القيمة صعب التلميح. الجولة ٢ فيها فئات جديدة وتضاعف كل القيم.', 'الفريق اللي عليه الدور يختار فئة وقيمة. المقدم يقرأ التلميح بصوت عالي: هو جملة، والفرق تعطي الجواب القصير.', 'الفرق تضغط بصوتها. المقدم يختار مين كان أول. صح = + القيمة والفريق يختار بعدها. غلط = − القيمة والفرق الثانية تقدر تضغط.', 'إذا محد عرفها، المقدم يعرض الجواب ونفس الفريق يختار مرة ثانية.', 'خانات «خاطِر!» مخفية في اللوحة: وحدة في الجولة ١ واثنتين في الجولة ٢. بس الفريق اللي لقاها يلعبها: يراهن لين نقاطه (أو أعلى قيمة في الجولة إذا أكثر)، وبعدين يشوف التلميح.', 'الرهان الأخير: فئة وحدة، وكل فريق يراهن بالسر على الجوال وهو يتمرر مع شاشة مخفية بين الفرق. بعدها التلميح والمؤقت، والمقدم يحكم على كل فريق من الأقل نقاطاً.', 'الأخطاء: تراجع من القائمة، أو تعديل النقاط، أو «هذا غلط» على التلميح الخربان، ويرجع بالضبط اللي سواه.']]
};
let LANG = 'en';
const setLang = l => {
  LANG = l === 'en' ? 'en' : 'ar';
};
function t(key, vars) {
  const e = S[key];
  let s = e ? LANG === 'ar' ? e[1] : e[0] : key;
  if (vars && typeof s === 'string') Object.keys(vars).forEach(k => {
    s = s.split('{' + k + '}').join(vars[k]);
  });
  return s;
}
function pick(obj, lang) {
  if (obj == null) return '';
  if (typeof obj === 'string') return obj;
  const l = lang || LANG;
  return (obj[l] || obj[l === 'ar' ? 'en' : 'ar'] || '').trim();
}
const looksArabic = s => /[؀-ۿ]/.test(s || '');
const teamName = team => team ? team.name : '';
const ROWS = 5;
const STRICT_WINDOW = 50;
function indexBank(raw) {
  const B = raw || typeof window !== 'undefined' && window.JB_BANK || {
    groups: [],
    cats: [],
    clues: []
  };
  const byCat = {};
  B.cats.forEach(c => {
    byCat[c.id] = [];
  });
  B.clues.forEach(q => {
    if (q.tier && byCat[q.cat]) byCat[q.cat].push(q);
  });
  return {
    groups: B.groups,
    cats: B.cats,
    byCat,
    total: B.clues.filter(q => q.tier).length,
    errors: B.errors || []
  };
}
const tierCounts = qs => [1, 2, 3, 4, 5].map(t => qs.filter(q => q.tier === t).length);
const canFillColumn = qs => tierCounts(qs || []).every(n => n > 0);
function usableCats(bank, rules) {
  return bank.cats.filter(c => !(rules.exclude || []).includes(c.id) && canFillColumn(bank.byCat[c.id]));
}
const catsNeeded = rules => rules.catsPerBoard * rules.rounds + (rules.final ? 1 : 0);
function weightedPick(items, weights, rand) {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return items[Math.floor(rand() * items.length)];
  let r = rand() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}
const ageWeight = (seenAt, gameNo) => {
  if (seenAt == null || gameNo == null) return 1;
  const age = Math.max(1, gameNo - seenAt);
  return age <= 1 ? 0.01 : age <= 3 ? 0.05 : age <= 10 ? 0.2 : 0.6;
};
function pickCategories(cands, n, ctx) {
  const rand = ctx.rand || Math.random;
  const out = [];
  const taken = new Set(ctx.taken || []);
  const groups = new Set();
  for (let k = 0; k < n; k++) {
    const left = cands.filter(c => !taken.has(c.id));
    if (!left.length) break;
    const fresh = left.filter(c => !groups.has(c.group));
    const pool = fresh.length ? fresh : left;
    const c = weightedPick(pool, pool.map(x => ageWeight(ctx.catSeen && ctx.catSeen[x.id], ctx.gameNo)), rand);
    out.push(c);
    taken.add(c.id);
    groups.add(c.group);
  }
  return out;
}
function pickClue(pool, tier, ctx) {
  const rand = ctx.rand || Math.random;
  const keys = q => q.facts && q.facts.length ? q.facts : [q.id];
  const left = pool.filter(q => q.tier === tier && !ctx.used.has(q.id) && !keys(q).some(k => ctx.facts.has(k)));
  if (!left.length) return {
    q: null,
    repeat: false
  };
  const recentOf = q => ctx.recent && ctx.recent[q.id] != null && ctx.gameNo != null && ctx.gameNo - ctx.recent[q.id] <= STRICT_WINDOW;
  let choose = left;
  if (ctx.strict) {
    const fresh = left.filter(q => !recentOf(q));
    if (fresh.length) choose = fresh;else {
      const oldest = Math.min(...left.map(q => ctx.recent[q.id]));
      choose = left.filter(q => ctx.recent[q.id] === oldest);
    }
  }
  const q = weightedPick(choose, choose.map(x => ageWeight(ctx.recent && ctx.recent[x.id], ctx.gameNo)), rand);
  ctx.used.add(q.id);
  keys(q).forEach(k => ctx.facts.add(k));
  return {
    q,
    repeat: recentOf(q)
  };
}
const catInfo = c => ({
  id: c.id,
  emoji: c.emoji,
  name: c.name,
  group: c.group
});
const cellValue = (rules, round, tier) => (rules.values[tier - 1] || 0) * (round === 2 ? 2 : 1);
function selectGame(rules, ctx) {
  const rand = ctx.rand || Math.random;
  const bank = ctx.bank;
  const c = {
    used: new Set(ctx.used || []),
    facts: new Set(),
    recent: ctx.recent || {},
    gameNo: ctx.gameNo,
    rand,
    strict: !!rules.strict
  };
  const cands = usableCats(bank, rules);
  const report = {
    short: 0,
    repeats: 0
  };
  const taken = new Set();
  let final = null;
  if (rules.final) {
    const deep = cands.filter(x => tierCounts(bank.byCat[x.id])[4] >= 1);
    const [fc] = pickCategories(deep.length ? deep : cands, 1, {
      rand,
      catSeen: ctx.catSeen,
      gameNo: ctx.gameNo
    });
    if (fc) {
      taken.add(fc.id);
      final = {
        cat: catInfo(fc),
        q: null
      };
    }
  }
  const boards = [];
  for (let round = 1; round <= rules.rounds; round++) {
    const cats = pickCategories(cands, rules.catsPerBoard, {
      rand,
      catSeen: ctx.catSeen,
      gameNo: ctx.gameNo,
      taken
    });
    cats.forEach(x => taken.add(x.id));
    const cells = [];
    cats.forEach(cat => {
      for (let tier = 1; tier <= ROWS; tier++) {
        const r = pickClue(bank.byCat[cat.id] || [], tier, c);
        if (r.repeat) report.repeats++;
        if (!r.q) report.short++;
        cells.push({
          id: 'r' + round + ':' + cat.id + ':' + tier,
          cat: cat.id,
          tier,
          value: cellValue(rules, round, tier),
          q: r.q,
          status: r.q ? 'open' : 'empty',
          wager: 0
        });
      }
    });
    const want = round === 1 ? 1 : 2;
    const spots = shuffleWith(cells.filter(x => x.status === 'open' && x.tier >= 2), rand);
    const usedCats = new Set();
    for (const s of spots) {
      if (usedCats.size >= want) break;
      if (usedCats.has(s.cat)) continue;
      s.wager = 1;
      usedCats.add(s.cat);
    }
    boards.push({
      round,
      cats: cats.map(catInfo),
      cells
    });
  }
  if (final) {
    const pool = bank.byCat[final.cat.id] || [];
    const r = pickClue(pool, 5, c).q || pickClue(pool, 4, c).q || pickClue(pool, 3, c).q;
    if (r) final.q = r;else {
      final = null;
      report.short++;
    }
  }
  return {
    boards,
    final,
    report
  };
}
function findReplacement(g, catId, tier, ctx) {
  if (!ctx || !ctx.bank) return null;
  const {
    used,
    facts
  } = gameUsed(g);
  (ctx.exclude || []).forEach(id => used.add(id));
  const c = {
    used,
    facts,
    recent: ctx.recent || {},
    gameNo: g.gameNo,
    rand: ctx.rand || Math.random,
    strict: false
  };
  const same = pickClue(ctx.bank.byCat[catId] || [], tier, c).q;
  if (same) return {
    q: same,
    how: 'same'
  };
  const inGame = new Set(gameCatIds(g));
  for (const cat of shuffleWith(usableCats(ctx.bank, g.rules).filter(x => !inGame.has(x.id)), c.rand)) {
    const q = pickClue(ctx.bank.byCat[cat.id] || [], tier, c).q;
    if (q) return {
      q,
      how: 'other'
    };
  }
  return null;
}
const gameCatIds = g => [...(g.boards || []).flatMap(b => b.cats.map(x => x.id)), ...(g.final ? [g.final.cat.id] : [])];
function gameUsed(g) {
  const used = new Set();
  const facts = new Set();
  const add = q => {
    if (!q) return;
    used.add(q.id);
    (q.facts && q.facts.length ? q.facts : [q.id]).forEach(k => facts.add(k));
  };
  (g.boards || []).forEach(b => b.cells.forEach(x => add(x.q)));
  if (g.final) add(g.final.q);
  (g.invalid || []).forEach(x => {
    used.add(x.qid);
    (x.facts || []).forEach(k => facts.add(k));
  });
  return {
    used,
    facts
  };
}
const emptyHistory = () => ({
  n: 0,
  seen: {},
  cats: {}
});
function markSeen(history, qid, gameNo) {
  const h = history || emptyHistory();
  return {
    ...h,
    seen: {
      ...h.seen,
      [qid]: gameNo
    }
  };
}
function markCatsUsed(history, ids, gameNo) {
  const h = history || emptyHistory();
  const cats = {
    ...(h.cats || {})
  };
  ids.forEach(id => {
    cats[id] = gameNo;
  });
  return {
    ...h,
    n: Math.max(h.n || 0, gameNo),
    cats
  };
}
function startGameNo(history) {
  return (history && history.n || 0) + 1;
}
function trimHistory(h, keepGames = 200) {
  if (!h) return emptyHistory();
  const seen = {};
  Object.keys(h.seen || {}).forEach(id => {
    if (h.n - h.seen[id] < keepGames) seen[id] = h.seen[id];
  });
  return {
    n: h.n || 0,
    seen,
    cats: h.cats || {}
  };
}
const DEFAULT_RULES = {
  values: [200, 400, 600, 800, 1000],
  rounds: 2,
  final: true,
  catsPerBoard: 6,
  finalTime: 30,
  questionForm: false,
  exclude: [],
  noMinus: false,
  answerClock: false,
  answerTime: 10,
  strict: false
};
const FINAL_TIMES = [20, 30, 45, 60];
const ANSWER_TIMES = [5, 10, 15, 20];
const HISTORY_MAX = 60;
const MAX_VALUE = 100000;
function cleanRules(r) {
  const x = {
    ...DEFAULT_RULES,
    ...(r || {})
  };
  const v = Array.isArray(x.values) ? x.values.map(n => Math.round(+n)) : [];
  x.values = v.length === 5 && v.every(n => n > 0 && n <= MAX_VALUE) ? v : [...DEFAULT_RULES.values];
  x.rounds = x.rounds === 1 ? 1 : 2;
  x.final = x.final !== false;
  x.catsPerBoard = 6;
  x.finalTime = clamp(Math.round(x.finalTime) || 30, 5, 300);
  x.answerTime = clamp(Math.round(x.answerTime) || 10, 3, 120);
  x.exclude = Array.isArray(x.exclude) ? x.exclude.filter(id => typeof id === 'string') : [];
  ['questionForm', 'noMinus', 'answerClock', 'strict'].forEach(k => {
    x[k] = !!x[k];
  });
  return x;
}
const valuesAscending = vals => vals.every((n, i) => i === 0 || n > vals[i - 1]);
const teamById = (g, id) => g.teams.find(t => t.id === id);
const boardOf = (g, round) => (g.boards || []).find(b => b.round === (round || g.round)) || null;
const cellById = (g, id) => {
  for (const b of g.boards || []) {
    const c = b.cells.find(x => x.id === id);
    if (c) return c;
  }
  return null;
};
const catById = (g, id) => {
  for (const b of g.boards || []) {
    const c = b.cats.find(x => x.id === id);
    if (c) return c;
  }
  return g.final && g.final.cat.id === id ? g.final.cat : null;
};
const openCells = g => {
  const b = boardOf(g);
  return b ? b.cells.filter(c => c.status === 'open') : [];
};
const isBoardDone = g => openCells(g).length === 0;
const pickerTeam = g => teamById(g, g.picker) || g.teams[0];
const roundTop = (g, round) => Math.max(...g.rules.values) * ((round || g.round) === 2 ? 2 : 1);
const hasNextRound = g => g.round < g.rules.rounds;
const hasFinal = g => !!(g.rules.final && g.final && g.final.q);
const lowestFirst = g => [...g.teams].sort((a, b) => a.score - b.score || g.teams.indexOf(a) - g.teams.indexOf(b)).map(t => t.id);
function withHistory(g, label) {
  const {
    history,
    ...snap
  } = g;
  return {
    ...g,
    history: [...(history || []), {
      label,
      snap
    }].slice(-HISTORY_MAX)
  };
}
function undo(g) {
  const h = g.history || [];
  if (!h.length) return g;
  const last = h[h.length - 1];
  return {
    ...last.snap,
    history: h.slice(0, -1)
  };
}
const undoLabel = g => {
  const h = g.history || [];
  return h.length ? h[h.length - 1].label : null;
};
const addScore = (g, teamId, d) => ({
  ...g,
  teams: g.teams.map(tm => tm.id === teamId ? {
    ...tm,
    score: tm.score + d
  } : tm)
});
function createGame(teams, rules, ctx, now = Date.now()) {
  const r = cleanRules(rules);
  const sel = selectGame(r, {
    ...ctx,
    gameNo: ctx.gameNo || 1
  });
  const tms = teams.map((tm, i) => ({
    id: 't' + i,
    name: (tm.name || '').trim(),
    color: tm.color || COLORS[i],
    emoji: tm.emoji || EMOJIS[i],
    score: 0
  }));
  return {
    v: 1,
    id: uid(),
    createdAt: now,
    gameNo: ctx.gameNo || 1,
    rules: r,
    teams: tms,
    boards: sel.boards,
    final: sel.final ? {
      cat: sel.final.cat,
      q: sel.final.q,
      stage: 'category',
      wagers: {},
      order: [],
      judged: {},
      endsAt: null,
      pausedLeft: null
    } : null,
    report: sel.report,
    round: 1,
    phase: 'board',
    picker: tms[0].id,
    current: null,
    log: [],
    history: [],
    invalid: []
  };
}
function rematch(g, ctx, now = Date.now()) {
  return createGame(g.teams.map(({
    name,
    color,
    emoji
  }) => ({
    name,
    color,
    emoji
  })), g.rules, ctx, now);
}
const curCell = g => g.current ? cellById(g, g.current.cell) : null;
const curValue = g => {
  const c = curCell(g);
  const cur = g.current;
  if (!c || !cur) return 0;
  return cur.wager ? cur.bet || 0 : c.value;
};
const maxRiskWager = (g, teamId) => Math.max(teamById(g, teamId).score, roundTop(g));
const minRiskWager = 0;
function openCell(g, cellId, now = Date.now()) {
  const c = cellById(g, cellId);
  const b = boardOf(g);
  if (g.phase !== 'board' || !c || !b || !b.cells.includes(c) || c.status !== 'open') return g;
  const n = withHistory(g, 'open');
  const base = {
    cell: c.id,
    round: g.round,
    tried: [],
    changes: [],
    result: null,
    endsAt: null,
    pausedLeft: null,
    opener: g.picker
  };
  const current = c.wager ? {
    ...base,
    wager: 1,
    stage: 'wager',
    team: g.picker,
    bet: null
  } : {
    ...base,
    wager: 0,
    stage: 'open',
    team: null
  };
  return {
    ...n,
    phase: 'clue',
    current
  };
}
function setRiskWager(g, amount, now = Date.now()) {
  const cur = g.current;
  if (g.phase !== 'clue' || !cur || !cur.wager || cur.stage !== 'wager') return g;
  const a = Math.round(+amount);
  if (!(a >= minRiskWager) || a > maxRiskWager(g, cur.team)) return g;
  const n = withHistory(g, 'wager');
  return {
    ...n,
    current: {
      ...cur,
      stage: 'answer',
      bet: a,
      endsAt: g.rules.answerClock ? now + ms(g.rules.answerTime * 1000) : null,
      pausedLeft: null
    }
  };
}
function buzzIn(g, teamId, now = Date.now()) {
  const cur = g.current;
  if (g.phase !== 'clue' || !cur || cur.wager || cur.stage !== 'open' || !teamById(g, teamId) || cur.tried.includes(teamId)) return g;
  const n = withHistory(g, 'buzz');
  return {
    ...n,
    current: {
      ...cur,
      stage: 'answer',
      team: teamId,
      endsAt: g.rules.answerClock ? now + ms(g.rules.answerTime * 1000) : null,
      pausedLeft: null
    }
  };
}
function markRight(g) {
  const cur = g.current;
  if (g.phase !== 'clue' || !cur || cur.stage !== 'answer') return g;
  const value = curValue(g);
  let n = withHistory(g, 'right');
  n = addScore(n, cur.team, value);
  return {
    ...n,
    picker: cur.team,
    current: {
      ...cur,
      stage: 'reveal',
      endsAt: null,
      pausedLeft: null,
      changes: [...cur.changes, {
        team: cur.team,
        delta: value
      }],
      result: {
        kind: 'right',
        team: cur.team,
        points: value
      }
    }
  };
}
function markWrong(g) {
  const cur = g.current;
  if (g.phase !== 'clue' || !cur || cur.stage !== 'answer') return g;
  const value = curValue(g);
  const lose = cur.wager ? value : g.rules.noMinus ? 0 : value;
  let n = withHistory(g, 'wrong');
  if (lose) n = addScore(n, cur.team, -lose);
  const changes = lose ? [...cur.changes, {
    team: cur.team,
    delta: -lose
  }] : cur.changes;
  const tried = [...cur.tried, cur.team];
  if (cur.wager) return {
    ...n,
    current: {
      ...cur,
      stage: 'reveal',
      endsAt: null,
      pausedLeft: null,
      tried,
      changes,
      result: {
        kind: 'wrong',
        team: cur.team,
        points: -lose
      }
    }
  };
  const left = n.teams.filter(tm => !tried.includes(tm.id));
  if (left.length) return {
    ...n,
    current: {
      ...cur,
      stage: 'open',
      team: null,
      endsAt: null,
      pausedLeft: null,
      tried,
      changes
    }
  };
  return {
    ...n,
    current: {
      ...cur,
      stage: 'reveal',
      team: null,
      endsAt: null,
      pausedLeft: null,
      tried,
      changes,
      result: {
        kind: 'none',
        team: null,
        points: 0
      }
    }
  };
}
function nobody(g) {
  const cur = g.current;
  if (g.phase !== 'clue' || !cur || cur.wager || cur.stage !== 'open') return g;
  const n = withHistory(g, 'nobody');
  return {
    ...n,
    current: {
      ...cur,
      stage: 'reveal',
      team: null,
      result: {
        kind: 'none',
        team: null,
        points: 0
      }
    }
  };
}
function skipClue(g) {
  const cur = g.current;
  if (g.phase !== 'clue' || !cur || cur.stage === 'reveal') return g;
  const n = withHistory(g, 'skip');
  return {
    ...n,
    current: {
      ...cur,
      stage: 'reveal',
      team: null,
      endsAt: null,
      pausedLeft: null,
      result: {
        kind: 'skipped',
        team: null,
        points: 0
      }
    }
  };
}
function putBack(g) {
  const cur = g.current;
  if (g.phase !== 'clue' || !cur || cur.changes.length || cur.tried.length || !(cur.stage === 'open' || cur.stage === 'wager')) return g;
  const n = withHistory(g, 'putBack');
  return {
    ...n,
    phase: 'board',
    current: null
  };
}
function finishClue(g, now = Date.now()) {
  const cur = g.current;
  const c = curCell(g);
  if (g.phase !== 'clue' || !cur || cur.stage !== 'reveal' || !c) return g;
  const r = cur.result || {};
  let n = withHistory(g, 'next');
  const entry = {
    kind: 'clue',
    cell: c.id,
    qid: c.q && c.q.id,
    round: g.round,
    cat: c.cat,
    tier: c.tier,
    value: c.value,
    wager: cur.wager ? 1 : 0,
    bet: cur.bet == null ? null : cur.bet,
    result: r.kind,
    team: r.team || null,
    changes: cur.changes,
    tried: cur.tried,
    at: now
  };
  n = {
    ...n,
    boards: n.boards.map(b => b.round !== g.round ? b : {
      ...b,
      cells: b.cells.map(x => x.id === c.id ? {
        ...x,
        status: 'done',
        result: {
          kind: r.kind,
          team: r.team || null
        }
      } : x)
    }),
    log: [...n.log, entry],
    current: null,
    phase: 'board'
  };
  if (isBoardDone(n)) n = endOfBoard(n, now);
  return n;
}
function endOfBoard(g, now) {
  if (hasNextRound(g) || hasFinal(g)) return {
    ...g,
    phase: 'between',
    log: [...g.log, {
      kind: 'round-end',
      round: g.round,
      at: now
    }]
  };
  return {
    ...g,
    phase: 'done',
    endedAt: now
  };
}
function endRound(g, now = Date.now()) {
  if (g.phase !== 'board') return g;
  const n = withHistory(g, 'endRound');
  return endOfBoard({
    ...n,
    log: [...n.log, {
      kind: 'round-cut',
      round: g.round,
      left: openCells(g).length,
      at: now
    }]
  }, now);
}
function nextStage(g, now = Date.now()) {
  if (g.phase !== 'between') return g;
  const n = withHistory(g, 'nextStage');
  if (hasNextRound(g)) return {
    ...n,
    round: g.round + 1,
    phase: 'board',
    picker: lowestFirst(g)[0]
  };
  if (hasFinal(g)) return {
    ...n,
    phase: 'final',
    final: {
      ...g.final,
      stage: 'category'
    }
  };
  return {
    ...n,
    phase: 'done',
    endedAt: now
  };
}
function endGame(g, now = Date.now()) {
  if (g.phase === 'done') return g;
  const n = withHistory(g, 'end');
  return {
    ...n,
    phase: 'done',
    current: null,
    endedAt: now,
    endedEarly: true
  };
}
function adjustScore(g, teamId, delta, now = Date.now()) {
  if (!delta || !teamById(g, teamId)) return g;
  const n = withHistory(g, 'adjust');
  return {
    ...addScore(n, teamId, delta),
    log: [...n.log, {
      kind: 'adjust',
      team: teamId,
      points: delta,
      at: now
    }]
  };
}
const timeLeft = (g, now = Date.now()) => {
  const cur = g.phase === 'final' ? g.final : g.current;
  if (!cur || cur.endsAt == null) return null;
  if (cur.pausedLeft != null) return cur.pausedLeft;
  return Math.max(0, cur.endsAt - now);
};
function pauseTimer(g, now = Date.now()) {
  const key = g.phase === 'final' ? 'final' : 'current';
  const cur = g[key];
  if (!cur || cur.endsAt == null || cur.pausedLeft != null) return g;
  return {
    ...g,
    [key]: {
      ...cur,
      pausedLeft: Math.max(0, cur.endsAt - now)
    }
  };
}
function resumeTimer(g, now = Date.now()) {
  const key = g.phase === 'final' ? 'final' : 'current';
  const cur = g[key];
  if (!cur || cur.pausedLeft == null) return g;
  return {
    ...g,
    [key]: {
      ...cur,
      endsAt: now + cur.pausedLeft,
      pausedLeft: null
    }
  };
}
const maxFinalWager = (g, teamId) => Math.max(0, teamById(g, teamId).score);
function finalToWagers(g) {
  if (g.phase !== 'final' || g.final.stage !== 'category') return g;
  const n = withHistory(g, 'finalWagers');
  return {
    ...n,
    final: {
      ...g.final,
      stage: 'wager'
    }
  };
}
function setFinalWager(g, teamId, amount) {
  const f = g.final;
  if (g.phase !== 'final' || f.stage !== 'wager' || !teamById(g, teamId)) return g;
  const a = Math.round(+amount);
  if (!(a >= 0) || a > maxFinalWager(g, teamId)) return g;
  const n = withHistory(g, 'finalWager');
  return {
    ...n,
    final: {
      ...f,
      wagers: {
        ...f.wagers,
        [teamId]: a
      }
    }
  };
}
function clearFinalWager(g, teamId) {
  const f = g.final;
  if (g.phase !== 'final' || f.stage !== 'wager' || f.wagers[teamId] == null) return g;
  const n = withHistory(g, 'finalWagerClear');
  const wagers = {
    ...f.wagers
  };
  delete wagers[teamId];
  return {
    ...n,
    final: {
      ...f,
      wagers
    }
  };
}
const allWagersIn = g => g.teams.every(tm => g.final.wagers[tm.id] != null);
function showFinalClue(g, now = Date.now()) {
  const f = g.final;
  if (g.phase !== 'final' || f.stage !== 'wager' || !allWagersIn(g)) return g;
  const n = withHistory(g, 'finalClue');
  return {
    ...n,
    final: {
      ...f,
      stage: 'clue',
      endsAt: now + ms(g.rules.finalTime * 1000),
      pausedLeft: null
    }
  };
}
function startJudging(g) {
  const f = g.final;
  if (g.phase !== 'final' || f.stage !== 'clue') return g;
  const n = withHistory(g, 'finalJudge');
  return {
    ...n,
    final: {
      ...f,
      stage: 'judge',
      order: lowestFirst(g),
      endsAt: null,
      pausedLeft: null
    }
  };
}
const finalNext = g => {
  const f = g.final;
  return f && f.stage === 'judge' ? f.order.find(id => !f.judged[id]) || null : null;
};
function judgeFinal(g, teamId, right, now = Date.now()) {
  const f = g.final;
  if (g.phase !== 'final' || f.stage !== 'judge' || finalNext(g) !== teamId) return g;
  const w = f.wagers[teamId] || 0;
  const delta = right ? w : -w;
  let n = withHistory(g, 'finalJudged');
  n = addScore(n, teamId, delta);
  const judged = {
    ...f.judged,
    [teamId]: {
      right: !!right,
      delta,
      wager: w
    }
  };
  const done = f.order.every(id => judged[id]);
  return {
    ...n,
    final: {
      ...f,
      judged,
      stage: done ? 'done' : 'judge'
    },
    log: [...n.log, {
      kind: 'final',
      team: teamId,
      right: !!right,
      wager: w,
      delta,
      at: now
    }]
  };
}
function finishGame(g, now = Date.now()) {
  if (g.phase !== 'final' || g.final.stage !== 'done') return g;
  const n = withHistory(g, 'finish');
  return {
    ...n,
    phase: 'done',
    endedAt: now
  };
}
function winners(g) {
  const top = Math.max(...g.teams.map(tm => tm.score));
  const w = g.teams.filter(tm => tm.score === top);
  return w.length === g.teams.length && g.teams.length > 1 ? [] : w;
}
function gameStats(g) {
  const per = {};
  g.teams.forEach(tm => {
    per[tm.id] = {
      right: 0,
      wrong: 0,
      won: 0
    };
  });
  let bestRisk = null;
  g.log.forEach(e => {
    if (e.kind !== 'clue' || e.void) return;
    (e.changes || []).forEach(ch => {
      const p = per[ch.team];
      if (!p) return;
      if (ch.delta > 0) {
        p.right++;
        p.won += ch.delta;
      } else p.wrong++;
    });
    if (e.wager && e.result === 'right' && (!bestRisk || e.bet > bestRisk.bet)) bestRisk = e;
  });
  const list = g.teams.map(tm => ({
    team: tm,
    ...per[tm.id]
  }));
  return {
    list,
    bestRisk
  };
}
const pastEntry = g => ({
  id: g.id,
  createdAt: g.createdAt,
  endedAt: g.endedAt,
  gameNo: g.gameNo,
  rules: g.rules,
  teams: g.teams,
  log: g.log,
  phase: 'done'
});
const INVALID_REASONS = ['answer', 'unclear', 'duplicate', 'other'];
const isInvalidated = (g, qid) => (g.invalid || []).some(x => x.qid === qid);
function invalidRefunds(g, where) {
  const sum = {};
  const add = list => (list || []).forEach(ch => {
    sum[ch.team] = (sum[ch.team] || 0) - ch.delta;
  });
  if (where === 'final') {
    if (g.final) Object.keys(g.final.judged || {}).forEach(id => {
      sum[id] = (sum[id] || 0) - g.final.judged[id].delta;
    });
  } else {
    const c = cellById(g, where);
    if (!c) return [];
    if (g.current && g.current.cell === where) add(g.current.changes);else if (c.status === 'done') {
      const e = [...g.log].reverse().find(x => x.kind === 'clue' && x.cell === where && !x.void);
      if (e) add(e.changes);
    }
  }
  return Object.keys(sum).filter(k => sum[k]).map(team => ({
    team,
    delta: sum[team]
  }));
}
function invalidateClue(g, where, opts) {
  const o = opts || {};
  const now = o.now || Date.now();
  if (where === 'final') {
    const f = g.final;
    if (g.phase !== 'final' || !f || !f.q || f.q.id !== o.qid || isInvalidated(g, o.qid)) return g;
    const refunds = invalidRefunds(g, 'final');
    const rep = o.replacement && o.replacement !== 'empty' && o.replacement.q ? o.replacement : null;
    if (!rep) return g;
    let n = withHistory(g, 'invalid');
    refunds.forEach(r => {
      n = addScore(n, r.team, r.delta);
    });
    const log = n.log.map(e => e.kind === 'final' && !e.void ? {
      ...e,
      void: true
    } : e);
    const replay = f.stage === 'clue' || f.stage === 'judge' || f.stage === 'done';
    n = {
      ...n,
      invalid: [...(n.invalid || []), invRecord(f.q, 'final', f.stage, o, refunds, rep, now)],
      log: [...log, {
        kind: 'invalid',
        where: 'final',
        refunds,
        replaced: true,
        at: now
      }],
      final: {
        ...f,
        q: rep.q,
        judged: {},
        order: [],
        stage: replay ? 'clue' : f.stage,
        endsAt: replay ? now + ms(g.rules.finalTime * 1000) : null,
        pausedLeft: null
      }
    };
    return n;
  }
  const c = cellById(g, where);
  if (!c || !c.q || c.q.id !== o.qid || isInvalidated(g, o.qid)) return g;
  const isCur = !!(g.current && g.current.cell === where);
  if (!isCur && c.status !== 'done') return g;
  const refunds = invalidRefunds(g, where);
  const rep = canReplaceCell(g, where) && o.replacement && o.replacement !== 'empty' && o.replacement.q ? o.replacement : null;
  let n = withHistory(g, 'invalid');
  refunds.forEach(r => {
    n = addScore(n, r.team, r.delta);
  });
  const log = n.log.map(e => !isCur && e.kind === 'clue' && e.cell === where && !e.void ? {
    ...e,
    void: true
  } : e);
  log.push({
    kind: 'invalid',
    where,
    round: g.round,
    cat: c.cat,
    tier: c.tier,
    value: c.value,
    refunds,
    replaced: !!rep,
    at: now
  });
  const boards = n.boards.map(b => ({
    ...b,
    cells: b.cells.map(x => {
      if (x.id !== where) return x;
      const {
        result,
        ...rest
      } = x;
      return rep ? {
        ...rest,
        q: rep.q,
        status: 'open',
        replaced: (x.replaced || 0) + 1,
        why: undefined
      } : {
        ...rest,
        q: null,
        status: 'empty',
        why: 'invalid'
      };
    })
  }));
  n = {
    ...n,
    boards,
    log,
    invalid: [...(n.invalid || []), invRecord(c.q, where, isCur ? g.current.stage : 'done', o, refunds, rep, now)]
  };
  if (isCur) {
    const cur = g.current;
    if (rep) n = {
      ...n,
      phase: 'clue',
      current: cur.wager && cur.bet != null ? {
        ...cur,
        stage: 'answer',
        team: cur.opener,
        tried: [],
        changes: [],
        result: null,
        endsAt: g.rules.answerClock ? now + ms(g.rules.answerTime * 1000) : null,
        pausedLeft: null
      } : {
        ...cur,
        stage: cur.wager ? 'wager' : 'open',
        team: cur.wager ? cur.opener : null,
        tried: [],
        changes: [],
        result: null,
        endsAt: null,
        pausedLeft: null
      }
    };else n = {
      ...n,
      phase: 'board',
      current: null
    };
  }
  if (n.phase === 'board' && isBoardDone(n)) n = endOfBoard(n, now);
  return n;
}
const canReplaceCell = (g, cellId) => {
  const b = boardOf(g);
  return !!b && (g.phase === 'board' || g.phase === 'clue') && b.cells.some(x => x.id === cellId);
};
const invRecord = (q, where, stage, o, refunds, rep, now) => ({
  qid: q.id,
  where,
  facts: q.facts || [],
  stage,
  reason: INVALID_REASONS.includes(o.reason) ? o.reason : 'other',
  note: o.note ? String(o.note).slice(0, 300) : '',
  refunds,
  replacement: rep ? rep.q.id : null,
  how: rep ? rep.how : 'empty',
  at: now,
  q: {
    q: q.q,
    a: q.a
  }
});
class Boundary extends React.Component {
  constructor(p) {
    super(p);
    this.state = {
      err: null
    };
  }
  static getDerivedStateFromError(err) {
    return {
      err
    };
  }
  componentDidCatch(err) {
    try {
      console.error(err);
    } catch (e) {}
  }
  render() {
    if (!this.state.err) return this.props.children;
    return React.createElement("div", {
      className: "app"
    }, React.createElement("div", {
      className: "card stack"
    }, React.createElement("h2", {
      className: "display"
    }, t('crashed')), React.createElement("p", {
      className: "muted",
      style: {
        margin: 0
      }
    }, t('crashedSub')), React.createElement("button", {
      className: "btn btn-gold",
      onClick: () => location.reload()
    }, t('reload')), React.createElement("pre", {
      className: "errtxt"
    }, String(this.state.err && (this.state.err.message || this.state.err)))));
  }
}
function Sheet({
  onClose,
  children,
  center
}) {
  useEffect(() => {
    const k = e => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return React.createElement("div", {
    className: 'backdrop' + (center ? ' center' : ''),
    onClick: onClose
  }, React.createElement("div", {
    className: center ? 'modal' : 'sheet',
    onClick: e => e.stopPropagation(),
    role: "dialog",
    "aria-modal": "true"
  }, !center && React.createElement("div", {
    className: "grab"
  }), children));
}
function Confirm({
  title,
  body,
  yes,
  danger,
  onYes,
  onClose
}) {
  return React.createElement(Sheet, {
    center: true,
    onClose: onClose
  }, React.createElement("h2", {
    className: "display",
    style: {
      fontSize: 30
    }
  }, title), body && React.createElement("p", {
    className: "muted",
    style: {
      margin: 0
    }
  }, body), React.createElement("div", {
    className: "row"
  }, React.createElement("button", {
    className: "btn btn-ghost grow",
    onClick: onClose
  }, t('cancel')), React.createElement("button", {
    className: 'btn grow ' + (danger ? 'btn-danger solid' : 'btn-gold'),
    onClick: () => {
      onYes();
      onClose();
    }
  }, yes || t('confirm'))));
}
const backArrow = () => LANG === 'ar' ? '→' : '←';
function TopBar({
  onBack,
  left,
  title,
  right,
  dense
}) {
  return React.createElement("div", {
    className: 'topbar' + (dense ? ' dense' : '')
  }, left || (onBack ? React.createElement("button", {
    className: "iconbtn",
    onClick: onBack,
    "aria-label": t('back')
  }, backArrow()) : React.createElement("span", {
    className: "iconspace"
  })), React.createElement("div", {
    className: "title"
  }, title), right || React.createElement("span", {
    className: "iconspace"
  }));
}
const MenuBtn = ({
  onClick
}) => React.createElement("button", {
  className: "iconbtn",
  onClick: onClick,
  "aria-label": t('menu')
}, "\u2630");
function Seg({
  value,
  options,
  onChange,
  label
}) {
  return React.createElement("div", {
    className: "seg",
    role: "group",
    "aria-label": label
  }, options.map(([v, l]) => React.createElement("button", {
    key: String(v),
    type: "button",
    "aria-pressed": value === v,
    onClick: () => onChange(v)
  }, l)));
}
function Toggle({
  on,
  onChange,
  title,
  sub
}) {
  return React.createElement("button", {
    type: "button",
    className: "toggle",
    "aria-pressed": on,
    onClick: () => onChange(!on)
  }, React.createElement("span", {
    className: "grow"
  }, React.createElement("b", {
    className: "tgl-t"
  }, title), sub && React.createElement("span", {
    className: "small muted"
  }, sub)), React.createElement("span", {
    className: "sw"
  }));
}
function Toast({
  msg,
  ok,
  onClose
}) {
  useEffect(() => {
    if (!ok) return undefined;
    const id = setTimeout(onClose, 3500);
    return () => clearTimeout(id);
  }, [msg, ok]);
  return React.createElement("div", {
    className: 'toast' + (ok ? ' ok' : ''),
    role: "status"
  }, React.createElement("span", {
    className: "grow"
  }, msg), React.createElement("button", {
    onClick: onClose
  }, t('dismiss')));
}
function LangButton({
  settings,
  setSettings
}) {
  return React.createElement("button", {
    className: "pillbtn langbtn",
    onClick: () => setSettings({
      ...settings,
      lang: settings.lang === 'ar' ? 'en' : 'ar'
    }),
    "aria-label": t('langSwitchLabel'),
    lang: LANG === 'ar' ? 'en' : 'ar'
  }, t('langSwitch'));
}
const QLangCtx = React.createContext('auto');
function Txt({
  v,
  as = 'span',
  className,
  both
}) {
  const qLang = React.useContext(QLangCtx);
  const Tag = as;
  const main = pick(v, LANG);
  const other = LANG === 'ar' ? 'en' : 'ar';
  const showOther = (both || qLang === 'both') && v && typeof v === 'object' && v[other] && v[other].trim() && v[other].trim() !== main;
  return React.createElement(Tag, {
    className: className
  }, React.createElement("span", {
    dir: "auto",
    lang: looksArabic(main) ? 'ar' : 'en'
  }, main), showOther && React.createElement("span", {
    className: "alt",
    dir: "auto",
    lang: other
  }, v[other].trim()));
}
const Name = ({
  team
}) => React.createElement("bdi", {
  dir: "auto"
}, teamName(team));
const fmtNum = n => (n < 0 ? '−' : '') + Math.abs(n);
function AnimatedNumber({
  value
}) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (shown === value) return undefined;
    if (reducedMotion()) {
      setShown(value);
      from.current = value;
      return undefined;
    }
    const start = performance.now();
    const a = from.current;
    const dur = 700;
    let raf;
    const step = now => {
      const k = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      const v = Math.round(a + (value - a) * e);
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(step);else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      from.current = value;
    };
  }, [value]);
  return React.createElement("span", {
    className: "num",
    dir: "ltr"
  }, fmtNum(shown));
}
function useDelta(value) {
  const prev = useRef(value);
  const [d, setD] = useState(null);
  useEffect(() => {
    if (value !== prev.current) {
      setD({
        n: value - prev.current,
        k: Date.now()
      });
      prev.current = value;
    }
  }, [value]);
  useEffect(() => {
    if (!d) return undefined;
    const id = setTimeout(() => setD(null), 1600);
    return () => clearTimeout(id);
  }, [d]);
  return d;
}
function ScoreCard({
  team,
  active,
  label,
  big,
  onEdit,
  mark
}) {
  const d = useDelta(team.score);
  const El = onEdit ? 'button' : 'div';
  return React.createElement(El, {
    className: 'scard' + (active ? ' active' : '') + (big ? ' big' : '') + (onEdit ? ' editable' : '') + (team.score < 0 ? ' neg' : ''),
    style: tStyle(team),
    onClick: onEdit || undefined,
    "aria-label": onEdit ? t('editScoreOf', {
      team: teamName(team)
    }) : undefined,
    type: onEdit ? 'button' : undefined
  }, onEdit && React.createElement("span", {
    className: "s-edit",
    "aria-hidden": "true"
  }, "\u270E"), React.createElement("span", {
    className: "s-em",
    "aria-hidden": "true"
  }, team.emoji), React.createElement("span", {
    className: "s-name"
  }, React.createElement(Name, {
    team: team
  })), React.createElement("span", {
    className: "s-score"
  }, React.createElement(AnimatedNumber, {
    value: team.score
  })), active && label && React.createElement("span", {
    className: "s-turn"
  }, label), mark && React.createElement("span", {
    className: "s-mark"
  }, mark), d && React.createElement("span", {
    key: d.k,
    dir: "ltr",
    className: 's-delta' + (d.n < 0 ? ' neg' : '')
  }, d.n > 0 ? '+' : '−', Math.abs(d.n)));
}
function ScoreBar({
  g,
  activeId,
  label,
  big,
  onEdit,
  marks
}) {
  return React.createElement("div", {
    className: 'scorebar n' + g.teams.length + (big ? ' big' : '')
  }, g.teams.map(tm => React.createElement(ScoreCard, {
    key: tm.id,
    team: tm,
    active: tm.id === activeId,
    label: label,
    big: big,
    onEdit: onEdit,
    mark: marks && marks[tm.id]
  })));
}
function Flash({
  f,
  g,
  onDone
}) {
  useEffect(() => {
    const id = setTimeout(onDone, ms(f.kind === 'risk' ? 2000 : 1300));
    return () => clearTimeout(id);
  }, [f]);
  const team = f.team && g ? teamById(g, f.team) : null;
  const big = {
    right: t('flashRight'),
    wrong: t('flashWrong'),
    none: t('flashNone'),
    risk: t('riskIt'),
    invalid: '⚠ ' + t('flashInvalid')
  }[f.kind];
  return React.createElement("div", {
    className: 'flash k-' + f.kind,
    onClick: onDone,
    role: "status",
    "aria-live": "assertive",
    style: tStyle(team)
  }, React.createElement("div", {
    className: "inner"
  }, React.createElement("div", {
    className: "big"
  }, big), f.kind === 'risk' && React.createElement("div", {
    className: "fl-sub"
  }, t('riskItSub')), team && f.points > 0 && React.createElement("div", {
    className: "to"
  }, t('pointsTo', {
    n: f.points,
    team: teamName(team)
  })), team && f.points < 0 && React.createElement("div", {
    className: "to"
  }, t('lostPoints', {
    n: -f.points,
    team: teamName(team)
  })), team && f.kind === 'risk' && React.createElement("div", {
    className: "to"
  }, team.emoji, " ", teamName(team))));
}
function LogoMark({
  size = 64
}) {
  const tiles = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) tiles.push([10 + c * 15, 12 + r * 15, r === 1 && c === 2]);
  return React.createElement("svg", {
    className: "logomark",
    width: size,
    height: size,
    viewBox: "0 0 64 64",
    "aria-hidden": "true"
  }, React.createElement("rect", {
    x: "2",
    y: "2",
    width: "60",
    height: "60",
    rx: "14",
    fill: "#221d47",
    stroke: "#3d3672",
    strokeWidth: "2"
  }), tiles.map(([x, y, lit], i) => React.createElement("rect", {
    key: i,
    x: x,
    y: y,
    width: "13",
    height: "12",
    rx: "3",
    fill: lit ? '#b6f23d' : '#ffc83d'
  })));
}
function Logo() {
  return React.createElement("h1", {
    className: "logo"
  }, React.createElement("span", {
    className: "en",
    lang: "en"
  }, APP_NAME.en), APP_NAME.ar && React.createElement("span", {
    className: "ar",
    lang: "ar"
  }, APP_NAME.ar));
}
function Home({
  game,
  past,
  settings,
  setSettings,
  onNew,
  onContinue,
  onHow,
  onSettings,
  bank
}) {
  const p = usePwa();
  const live = game && game.phase !== 'done' ? game : null;
  const where = live ? live.phase === 'final' ? t('resumeFinal') : t('resumeRound', {
    n: live.round,
    left: openCells(live).length
  }) : '';
  return React.createElement("div", {
    className: "app"
  }, React.createElement("div", {
    className: "topbar"
  }, React.createElement(LangButton, {
    settings: settings,
    setSettings: setSettings
  }), React.createElement("div", {
    className: "title"
  }), React.createElement("button", {
    className: "iconbtn",
    onClick: onSettings,
    "aria-label": t('settings')
  }, "\u2699\uFE0F")), React.createElement("div", {
    className: "hero"
  }, React.createElement("span", {
    className: "tag"
  }, React.createElement("i", null), t('gameNight')), React.createElement(LogoMark, {
    size: 84
  }), React.createElement(Logo, null), React.createElement("p", {
    className: "muted tagline"
  }, t('tagline'))), p.updateReady && React.createElement("div", {
    className: "card row update"
  }, React.createElement("span", {
    className: "grow"
  }, t('updateReady')), React.createElement("button", {
    className: "btn btn-sm btn-gold",
    onClick: () => p.applyUpdate()
  }, t('reload'))), React.createElement("div", {
    className: "menu"
  }, live && React.createElement("button", {
    className: "card resume rowbtn",
    onClick: onContinue
  }, React.createElement("span", {
    className: "r-em"
  }, "\u25B6\uFE0F"), React.createElement("span", {
    className: "grow"
  }, React.createElement("b", {
    className: "r-t"
  }, t('continueGame')), React.createElement("span", {
    className: "small muted r-s"
  }, live.teams.map(tm => teamName(tm)).join(' · '), " \u2014 ", where))), React.createElement("button", {
    className: "btn btn-gold",
    onClick: onNew
  }, t('newGame')), React.createElement("div", {
    className: "row"
  }, React.createElement("button", {
    className: "btn grow",
    onClick: onHow
  }, t('howToPlay')), React.createElement("button", {
    className: "btn grow",
    onClick: onSettings
  }, t('settings'))), p.canPrompt && React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => p.prompt()
  }, "\uD83D\uDCF2 ", t('install'))), React.createElement("p", {
    className: "hint center"
  }, bank && t('bankNote', {
    q: bank.total,
    c: bank.cats.length
  })), past.length > 0 && React.createElement("section", {
    className: "stack-sm"
  }, React.createElement("span", {
    className: "eyebrow"
  }, t('pastGames')), past.slice(0, 5).map(g => {
    const w = winners(g);
    return React.createElement("div", {
      key: g.id,
      className: "pastrow"
    }, React.createElement("span", {
      className: "grow"
    }, g.teams.map((tm, i) => React.createElement("span", {
      key: tm.id
    }, i ? ' · ' : '', tm.emoji, " ", React.createElement(Name, {
      team: tm
    }), " ", React.createElement("b", {
      className: "num",
      dir: "ltr"
    }, fmtNum(tm.score))))), React.createElement("span", {
      className: "small muted"
    }, w.length ? React.createElement(React.Fragment, null, w[0].emoji, " ", t('won')) : t('draw')));
  })));
}
function HowTo({
  onClose
}) {
  const lines = LANG === 'ar' ? S.howBody[1] : S.howBody[0];
  return React.createElement(Sheet, {
    onClose: onClose
  }, React.createElement("div", {
    className: "stack"
  }, React.createElement("h2", {
    className: "display"
  }, t('howToPlay')), React.createElement("ol", {
    className: "howlist"
  }, lines.map((l, i) => React.createElement("li", {
    key: i
  }, l))), React.createElement("button", {
    className: "btn btn-gold",
    onClick: onClose
  }, t('close'))));
}
const freshTeams = () => [{
  name: t('defaultTeam1'),
  color: COLORS[0],
  emoji: EMOJIS[0]
}, {
  name: t('defaultTeam2'),
  color: COLORS[1],
  emoji: EMOJIS[1]
}];
function TeamEditor({
  team,
  i,
  onChange,
  others,
  onRemove
}) {
  const used = new Set(others.map(o => o.color));
  return React.createElement("div", {
    className: "teamedit",
    style: tStyle(team)
  }, React.createElement("div", {
    className: "row"
  }, React.createElement("button", {
    className: "emo",
    "aria-label": t('changeEmoji'),
    onClick: () => onChange({
      ...team,
      emoji: EMOJIS[(EMOJIS.indexOf(team.emoji) + 1) % EMOJIS.length]
    })
  }, team.emoji), React.createElement("input", {
    className: "input grow",
    dir: "auto",
    maxLength: 18,
    value: team.name,
    "aria-label": t('teamN', {
      n: i + 1
    }),
    placeholder: t('teamN', {
      n: i + 1
    }),
    onChange: e => onChange({
      ...team,
      name: e.target.value
    })
  }), onRemove && React.createElement("button", {
    className: "mini",
    "aria-label": t('removeTeam', {
      n: i + 1
    }),
    onClick: onRemove
  }, "\u2715")), React.createElement("div", {
    className: "chips swatches",
    role: "group",
    "aria-label": t('colour')
  }, COLORS.map(c => React.createElement("button", {
    key: c,
    className: 'swatch' + (team.color === c ? ' on' : ''),
    disabled: used.has(c),
    style: {
      background: c
    },
    "aria-label": t('colour') + ' ' + c,
    "aria-pressed": team.color === c,
    onClick: () => onChange({
      ...team,
      color: c
    })
  }))));
}
function Section({
  icon,
  title,
  sub,
  children,
  startOpen
}) {
  const [open, setOpen] = useState(!!startOpen);
  return React.createElement("section", {
    className: "rsec"
  }, React.createElement("button", {
    className: "rtitle",
    "aria-expanded": open,
    onClick: () => setOpen(!open)
  }, React.createElement("span", {
    className: "re"
  }, icon), React.createElement("span", {
    className: "grow"
  }, React.createElement("b", null, title), sub && React.createElement("span", {
    className: "small muted rsum"
  }, sub)), React.createElement("span", {
    className: "chev"
  }, open ? '▲' : '▼')), open && React.createElement("div", {
    className: "rbody stack"
  }, children));
}
const VALUE_PRESETS = [[200, 400, 600, 800, 1000], [100, 200, 300, 400, 500], [1, 2, 3, 4, 5]];
function ValuesEditor({
  values,
  onChange
}) {
  const [txt, setTxt] = useState(values.map(String));
  useEffect(() => {
    setTxt(values.map(String));
  }, [values.join(',')]);
  const commit = list => {
    const nums = list.map(s => parseInt(String(s).replace(/[^\d]/g, ''), 10));
    if (nums.every(n => n > 0 && n <= MAX_VALUE)) onChange(nums);
  };
  return React.createElement("div", {
    className: "field"
  }, React.createElement("span", {
    className: "label"
  }, t('values')), React.createElement("div", {
    className: "valgrid"
  }, txt.map((s, i) => React.createElement("input", {
    key: i,
    className: "input num",
    type: "text",
    inputMode: "numeric",
    dir: "ltr",
    "aria-label": t('rowN', {
      n: i + 1
    }),
    value: s,
    onChange: e => {
      const nx = txt.map((x, j) => j === i ? e.target.value : x);
      setTxt(nx);
      commit(nx);
    }
  }))), React.createElement("div", {
    className: "chips"
  }, VALUE_PRESETS.map(p => React.createElement("button", {
    key: p.join(),
    className: 'chip' + (p.join() === values.join() ? ' on' : ''),
    onClick: () => onChange(p)
  }, p.join(' · ')))), React.createElement("p", {
    className: "hint"
  }, t('valuesSub', {
    r2: values.map(v => v * 2).join(' / ')
  })));
}
function Setup({
  initial,
  bank,
  onBack,
  onStart
}) {
  const [teams, setTeams] = useState(() => initial && initial.teams && initial.teams.length >= 2 ? initial.teams : freshTeams());
  const [rules, setRules] = useState(() => cleanRules(initial && initial.rules));
  const [browse, setBrowse] = useState(false);
  const set = (k, v) => setRules(cleanRules({
    ...rules,
    [k]: v
  }));
  const usable = usableCats(bank, rules).length;
  const need = catsNeeded(rules);
  const problems = [];
  if (teams.some(tm => !tm.name.trim())) problems.push(t('needNames'));
  if (!valuesAscending(rules.values)) problems.push(t('needAscending'));
  if (usable < need) problems.push(t('needCats', {
    have: usable,
    need
  }));
  const addTeam = () => {
    const used = new Set(teams.map(x => x.color));
    const color = COLORS.find(c => !used.has(c));
    setTeams([...teams, {
      name: t('teamN', {
        n: teams.length + 1
      }),
      color,
      emoji: EMOJIS[teams.length % EMOJIS.length]
    }]);
  };
  const mods = [rules.noMinus && t('noMinus'), rules.answerClock && t('answerClock'), rules.strict && t('strictRepeats')].filter(Boolean);
  return React.createElement("div", {
    className: "app"
  }, React.createElement(TopBar, {
    onBack: onBack,
    title: t('setupTitle')
  }), React.createElement("section", {
    className: "stack"
  }, React.createElement("span", {
    className: "eyebrow"
  }, t('teams')), teams.map((tm, i) => React.createElement(TeamEditor, {
    key: i,
    team: tm,
    i: i,
    others: teams.filter((_, j) => j !== i),
    onChange: x => setTeams(teams.map((y, j) => j === i ? x : y)),
    onRemove: teams.length > 2 ? () => setTeams(teams.filter((_, j) => j !== i)) : null
  })), teams.length < 4 && React.createElement("button", {
    className: "btn btn-ghost btn-sm",
    style: {
      width: '100%'
    },
    onClick: addTeam
  }, "\uFF0B ", t('addTeam'))), React.createElement("section", {
    className: "card stack-sm"
  }, React.createElement("span", {
    className: "eyebrow"
  }, t('categories')), React.createElement("div", {
    className: "row"
  }, React.createElement("span", {
    className: "packem"
  }, "\uD83D\uDCDA"), React.createElement("b", {
    className: "grow"
  }, t('catsOn', {
    n: usable,
    of: bank.cats.length
  })), React.createElement("span", {
    className: "small muted num"
  }, t('catsPerGame', {
    n: need
  }))), React.createElement("button", {
    className: "btn btn-sm",
    style: {
      width: '100%'
    },
    onClick: () => setBrowse(true)
  }, t('chooseCats')), React.createElement("p", {
    className: "hint"
  }, t('catsRandom'))), React.createElement(Section, {
    icon: "\u2699\uFE0F",
    title: t('gameRules'),
    sub: t('rulesSummary', {
      r: rules.rounds,
      f: rules.final ? t('withFinal') : t('noFinal'),
      v: rules.values.join('/')
    }),
    startOpen: true
  }, React.createElement("div", {
    className: "field"
  }, React.createElement("span", {
    className: "label"
  }, t('rounds')), React.createElement(Seg, {
    value: rules.rounds,
    options: [[1, t('oneRound')], [2, t('twoRounds')]],
    onChange: v => set('rounds', v),
    label: t('rounds')
  })), React.createElement(ValuesEditor, {
    values: rules.values,
    onChange: v => set('values', v)
  }), React.createElement(Toggle, {
    on: rules.final,
    onChange: v => set('final', v),
    title: t('finalRound'),
    sub: t('finalRoundSub')
  }), rules.final && React.createElement("div", {
    className: "field"
  }, React.createElement("span", {
    className: "label"
  }, t('finalTime')), React.createElement(Seg, {
    value: rules.finalTime,
    options: FINAL_TIMES.map(n => [n, t('seconds', {
      n
    })]),
    onChange: v => set('finalTime', v),
    label: t('finalTime')
  })), React.createElement(Toggle, {
    on: rules.questionForm,
    onChange: v => set('questionForm', v),
    title: t('questionForm'),
    sub: t('questionFormSub')
  })), React.createElement(Section, {
    icon: "\uD83E\uDDE9",
    title: t('modifiers'),
    sub: mods.length ? mods.join(' · ') : t('modifiersOff')
  }, React.createElement(Toggle, {
    on: rules.noMinus,
    onChange: v => set('noMinus', v),
    title: t('noMinus'),
    sub: t('noMinusSub')
  }), React.createElement(Toggle, {
    on: rules.answerClock,
    onChange: v => set('answerClock', v),
    title: t('answerClock'),
    sub: t('answerClockSub')
  }), rules.answerClock && React.createElement("div", {
    className: "field"
  }, React.createElement("span", {
    className: "label"
  }, t('answerTime')), React.createElement(Seg, {
    value: rules.answerTime,
    options: ANSWER_TIMES.map(n => [n, t('seconds', {
      n
    })]),
    onChange: v => set('answerTime', v),
    label: t('answerTime')
  })), React.createElement(Toggle, {
    on: rules.strict,
    onChange: v => set('strict', v),
    title: t('strictRepeats'),
    sub: t('strictRepeatsSub')
  })), problems.map(p => React.createElement("p", {
    key: p,
    className: "warn"
  }, p)), React.createElement("button", {
    className: "btn btn-gold",
    disabled: problems.length > 0,
    onClick: () => onStart(teams.map(tm => ({
      ...tm,
      name: tm.name.trim()
    })), rules)
  }, t('startGame')), browse && React.createElement(CategoryBrowser, {
    bank: bank,
    rules: rules,
    onChange: exclude => setRules(cleanRules({
      ...rules,
      exclude
    })),
    onClose: () => setBrowse(false)
  }));
}
function CategoryBrowser({
  bank,
  rules,
  onChange,
  onClose
}) {
  const off = new Set(rules.exclude);
  const toggle = (ids, on) => {
    const s = new Set(off);
    ids.forEach(id => on ? s.delete(id) : s.add(id));
    onChange([...s]);
  };
  return React.createElement(Sheet, {
    onClose: onClose
  }, React.createElement("div", {
    className: "stack-sm catbrowser"
  }, React.createElement("h2", {
    className: "display",
    style: {
      fontSize: 28
    }
  }, t('chooseCats')), React.createElement("p", {
    className: "hint",
    style: {
      margin: 0
    }
  }, t('chooseCatsSub', {
    n: catsNeeded(rules)
  })), React.createElement("div", {
    className: "row"
  }, React.createElement("button", {
    className: "btn btn-sm grow",
    onClick: () => onChange([])
  }, t('allOn')), React.createElement("button", {
    className: "btn btn-sm btn-ghost grow",
    onClick: () => onChange(bank.cats.map(c => c.id))
  }, t('allOff'))), bank.groups.map(gr => {
    const cats = bank.cats.filter(c => c.group === gr.id);
    if (!cats.length) return null;
    return React.createElement("div", {
      key: gr.id,
      className: "cgroup"
    }, React.createElement("div", {
      className: "cg-head"
    }, React.createElement("span", {
      className: "cg-title"
    }, React.createElement("span", {
      className: "cg-em"
    }, gr.emoji), React.createElement("b", null, React.createElement(Txt, {
      v: gr.name
    }))), React.createElement("button", {
      className: "btn btn-sm btn-ghost",
      onClick: () => toggle(cats.map(c => c.id), cats.some(c => off.has(c.id)))
    }, cats.some(c => off.has(c.id)) ? t('allOn') : t('allOff'))), React.createElement("div", {
      className: "cg-body stack-sm"
    }, cats.map(c => {
      const on = !off.has(c.id);
      const n = (bank.byCat[c.id] || []).length;
      return React.createElement("button", {
        key: c.id,
        className: 'crow crow-main' + (on ? '' : ' off'),
        role: "checkbox",
        "aria-checked": on,
        onClick: () => toggle([c.id], !on)
      }, React.createElement("span", {
        className: "cr-em"
      }, c.emoji), React.createElement("span", {
        className: "grow cr-txt"
      }, React.createElement(Txt, {
        v: c.name,
        className: "cr-name"
      }), React.createElement("span", {
        className: "small muted"
      }, t('cluesN', {
        n
      }))), React.createElement("span", {
        className: 'cr-check' + (on ? ' on' : '')
      }, on ? '✓' : ''));
    })));
  }), React.createElement("button", {
    className: "btn btn-gold",
    onClick: onClose
  }, t('done'))));
}
function useNow(active, every = 200) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(id);
  }, [active, every]);
  return now;
}
const UNDO_TXT = {
  open: ['opening the clue', 'فتح التلميح'],
  wager: ['the Risk It wager', 'رهان «خاطِر»'],
  buzz: ['who buzzed', 'من ضغط أولاً'],
  right: ['“right”', '«صح»'],
  wrong: ['“wrong”', '«غلط»'],
  nobody: ['“nobody”', '«ولا أحد»'],
  skip: ['the skip', 'التخطي'],
  putBack: ['putting it back', 'إرجاع التلميح'],
  next: ['back to the board', 'الرجوع للوحة'],
  endRound: ['ending the round', 'إنهاء الجولة'],
  nextStage: ['starting the next part', 'بدء المرحلة التالية'],
  end: ['ending the game', 'إنهاء اللعبة'],
  adjust: ['the score fix', 'تعديل النقاط'],
  finalWagers: ['starting the wagers', 'بدء الرهانات'],
  finalWager: ['a final wager', 'رهان أخير'],
  finalWagerClear: ['clearing a wager', 'مسح رهان'],
  finalClue: ['showing the final clue', 'عرض التلميح الأخير'],
  finalJudge: ['starting the judging', 'بدء التحكيم'],
  finalJudged: ['the last judgement', 'آخر حكم'],
  finish: ['finishing the game', 'إنهاء اللعبة'],
  invalid: ['“This is wrong”', '«هذا غلط»']
};
const undoText = g => {
  const l = undoLabel(g);
  return l ? t('undoWhat', {
    what: (UNDO_TXT[l] || [l, l])[LANG === 'ar' ? 1 : 0]
  }) : t('nothingToUndo');
};
function Tile({
  g,
  cell,
  onOpen
}) {
  if (cell.status === 'empty') return React.createElement("span", {
    className: 'tile empty' + (cell.why === 'invalid' ? ' invalid' : ''),
    "aria-label": cell.value + ' · ' + t(cell.why === 'invalid' ? 'tileInvalid' : 'tileEmpty')
  }, React.createElement("i", null, cell.why === 'invalid' ? '⚠' : '∅'));
  if (cell.status === 'done') {
    const r = cell.result || {};
    const team = r.team ? teamById(g, r.team) : null;
    return React.createElement("span", {
      className: 'tile done' + (team ? ' won' : ''),
      style: tStyle(team),
      "aria-label": cell.value + ' · ' + (team ? teamName(team) : t('nobodyGotIt'))
    }, team ? React.createElement("i", {
      className: "dot"
    }) : null);
  }
  const active = g.current && g.current.cell === cell.id;
  return React.createElement("button", {
    className: 'tile open' + (active ? ' active' : ''),
    disabled: !onOpen,
    onClick: () => onOpen && onOpen(cell.id)
  }, React.createElement("span", {
    className: "num",
    dir: "ltr"
  }, cell.value));
}
function BoardGrid({
  g,
  onOpen,
  big
}) {
  const b = boardOf(g);
  if (!b) return null;
  const rows = [];
  for (let tier = 1; tier <= ROWS; tier++) b.cats.forEach(cat => {
    const c = b.cells.find(x => x.cat === cat.id && x.tier === tier);
    rows.push(c ? React.createElement(Tile, {
      key: c.id,
      g: g,
      cell: c,
      onOpen: onOpen
    }) : React.createElement("span", {
      key: cat.id + tier,
      className: "tile empty"
    }));
  });
  return React.createElement("div", {
    className: 'board' + (big ? ' big' : ''),
    style: {
      '--cols': b.cats.length
    }
  }, b.cats.map(cat => React.createElement("header", {
    key: cat.id,
    className: "bc-head"
  }, React.createElement("span", {
    className: "bc-em",
    "aria-hidden": "true"
  }, cat.emoji), React.createElement(Txt, {
    v: cat.name,
    className: "bc-name"
  }))), rows);
}
function Board({
  g,
  act,
  onMenu,
  onTv,
  onFix
}) {
  const team = pickerTeam(g);
  return React.createElement("div", {
    className: "app wide boardscreen"
  }, React.createElement(TopBar, {
    left: React.createElement(MenuBtn, {
      onClick: onMenu
    }),
    title: t('roundLeft', {
      n: g.round,
      left: openCells(g).length
    }),
    right: React.createElement(TvButton, {
      onTv: onTv
    }),
    dense: true
  }), React.createElement(ScoreBar, {
    g: g,
    activeId: team.id,
    label: t('picksShort'),
    onEdit: onFix
  }), React.createElement("p", {
    className: "turnline",
    style: tStyle(team)
  }, React.createElement("span", null, team.emoji), " ", t('picksNext', {
    team: teamName(team)
  })), g.round === 1 && g.log.length === 0 && g.report && g.report.short > 0 && React.createElement("p", {
    className: "warn center"
  }, t('reportShort', {
    n: g.report.short
  })), React.createElement(BoardGrid, {
    g: g,
    onOpen: id => act(x => openCell(x, id, Date.now()))
  }), React.createElement("p", {
    className: "hint center"
  }, t('boardHint')));
}
function Clock({
  g,
  big
}) {
  const cur = g.phase === 'final' ? g.final : g.current;
  const running = !!cur && cur.endsAt != null && cur.pausedLeft == null;
  const now = useNow(running, 200);
  if (!cur || cur.endsAt == null) return null;
  if (g.phase === 'clue' && cur.stage !== 'answer') return null;
  const total = ms((g.phase === 'final' ? g.rules.finalTime : g.rules.answerTime) * 1000);
  const left = timeLeft(g, now);
  const secs = Math.ceil(left / ms(1000));
  const pct = Math.max(0, Math.min(100, left / total * 100));
  const out = left <= 0;
  return React.createElement("div", {
    className: 'clock' + (secs <= 5 && !out ? ' hot' : '') + (out ? ' out' : '') + (big ? ' big' : ''),
    role: "timer",
    "aria-live": "off"
  }, React.createElement("span", {
    className: "ck-n num"
  }, cur.pausedLeft != null ? '⏸ ' + secs : out ? t('timeUp') : secs), React.createElement("span", {
    className: "ck-bar"
  }, React.createElement("i", {
    style: {
      width: pct + '%'
    }
  })));
}
const altList = q => q && q.alt ? [...(q.alt[LANG] || []), ...(q.alt[LANG === 'ar' ? 'en' : 'ar'] || [])] : [];
function ClueCard({
  q,
  big,
  showAnswer,
  host,
  questionForm
}) {
  return React.createElement("div", {
    className: 'qcard' + (big ? ' big' : '')
  }, React.createElement(Txt, {
    v: q.q,
    as: "p",
    className: "qtext"
  }), questionForm && !showAnswer && React.createElement("p", {
    className: "qform"
  }, "\u2753 ", t('qFormReminder')), showAnswer && q.a && React.createElement("div", {
    className: "qans"
  }, React.createElement("span", {
    className: "eyebrow"
  }, t('response')), React.createElement(Txt, {
    v: q.a,
    as: "p",
    className: "atext",
    both: true
  }), host && altList(q).length > 0 && React.createElement("p", {
    className: "aalt"
  }, React.createElement("b", null, t('alsoAccept')), " ", React.createElement("bdi", {
    dir: "auto"
  }, altList(q).join(' · '))), q.note && React.createElement(Txt, {
    v: q.note,
    as: "p",
    className: "anote"
  }), host && q.asOf && React.createElement("p", {
    className: "aalt"
  }, t('asOf', {
    d: q.asOf
  })), host && questionForm && React.createElement("p", {
    className: "aalt"
  }, "\u2753 ", t('qFormJudge'))));
}
function ClueHead({
  g,
  cell
}) {
  const cat = catById(g, cell.cat);
  const cur = g.current;
  const risk = cur && cur.cell === cell.id && cur.wager;
  return React.createElement("div", {
    className: "qhead"
  }, React.createElement("span", {
    className: "qh-cat"
  }, cat.emoji, " ", React.createElement(Txt, {
    v: cat.name
  })), risk ? React.createElement("span", {
    className: "qh-val risk num"
  }, t('riskIt'), cur.bet != null ? ' · ' + cur.bet : '') : React.createElement("span", {
    className: "qh-val num",
    dir: "ltr"
  }, cell.value));
}
function ClueStage({
  g
}) {
  const cur = g.current;
  if (cur.stage === 'reveal') return null;
  const team = cur.team ? teamById(g, cur.team) : null;
  if (cur.stage === 'wager') return React.createElement("div", {
    className: "stage s-risk",
    style: tStyle(team)
  }, React.createElement("span", {
    className: "st-em"
  }, team.emoji), React.createElement("b", null, t('riskWagering', {
    team: teamName(team)
  })));
  if (cur.stage === 'open') return React.createElement("div", {
    className: "stage s-open"
  }, React.createElement("span", {
    className: "st-em"
  }, "\uD83D\uDD14"), React.createElement("b", null, cur.tried.length ? t('othersBuzz') : t('buzzNow')));
  return React.createElement("div", {
    className: "stage s-answer",
    style: tStyle(team)
  }, React.createElement("span", {
    className: "st-em"
  }, team.emoji), React.createElement("b", null, t('answering', {
    team: teamName(team)
  })));
}
function ResultBanner({
  g
}) {
  const r = g.current.result || {};
  const team = r.team ? teamById(g, r.team) : null;
  const title = {
    right: t('flashRight'),
    wrong: t('flashWrong'),
    none: t('nobodyGotIt'),
    skipped: t('skipped')
  }[r.kind];
  return React.createElement("div", {
    className: 'result k-' + r.kind,
    style: tStyle(team)
  }, React.createElement("b", {
    className: "rs-t"
  }, title), team && r.points > 0 && React.createElement("span", {
    className: "rs-s"
  }, t('pointsTo', {
    n: r.points,
    team: teamName(team)
  })), team && r.points < 0 && React.createElement("span", {
    className: "rs-s"
  }, t('lostPoints', {
    n: -r.points,
    team: teamName(team)
  })));
}
function RiskSplash({
  g,
  big
}) {
  const team = teamById(g, g.current.team);
  return React.createElement("div", {
    className: 'risksplash' + (big ? ' big' : ''),
    style: tStyle(team)
  }, React.createElement("b", {
    className: "rk-t"
  }, t('riskIt')), React.createElement("span", {
    className: "rk-s"
  }, t('riskItSub')), React.createElement("span", {
    className: "rk-team"
  }, team.emoji, " ", React.createElement(Name, {
    team: team
  })));
}
function RiskWager({
  g,
  act
}) {
  const cur = g.current;
  const team = teamById(g, cur.team);
  const max = maxRiskWager(g, team.id);
  const [v, setV] = useState('');
  const n = parseInt(String(v).replace(/[^\d]/g, ''), 10);
  const okN = !isNaN(n) && n >= minRiskWager && n <= max;
  const quick = [...new Set([Math.min(max, roundTop(g) / 2), roundTop(g), Math.max(0, team.score), max].filter(x => x >= 0 && x <= max))].sort((a, b) => a - b);
  return React.createElement("div", {
    className: "card stack-sm wagerbox",
    style: tStyle(team)
  }, React.createElement("b", null, t('riskWagerQ', {
    team: teamName(team)
  })), React.createElement("p", {
    className: "hint",
    style: {
      margin: 0
    }
  }, t('riskWagerRule', {
    score: fmtNum(team.score),
    max
  })), React.createElement("input", {
    className: "input wagerin num",
    type: "text",
    inputMode: "numeric",
    dir: "ltr",
    value: v,
    placeholder: '0 – ' + max,
    "aria-label": t('wager'),
    onChange: e => setV(e.target.value)
  }), React.createElement("div", {
    className: "chips"
  }, quick.map(q => React.createElement("button", {
    key: q,
    className: "chip",
    onClick: () => setV(String(q))
  }, q === max ? t('allIn', {
    n: q
  }) : q))), v !== '' && !okN && React.createElement("p", {
    className: "warn"
  }, t('wagerRange', {
    max
  })), React.createElement("button", {
    className: "btn btn-gold",
    disabled: !okN,
    onClick: () => act(x => setRiskWager(x, n, Date.now()))
  }, t('lockWager')));
}
function ClueScreen({
  g,
  act,
  flash,
  onMenu,
  onTv,
  onWrong,
  onFix,
  settings,
  setSettings
}) {
  const cur = g.current;
  const cell = curCell(g);
  const peek = settings.hostPeek !== false;
  const setPeek = v => setSettings({
    ...settings,
    hostPeek: v
  });
  const reveal = cur.stage === 'reveal';
  const right = () => {
    const pts = curValue(g);
    act(markRight);
    flash({
      kind: 'right',
      team: cur.team,
      points: pts
    });
    buzz(40);
  };
  const wrong = () => {
    const lose = cur.wager ? curValue(g) : g.rules.noMinus ? 0 : curValue(g);
    act(markWrong);
    flash({
      kind: 'wrong',
      team: cur.team,
      points: lose ? -lose : 0
    });
    buzz(120);
  };
  const lastOnBoard = openCells(g).filter(c => c.id !== cell.id).length === 0;
  const tried = id => cur.tried.includes(id);
  return React.createElement("div", {
    className: "app qscreen"
  }, React.createElement(TopBar, {
    left: React.createElement(MenuBtn, {
      onClick: onMenu
    }),
    title: t('roundLeft', {
      n: g.round,
      left: openCells(g).length
    }),
    right: React.createElement(TvButton, {
      onTv: onTv
    }),
    dense: true
  }), React.createElement(ScoreBar, {
    g: g,
    activeId: cur.team,
    onEdit: onFix,
    marks: Object.fromEntries(cur.tried.map(id => [id, '✕']))
  }), React.createElement(ClueHead, {
    g: g,
    cell: cell
  }), React.createElement(ClueStage, {
    g: g
  }), cur.stage === 'wager' ? React.createElement(React.Fragment, null, React.createElement(RiskSplash, {
    g: g
  }), React.createElement(RiskWager, {
    g: g,
    act: act
  }), React.createElement("p", {
    className: "hint center"
  }, t('riskHidden'))) : React.createElement(React.Fragment, null, React.createElement(Clock, {
    g: g
  }), React.createElement(ClueCard, {
    q: cell.q,
    host: true,
    showAnswer: reveal || peek,
    questionForm: g.rules.questionForm
  }), !reveal && React.createElement("button", {
    className: "btn btn-ghost btn-sm peek",
    "aria-pressed": peek,
    onClick: () => setPeek(!peek)
  }, "\uD83D\uDC41 ", peek ? t('hideResponse') : t('showResponse')), !!cell.q.check && React.createElement("p", {
    className: "checkbadge"
  }, t('needsCheck', {
    d: cell.q.asOf || '?'
  })), reveal && React.createElement(ResultBanner, {
    g: g
  }), onWrong && React.createElement("button", {
    className: "btn btn-sm btn-flag wrongbtn",
    onClick: () => onWrong(cell.id)
  }, "\u26A0 ", t('thisIsWrong'))), React.createElement("div", {
    className: "actions"
  }, cur.stage === 'open' && React.createElement(React.Fragment, null, React.createElement("span", {
    className: "eyebrow span2 center"
  }, t('whoBuzzed')), React.createElement("div", {
    className: 'buzzgrid span2 n' + g.teams.length
  }, g.teams.map(tm => React.createElement("button", {
    key: tm.id,
    className: "btn buzzbtn",
    style: tStyle(tm),
    disabled: tried(tm.id),
    onClick: () => act(x => buzzIn(x, tm.id, Date.now()))
  }, tm.emoji, " ", React.createElement(Name, {
    team: tm
  }), tried(tm.id) ? ' ✕' : ''))), React.createElement("button", {
    className: "btn btn-ghost span2",
    onClick: () => {
      act(nobody);
      flash({
        kind: 'none'
      });
    }
  }, cur.tried.length ? t('nobodyElse') : t('nobody'))), cur.stage === 'answer' && React.createElement(React.Fragment, null, React.createElement("button", {
    className: "btn btn-wrong",
    onClick: wrong
  }, "\u2715 ", t('wrong')), React.createElement("button", {
    className: "btn btn-right",
    onClick: right
  }, "\u2713 ", t('right')), !cur.wager && React.createElement("button", {
    className: "btn btn-ghost btn-sm span2",
    onClick: () => act(undo)
  }, "\u21B6 ", t('wrongTeamTapped'))), reveal && React.createElement("button", {
    className: "btn btn-gold span2",
    onClick: () => act(x => finishClue(x, Date.now()))
  }, lastOnBoard ? t('endOfRound') : t('backToBoard'))));
}
function Between({
  g,
  act,
  big,
  onTv
}) {
  const sorted = [...g.teams].sort((a, b) => b.score - a.score);
  const next = hasNextRound(g) ? 'round2' : hasFinal(g) ? 'final' : 'end';
  const firstPicker = teamById(g, lowestFirst(g)[0]);
  return React.createElement("div", {
    className: big ? 'stack' : 'app'
  }, !big && React.createElement(TopBar, {
    title: t('roundOver', {
      n: g.round
    }),
    right: React.createElement(TvButton, {
      onTv: onTv
    })
  }), React.createElement("div", {
    className: "between card stack-sm center"
  }, React.createElement("span", {
    className: "eyebrow"
  }, t('roundOver', {
    n: g.round
  })), React.createElement("h2", {
    className: "display"
  }, next === 'round2' ? t('nextRound2') : next === 'final' ? t('nextFinal') : t('nextEnd')), next === 'round2' && React.createElement("p", {
    className: "muted",
    style: {
      margin: 0
    }
  }, t('round2Sub', {
    team: teamName(firstPicker)
  })), next === 'final' && React.createElement("p", {
    className: "muted",
    style: {
      margin: 0
    }
  }, t('finalSub'))), React.createElement(ScoreBar, {
    g: {
      ...g,
      teams: sorted
    },
    big: big
  }), act && React.createElement("button", {
    className: "btn btn-gold",
    onClick: () => act(x => nextStage(x, Date.now()))
  }, next === 'round2' ? t('startRound2') : next === 'final' ? t('startFinal') : t('seeResults')), act && undoLabel(g) && React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => act(undo)
  }, "\u21B6 ", undoText(g)));
}
function Winner({
  g,
  big
}) {
  const w = winners(g);
  if (!w.length) return React.createElement("div", {
    className: 'winner draw' + (big ? ' big' : '')
  }, React.createElement("span", {
    className: "eyebrow"
  }, t('finalScores')), React.createElement("h2", {
    className: "display"
  }, t('itsADraw')));
  return React.createElement("div", {
    className: 'winner' + (big ? ' big' : ''),
    style: tStyle(w[0])
  }, React.createElement("span", {
    className: "w-crown"
  }, "\uD83D\uDC51"), React.createElement("span", {
    className: "eyebrow"
  }, w.length > 1 ? t('sharedWin') : t('winnerIs')), React.createElement("h2", {
    className: "display"
  }, w.map((tm, i) => React.createElement("span", {
    key: tm.id
  }, i ? ' & ' : '', tm.emoji, " ", React.createElement(Name, {
    team: tm
  })))), React.createElement("span", {
    className: "w-score num",
    dir: "ltr"
  }, fmtNum(w[0].score)));
}
function GameLog({
  g
}) {
  return React.createElement("details", {
    className: "card"
  }, React.createElement("summary", {
    className: "label"
  }, t('gameLog')), React.createElement("ol", {
    className: "glog"
  }, g.log.map((e, i) => {
    const tm = e.team ? teamById(g, e.team) : null;
    const c = e.cat ? catById(g, e.cat) : null;
    const pre = c ? React.createElement("span", {
      className: "muted"
    }, c.emoji, " ", pick(c.name), " ", e.value, e.wager ? ' · ' + t('riskIt') + ' ' + e.bet : '', " \xB7 ") : null;
    if (e.kind === 'clue') {
      const ch = (e.changes || []).map((x, k) => {
        const xt = teamById(g, x.team);
        return React.createElement("span", {
          key: k
        }, k ? ', ' : '', teamName(xt), " ", React.createElement("span", {
          dir: "ltr"
        }, x.delta > 0 ? '+' : '−', Math.abs(x.delta)));
      });
      const tried = (e.tried || []).filter(id => !(e.changes || []).some(x => x.team === id));
      return React.createElement("li", {
        key: i,
        className: e.void ? 'lg-void' : undefined
      }, pre, React.createElement("span", {
        dir: "auto"
      }, ch.length ? ch : e.result === 'skipped' ? t('skipped') : t('nobodyGotIt'), tried.length ? ' · ' + tried.map(id => teamName(teamById(g, id)) + ' ✕').join(', ') : ''), e.void ? React.createElement("span", {
        className: "muted"
      }, " ", t('logVoid')) : null);
    }
    if (e.kind === 'adjust') return React.createElement("li", {
      key: i
    }, t('logAdjust', {
      team: teamName(tm),
      d: (e.points > 0 ? '+' : '') + e.points
    }));
    if (e.kind === 'round-end' || e.kind === 'round-cut') return React.createElement("li", {
      key: i,
      className: "lg-round"
    }, "\u2014 ", t('roundOver', {
      n: e.round
    }), e.kind === 'round-cut' ? ' (' + t('cutShort', {
      n: e.left
    }) + ')' : '', " \u2014");
    if (e.kind === 'final') return React.createElement("li", {
      key: i,
      className: e.void ? 'lg-void' : undefined
    }, React.createElement("span", {
      className: "muted"
    }, t('finalWager'), " \xB7 "), React.createElement("span", {
      dir: "auto"
    }, teamName(tm), " ", e.right ? '✓' : '✕', " ", React.createElement("span", {
      dir: "ltr"
    }, e.delta >= 0 ? '+' : '−', Math.abs(e.delta))));
    if (e.kind === 'invalid') return React.createElement("li", {
      key: i,
      className: "lg-invalid"
    }, e.where === 'final' ? React.createElement("span", {
      className: "muted"
    }, t('finalWager'), " \xB7 ") : pre, "\u26A0 ", e.replaced ? t('logInvalidRep') : t('logInvalid'), (e.refunds || []).map((r, k) => React.createElement("span", {
      key: k,
      className: "muted"
    }, " \xB7 ", teamName(teamById(g, r.team)), " ", React.createElement("span", {
      dir: "ltr"
    }, r.delta > 0 ? '+' : '−', Math.abs(r.delta)))));
    return null;
  })));
}
function Results({
  g,
  act,
  onHome,
  onAgain,
  onFlagPlayed,
  onFix,
  onTv
}) {
  const sorted = [...g.teams].sort((a, b) => b.score - a.score);
  const s = gameStats(g);
  const br = s.bestRisk;
  const brTeam = br ? teamById(g, br.team) : null;
  return React.createElement("div", {
    className: "app"
  }, React.createElement(TopBar, {
    onBack: onHome,
    title: t('resultsTitle'),
    right: React.createElement(TvButton, {
      onTv: onTv
    })
  }), React.createElement(Winner, {
    g: g
  }), React.createElement("section", {
    className: "stack-sm"
  }, React.createElement("span", {
    className: "eyebrow"
  }, t('finalScores')), sorted.map((tm, i) => {
    const st = s.list.find(x => x.team.id === tm.id);
    return React.createElement("div", {
      key: tm.id,
      className: "frow",
      style: tStyle(tm)
    }, React.createElement("span", {
      className: "fr-rk num"
    }, i + 1), React.createElement("span", {
      className: "grow fr-n"
    }, tm.emoji, " ", React.createElement(Name, {
      team: tm
    }), React.createElement("small", {
      className: "muted"
    }, " \xB7 ", t('rightShort'), " ", st.right, " \xB7 ", t('wrongShort'), " ", st.wrong)), React.createElement("b", {
      className: "fr-s num",
      dir: "ltr"
    }, fmtNum(tm.score)));
  })), br && brTeam && React.createElement("div", {
    className: "stat",
    style: tStyle(brTeam)
  }, React.createElement("span", {
    className: "k"
  }, t('bestRisk')), React.createElement("span", {
    className: "v num"
  }, br.bet), React.createElement("span", {
    className: "d",
    dir: "auto"
  }, teamName(brTeam))), React.createElement(GameLog, {
    g: g
  }), onFix && React.createElement("button", {
    className: "btn btn-sm",
    onClick: onFix
  }, "\xB1 ", t('fixScores')), onFlagPlayed && React.createElement("button", {
    className: "btn btn-sm btn-flag",
    onClick: onFlagPlayed
  }, "\u26A0 ", t('flagPlayed')), React.createElement("button", {
    className: "btn btn-gold",
    onClick: onAgain
  }, t('playAgain')), React.createElement("p", {
    className: "hint center",
    style: {
      marginTop: -8
    }
  }, t('playAgainSub')), React.createElement("div", {
    className: "row"
  }, React.createElement("button", {
    className: "btn grow",
    onClick: onHome
  }, t('home')), undoLabel(g) && React.createElement("button", {
    className: "btn btn-ghost grow",
    onClick: () => act(undo)
  }, "\u21B6 ", t('undo'))));
}
function FixScores({
  g,
  act,
  onClose
}) {
  const [step, setStep] = useState(g.rules.values[0]);
  const [exact, setExact] = useState({});
  const lastIsFix = undoLabel(g) === 'adjust';
  const steps = [...new Set([g.rules.values[0], g.rules.values[1], g.rules.values[2], g.rules.values[4]])];
  const setTo = tm => {
    const v = parseInt(String(exact[tm.id] || '').replace(/[^\d-]/g, ''), 10);
    if (isNaN(v)) return;
    act(x => adjustScore(x, tm.id, v - teamById(x, tm.id).score));
    setExact({
      ...exact,
      [tm.id]: ''
    });
  };
  return React.createElement(Sheet, {
    onClose: onClose
  }, React.createElement("div", {
    className: "stack"
  }, React.createElement("h2", {
    className: "display"
  }, t('fixScores')), React.createElement("p", {
    className: "hint",
    style: {
      margin: 0
    }
  }, t('fixScoresSub')), React.createElement("div", {
    className: "field"
  }, React.createElement("span", {
    className: "label"
  }, t('fixStep')), React.createElement(Seg, {
    value: step,
    options: steps.map(n => [n, String(n)]),
    onChange: setStep,
    label: t('fixStep')
  })), g.teams.map(tm => React.createElement("div", {
    key: tm.id,
    className: "fixteam stack-sm",
    style: tStyle(tm)
  }, React.createElement("div", {
    className: "fixrow"
  }, React.createElement("span", {
    className: "grow"
  }, tm.emoji, " ", React.createElement(Name, {
    team: tm
  })), React.createElement("button", {
    className: "mini",
    "aria-label": '−' + step + ' ' + teamName(tm),
    onClick: () => act(x => adjustScore(x, tm.id, -step))
  }, "\u2212"), React.createElement("b", {
    className: "num fx-s",
    dir: "ltr"
  }, fmtNum(tm.score)), React.createElement("button", {
    className: "mini",
    "aria-label": '+' + step + ' ' + teamName(tm),
    onClick: () => act(x => adjustScore(x, tm.id, step))
  }, "+")), React.createElement("div", {
    className: "row fixexact"
  }, React.createElement("input", {
    className: "input",
    type: "text",
    inputMode: "numeric",
    dir: "ltr",
    placeholder: t('setScoreTo'),
    "aria-label": t('setScoreFor', {
      team: teamName(tm)
    }),
    value: exact[tm.id] || '',
    onChange: e => setExact({
      ...exact,
      [tm.id]: e.target.value
    }),
    onKeyDown: e => {
      if (e.key === 'Enter') setTo(tm);
    }
  }), React.createElement("button", {
    className: "btn btn-sm",
    disabled: !exact[tm.id],
    onClick: () => setTo(tm)
  }, t('setScore'))))), lastIsFix && React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => act(undo)
  }, "\u21B6 ", t('undoLastFix')), React.createElement("p", {
    className: "hint",
    style: {
      margin: 0
    }
  }, t('fixWrongTip')), React.createElement("button", {
    className: "btn btn-gold",
    onClick: onClose
  }, t('close'))));
}
function GameMenu({
  g,
  act,
  onClose,
  onHome,
  onFlagPlayed,
  onFix,
  sound,
  onSound
}) {
  const [ask, setAsk] = useState(null);
  const cur = g.phase === 'final' ? g.final : g.current;
  const inClue = g.phase === 'clue' && g.current && g.current.stage !== 'reveal';
  const clockOn = cur && cur.endsAt != null && (g.phase !== 'final' || g.final.stage === 'clue');
  const run = fn => {
    act(fn);
    onClose();
  };
  if (ask === 'end') return React.createElement(Confirm, {
    title: t('endGameQ'),
    body: t('endGameBody'),
    yes: t('endGame'),
    danger: true,
    onYes: () => act(x => endGame(x, Date.now())),
    onClose: onClose
  });
  if (ask === 'round') return React.createElement(Confirm, {
    title: t('endRoundQ'),
    body: t('endRoundBody', {
      n: openCells(g).length
    }),
    yes: t('endRound'),
    onYes: () => act(x => endRound(x, Date.now())),
    onClose: onClose
  });
  return React.createElement(Sheet, {
    onClose: onClose
  }, React.createElement("div", {
    className: "stack-sm"
  }, React.createElement("h2", {
    className: "display"
  }, t('menu')), React.createElement("button", {
    className: "btn",
    disabled: !undoLabel(g),
    onClick: () => run(undo)
  }, "\u21B6 ", undoText(g)), clockOn && (cur.pausedLeft == null ? React.createElement("button", {
    className: "btn",
    onClick: () => run(x => pauseTimer(x, Date.now()))
  }, "\u23F8 ", t('pause')) : React.createElement("button", {
    className: "btn",
    onClick: () => run(x => resumeTimer(x, Date.now()))
  }, "\u25B6 ", t('resume'))), inClue && !g.current.changes.length && !g.current.tried.length && (g.current.stage === 'open' || g.current.stage === 'wager') && React.createElement("button", {
    className: "btn menu2",
    onClick: () => run(putBack)
  }, React.createElement("span", null, "\u21A9 ", t('putBack')), React.createElement("small", null, t('putBackSub'))), inClue && React.createElement("button", {
    className: "btn",
    onClick: () => run(skipClue)
  }, "\u23ED ", t('skipClue')), g.phase === 'board' && React.createElement("button", {
    className: "btn",
    onClick: () => setAsk('round')
  }, "\u23E9 ", t('endRound')), React.createElement("button", {
    className: "btn",
    onClick: () => {
      onClose();
      onFix();
    }
  }, "\xB1 ", t('fixScores')), onSound && React.createElement("button", {
    className: "btn",
    "aria-pressed": !!(sound && sound.muted),
    onClick: () => onSound({
      ...sound,
      muted: !(sound && sound.muted)
    })
  }, sound && sound.muted ? '🔇 ' + t('sndUnmute') : '🔊 ' + t('sndMute')), onFlagPlayed && React.createElement("button", {
    className: "btn btn-flag",
    onClick: () => {
      onClose();
      onFlagPlayed();
    }
  }, "\u26A0 ", t('flagPlayed')), React.createElement("button", {
    className: "btn btn-danger",
    onClick: () => setAsk('end')
  }, "\uD83C\uDFC1 ", t('endGame')), React.createElement("button", {
    className: "btn btn-ghost menu2",
    onClick: () => {
      onClose();
      onHome();
    }
  }, React.createElement("span", null, "\uD83C\uDFE0 ", t('quitHome')), React.createElement("small", null, t('quitHomeSub'))), React.createElement("button", {
    className: "btn btn-ghost",
    onClick: onClose
  }, t('close'))));
}
function FinalHead({
  g
}) {
  const f = g.final;
  return React.createElement("div", {
    className: "finalhead"
  }, React.createElement("span", {
    className: "eyebrow"
  }, t('finalWager')), React.createElement("span", {
    className: "fh-cat"
  }, f.cat.emoji, " ", React.createElement(Txt, {
    v: f.cat.name
  })));
}
function WagerPass({
  g,
  teamId,
  act,
  onDone
}) {
  const team = teamById(g, teamId);
  const max = maxFinalWager(g, teamId);
  const [step, setStep] = useState('cover');
  const [v, setV] = useState('');
  const n = parseInt(String(v).replace(/[^\d]/g, ''), 10);
  const okN = !isNaN(n) && n >= 0 && n <= max;
  if (step === 'cover') return React.createElement("div", {
    className: "passcover",
    style: tStyle(team)
  }, React.createElement("span", {
    className: "pc-em"
  }, team.emoji), React.createElement("h2", {
    className: "display"
  }, t('passTo', {
    team: teamName(team)
  })), React.createElement("p", {
    className: "muted"
  }, t('passToSub', {
    team: teamName(team)
  })), React.createElement("button", {
    className: "btn btn-gold",
    onClick: () => setStep('enter')
  }, t('imTeam', {
    team: teamName(team)
  })), React.createElement("button", {
    className: "btn btn-ghost",
    onClick: onDone
  }, t('cancel')));
  if (step === 'locked') return React.createElement("div", {
    className: "passcover",
    style: tStyle(team)
  }, React.createElement("span", {
    className: "pc-em"
  }, "\uD83D\uDD12"), React.createElement("h2", {
    className: "display"
  }, t('wagerLocked')), React.createElement("p", {
    className: "muted"
  }, t('passBack')), React.createElement("button", {
    className: "btn btn-gold",
    onClick: onDone
  }, t('imHost')));
  return React.createElement("div", {
    className: "passcover enter",
    style: tStyle(team)
  }, React.createElement("span", {
    className: "eyebrow"
  }, team.emoji, " ", teamName(team)), React.createElement("h2", {
    className: "display",
    style: {
      fontSize: 30
    }
  }, t('yourWager')), React.createElement("p", {
    className: "hint",
    style: {
      margin: 0
    }
  }, t('finalWagerRule', {
    score: fmtNum(team.score),
    max
  })), React.createElement("input", {
    className: "input wagerin num",
    type: "text",
    inputMode: "numeric",
    dir: "ltr",
    autoComplete: "off",
    value: v,
    placeholder: '0 – ' + max,
    "aria-label": t('wager'),
    onChange: e => setV(e.target.value)
  }), React.createElement("div", {
    className: "chips"
  }, [...new Set([0, Math.floor(max / 2), max])].map(q => React.createElement("button", {
    key: q,
    className: "chip",
    onClick: () => setV(String(q))
  }, q === max && max > 0 ? t('allIn', {
    n: q
  }) : q))), v !== '' && !okN && React.createElement("p", {
    className: "warn"
  }, t('wagerRange', {
    max
  })), React.createElement("button", {
    className: "btn btn-gold",
    disabled: !okN,
    onClick: () => {
      act(x => setFinalWager(x, teamId, n));
      setV('');
      setStep('locked');
    }
  }, t('lockWager')), React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => {
      setV('');
      setStep('cover');
    }
  }, t('cancel')));
}
function FinalScreen({
  g,
  act,
  flash,
  onMenu,
  onTv,
  onWrong,
  onFix,
  settings,
  setSettings
}) {
  const f = g.final;
  const [passing, setPassing] = useState(null);
  const [clearAsk, setClearAsk] = useState(null);
  const peek = settings.hostPeek !== false;
  if (passing) return React.createElement("div", {
    className: "app"
  }, React.createElement(WagerPass, {
    g: g,
    teamId: passing,
    act: act,
    onDone: () => setPassing(null)
  }));
  const nextId = finalNext(g);
  const nextTeam = nextId ? teamById(g, nextId) : null;
  return React.createElement("div", {
    className: "app qscreen finalscreen"
  }, React.createElement(TopBar, {
    left: React.createElement(MenuBtn, {
      onClick: onMenu
    }),
    title: t('finalWager'),
    right: React.createElement(TvButton, {
      onTv: onTv
    }),
    dense: true
  }), React.createElement(ScoreBar, {
    g: g,
    activeId: nextId,
    onEdit: f.stage === 'wager' ? null : onFix,
    marks: f.stage === 'wager' ? Object.fromEntries(g.teams.map(tm => [tm.id, f.wagers[tm.id] != null ? '🔒' : '…'])) : null
  }), React.createElement(FinalHead, {
    g: g
  }), f.stage === 'category' && React.createElement(React.Fragment, null, React.createElement("p", {
    className: "hint center"
  }, t('finalCatHint')), React.createElement("div", {
    className: "actions"
  }, React.createElement("button", {
    className: "btn btn-gold span2",
    onClick: () => act(finalToWagers)
  }, t('startWagers')))), f.stage === 'wager' && React.createElement(React.Fragment, null, React.createElement("p", {
    className: "hint center"
  }, t('wagersHint')), React.createElement("div", {
    className: "stack-sm"
  }, g.teams.map(tm => {
    const locked = f.wagers[tm.id] != null;
    return React.createElement("div", {
      key: tm.id,
      className: "wagerrow",
      style: tStyle(tm)
    }, React.createElement("span", {
      className: "grow"
    }, tm.emoji, " ", React.createElement(Name, {
      team: tm
    }), " ", React.createElement("small", {
      className: "muted"
    }, "\xB7 ", t('maxWager', {
      n: maxFinalWager(g, tm.id)
    }))), locked ? React.createElement(React.Fragment, null, React.createElement("span", {
      className: "lockmark"
    }, "\uD83D\uDD12 ", t('locked')), React.createElement("button", {
      className: "btn btn-sm btn-ghost",
      onClick: () => setClearAsk(tm.id)
    }, t('redo'))) : React.createElement("button", {
      className: "btn btn-sm btn-gold",
      onClick: () => setPassing(tm.id)
    }, t('enterWager')));
  })), React.createElement("div", {
    className: "actions"
  }, React.createElement("button", {
    className: "btn btn-gold span2",
    disabled: !allWagersIn(g),
    onClick: () => act(x => showFinalClue(x, Date.now()))
  }, t('showFinalClue')))), f.stage === 'clue' && React.createElement(React.Fragment, null, React.createElement(Clock, {
    g: g
  }), React.createElement(ClueCard, {
    q: f.q,
    host: true,
    showAnswer: peek,
    questionForm: g.rules.questionForm
  }), React.createElement("button", {
    className: "btn btn-ghost btn-sm peek",
    "aria-pressed": peek,
    onClick: () => setSettings({
      ...settings,
      hostPeek: !peek
    })
  }, "\uD83D\uDC41 ", peek ? t('hideResponse') : t('showResponse')), React.createElement("p", {
    className: "hint center"
  }, t('finalWriteHint')), onWrong && React.createElement("button", {
    className: "btn btn-sm btn-flag wrongbtn",
    onClick: () => onWrong('final')
  }, "\u26A0 ", t('thisIsWrong')), React.createElement("div", {
    className: "actions"
  }, React.createElement("button", {
    className: "btn btn-gold span2",
    onClick: () => act(startJudging)
  }, t('startJudging')))), (f.stage === 'judge' || f.stage === 'done') && React.createElement(React.Fragment, null, React.createElement(ClueCard, {
    q: f.q,
    host: true,
    showAnswer: true,
    questionForm: g.rules.questionForm
  }), React.createElement(JudgeList, {
    g: g
  }), onWrong && React.createElement("button", {
    className: "btn btn-sm btn-flag wrongbtn",
    onClick: () => onWrong('final')
  }, "\u26A0 ", t('thisIsWrong')), React.createElement("div", {
    className: "actions"
  }, nextTeam && React.createElement(React.Fragment, null, React.createElement("span", {
    className: "eyebrow span2 center"
  }, t('judgeNext', {
    team: teamName(nextTeam)
  })), React.createElement("button", {
    className: "btn btn-wrong",
    onClick: () => {
      act(x => judgeFinal(x, nextId, false, Date.now()));
      flash({
        kind: 'wrong',
        team: nextId,
        points: -(f.wagers[nextId] || 0)
      });
    }
  }, "\u2715 ", t('wrong')), React.createElement("button", {
    className: "btn btn-right",
    onClick: () => {
      act(x => judgeFinal(x, nextId, true, Date.now()));
      flash({
        kind: 'right',
        team: nextId,
        points: f.wagers[nextId] || 0
      });
    }
  }, "\u2713 ", t('right'))), f.stage === 'done' && React.createElement("button", {
    className: "btn btn-gold span2",
    onClick: () => act(x => finishGame(x, Date.now()))
  }, t('seeResults')))), clearAsk && React.createElement(Confirm, {
    title: t('redoQ', {
      team: teamName(teamById(g, clearAsk))
    }),
    body: t('redoBody'),
    yes: t('redo'),
    onYes: () => act(x => clearFinalWager(x, clearAsk)),
    onClose: () => setClearAsk(null)
  }));
}
function JudgeList({
  g,
  big
}) {
  const f = g.final;
  const next = finalNext(g);
  return React.createElement("div", {
    className: 'judgelist stack-sm' + (big ? ' big' : '')
  }, f.order.map(id => {
    const tm = teamById(g, id);
    const j = f.judged[id];
    return React.createElement("div", {
      key: id,
      className: 'judgerow' + (id === next ? ' next' : '') + (j ? j.right ? ' right' : ' wrong' : ''),
      style: tStyle(tm)
    }, React.createElement("span", {
      className: "grow"
    }, tm.emoji, " ", React.createElement(Name, {
      team: tm
    })), j ? React.createElement("span", {
      className: "jr-res",
      dir: "ltr"
    }, j.right ? '✓' : '✕', " ", t('wagerWas', {
      n: j.wager
    }), " \u2192 ", React.createElement("b", null, fmtNum(tm.score))) : React.createElement("span", {
      className: "jr-res muted"
    }, id === next ? t('judgingNow') : '🔒'));
  }));
}
function FinalTv({
  g
}) {
  const f = g.final;
  return React.createElement(React.Fragment, null, React.createElement(ScoreBar, {
    g: g,
    activeId: finalNext(g),
    big: true,
    marks: f.stage === 'wager' ? Object.fromEntries(g.teams.map(tm => [tm.id, f.locked && f.locked[tm.id] ? '🔒' : '…'])) : null
  }), React.createElement("div", {
    className: "tv-q"
  }, React.createElement(FinalHead, {
    g: g
  }), f.stage === 'category' && React.createElement("p", {
    className: "tv-big muted center"
  }, t('finalTvCat')), f.stage === 'wager' && React.createElement("p", {
    className: "tv-big muted center"
  }, t('finalTvWagers')), f.stage === 'clue' && f.q && React.createElement(React.Fragment, null, React.createElement(Clock, {
    g: g,
    big: true
  }), React.createElement(ClueCard, {
    q: f.q,
    big: true,
    questionForm: g.rules.questionForm
  })), (f.stage === 'judge' || f.stage === 'done') && React.createElement(React.Fragment, null, f.q && React.createElement(ClueCard, {
    q: f.q,
    big: true,
    showAnswer: f.stage === 'done'
  }), React.createElement(JudgeList, {
    g: g,
    big: true
  }))));
}
const fmtDelta = d => (d > 0 ? '+' : '−') + Math.abs(d);
function WrongSheet({
  g,
  where,
  ctx,
  act,
  onClose,
  onDone
}) {
  const isFinal = where === 'final';
  const cell = isFinal ? null : cellById(g, where);
  const q = isFinal ? g.final && g.final.q : cell && cell.q;
  const qid = q && q.id;
  const [reason, setReason] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const plan = useMemo(() => {
    if (!q) return null;
    const c = ctx();
    const catId = isFinal ? g.final.cat.id : cell.cat;
    const tier = isFinal ? q.tier : cell.tier;
    const canRep = isFinal || canReplaceCell(g, where);
    return {
      refunds: invalidRefunds(g, where),
      rep: canRep ? findReplacement(g, catId, tier, c) : null,
      canRep
    };
  }, [where, qid]);
  const [useRep, setUseRep] = useState(true);
  if (!q || !plan) return null;
  const refunding = plan.refunds.length > 0;
  const chosen = plan.rep && (useRep || isFinal) ? plan.rep : 'empty';
  const go = () => {
    if (busy) return;
    setBusy(true);
    const rec = {
      qid,
      reason: reason || 'other',
      note,
      replacement: chosen,
      now: Date.now()
    };
    act(x => invalidateClue(x, where, rec));
    onDone && onDone({
      where,
      q,
      value: cell ? cell.value : null,
      rec,
      refunds: plan.refunds,
      refunded: refunding
    });
    onClose();
  };
  const catLabel = id => {
    const c = catById(g, id) || ctx().bank.cats.find(x => x.id === id);
    return c ? c.emoji + ' ' + pick(c.name) : id;
  };
  const blocked = isFinal && !plan.rep;
  return React.createElement(Sheet, {
    onClose: onClose
  }, React.createElement("div", {
    className: "stack wrongsheet"
  }, React.createElement("h2", {
    className: "display",
    style: {
      fontSize: 28
    }
  }, "\u26A0 ", t('wrongTitle')), React.createElement("div", {
    className: "card wq"
  }, React.createElement("span", {
    className: "small muted"
  }, isFinal ? t('finalWager') : catLabel(cell.cat) + ' · ' + cell.value), React.createElement(Txt, {
    v: q.q,
    as: "p",
    className: "wq-q"
  }), React.createElement("span", {
    className: "small muted"
  }, "\u2192 ", React.createElement(Txt, {
    v: q.a
  }))), React.createElement("span", {
    className: "label"
  }, t('whyWrong')), React.createElement("div", {
    className: "chips"
  }, INVALID_REASONS.map(r => React.createElement("button", {
    key: r,
    className: 'chip' + (reason === r ? ' on' : ''),
    "aria-pressed": reason === r,
    onClick: () => setReason(reason === r ? null : r)
  }, t('reason_' + r)))), React.createElement("input", {
    className: "input",
    dir: "auto",
    maxLength: 300,
    value: note,
    placeholder: t('wrongNote'),
    "aria-label": t('wrongNote'),
    onChange: e => setNote(e.target.value)
  }), React.createElement("div", {
    className: 'card refundbox' + (refunding ? ' on' : '')
  }, refunding ? React.createElement(React.Fragment, null, React.createElement("b", null, t('willRefund')), React.createElement("ul", null, plan.refunds.map((r, i) => {
    const tm = teamById(g, r.team);
    return React.createElement("li", {
      key: i,
      style: tStyle(tm)
    }, React.createElement("span", {
      className: "dot"
    }), " ", React.createElement("span", {
      dir: "auto"
    }, t('refundLine', {
      team: teamName(tm),
      d: fmtDelta(r.delta)
    })), " ", React.createElement("span", {
      className: "muted num",
      dir: "ltr"
    }, "(", tm.score, " \u2192 ", tm.score + r.delta, ")"));
  }))) : React.createElement("span", null, t('noRefund'))), plan.rep ? isFinal ? React.createElement("p", {
    className: "repline"
  }, "\uD83D\uDD01 ", t(plan.rep.how === 'same' ? 'repFinalSame' : 'repFinalOther', {
    cat: catLabel(plan.rep.q.cat)
  })) : React.createElement(React.Fragment, null, React.createElement(Toggle, {
    on: useRep,
    onChange: setUseRep,
    title: t(plan.rep.how === 'same' ? 'repSame' : 'repOther', {
      cat: catLabel(plan.rep.q.cat)
    }),
    sub: useRep ? g.current && g.current.cell === where ? t('repNow') : t('repBoard') : t('repEmpty')
  })) : React.createElement("p", {
    className: "hint",
    style: {
      margin: 0
    }
  }, blocked ? t('repFinalNone') : plan.canRep ? t('repNone') : t('repPlayedOnly')), React.createElement("div", {
    className: "row"
  }, React.createElement("button", {
    className: "btn btn-ghost grow",
    onClick: onClose
  }, t('cancel')), React.createElement("button", {
    className: "btn btn-flag solid grow",
    disabled: busy || blocked,
    onClick: go
  }, refunding ? t('reverseIt') : t('removeIt')))));
}
function PlayedList({
  g,
  onPick,
  onClose
}) {
  const order = {};
  g.log.forEach((e, i) => {
    if (e.kind === 'clue' && !e.void) order[e.cell] = i;
  });
  const played = (g.boards || []).flatMap(b => b.cells).filter(c => c.status === 'done' && c.q && !isInvalidated(g, c.q.id)).sort((a, b) => (order[b.id] || 0) - (order[a.id] || 0));
  const finalOk = g.phase === 'final' && g.final && g.final.q && ['clue', 'judge', 'done'].includes(g.final.stage);
  return React.createElement(Sheet, {
    onClose: onClose
  }, React.createElement("div", {
    className: "stack-sm"
  }, React.createElement("h2", {
    className: "display",
    style: {
      fontSize: 28
    }
  }, "\u26A0 ", t('flagPlayed')), React.createElement("p", {
    className: "hint",
    style: {
      margin: 0
    }
  }, t('flagPlayedSub')), finalOk && React.createElement("button", {
    className: "optrow played",
    onClick: () => onPick('final')
  }, React.createElement("span", {
    className: "pl-v"
  }, "\u2605"), React.createElement("span", {
    className: "grow"
  }, React.createElement("span", {
    className: "small muted"
  }, t('finalWager')), React.createElement(Txt, {
    v: g.final.q.q,
    as: "span",
    className: "pl-q"
  }))), !played.length && !finalOk && React.createElement("p", {
    className: "hint center"
  }, t('noPlayed')), played.map(c => {
    const tm = c.result && c.result.team ? teamById(g, c.result.team) : null;
    const cat = catById(g, c.cat);
    return React.createElement("button", {
      key: c.id,
      className: "optrow played",
      onClick: () => onPick(c.id)
    }, React.createElement("span", {
      className: "pl-v num"
    }, c.value), React.createElement("span", {
      className: "grow"
    }, React.createElement("span", {
      className: "small muted"
    }, cat ? cat.emoji + ' ' + pick(cat.name) : c.cat, tm ? ' · ' + teamName(tm) : ''), React.createElement(Txt, {
      v: c.q.q,
      as: "span",
      className: "pl-q"
    })));
  }), React.createElement("button", {
    className: "btn btn-ghost",
    onClick: onClose
  }, t('close'))));
}
const ISSUES_MAX = 500;
function issueEntry(g, info) {
  const q = info.q;
  return {
    id: uid(),
    at: info.rec.now,
    gameId: g.id,
    qid: q.id,
    cat: q.cat,
    tier: q.tier,
    value: info.value,
    where: info.where === 'final' ? 'final' : 'board',
    q: q.q,
    a: q.a,
    ref: q.ref || null,
    reason: info.rec.reason,
    note: info.rec.note || '',
    refunds: info.refunds
  };
}
function addIssue(list, entry) {
  if ((list || []).some(x => x.gameId === entry.gameId && x.qid === entry.qid)) return list;
  return [entry, ...(list || [])].slice(0, ISSUES_MAX);
}
const TV_CHANNEL = 'jeopardy-board-tv';
const tvUrl = () => location.origin + location.pathname + '#tv';
const canChannel = () => typeof window !== 'undefined' && 'BroadcastChannel' in window;
function goFullscreen() {
  try {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(() => {});
  } catch (e) {}
}
const hideAnswer = q => q ? {
  id: q.id,
  q: q.q,
  a: null,
  alt: null,
  note: null,
  ref: null
} : q;
function tvGame(g) {
  if (!g) return null;
  const {
    history,
    invalid,
    ...rest
  } = g;
  const cur = g.current;
  const boards = (g.boards || []).map(b => ({
    ...b,
    cells: b.cells.map(c => {
      const isCur = cur && cur.cell === c.id;
      const {
        q,
        wager,
        ...cell
      } = c;
      if (!isCur) return {
        ...cell,
        q: null,
        wager: 0
      };
      const showText = !(cur.wager && cur.stage === 'wager');
      return {
        ...cell,
        wager,
        q: !showText ? null : cur.stage === 'reveal' ? q : hideAnswer(q)
      };
    })
  }));
  let final = null;
  if (g.final) {
    const f = g.final;
    const showClue = f.stage === 'clue' || f.stage === 'judge' || f.stage === 'done';
    const wagers = {};
    const locked = {};
    Object.keys(f.wagers || {}).forEach(id => {
      locked[id] = true;
      if (f.judged && f.judged[id]) wagers[id] = f.wagers[id];
    });
    final = {
      ...f,
      q: g.phase !== 'final' ? null : !showClue ? null : f.stage === 'done' ? f.q : hideAnswer(f.q),
      wagers,
      locked
    };
  }
  return {
    ...rest,
    boards,
    final
  };
}
function TvButton({
  onTv
}) {
  if (!onTv) return React.createElement("span", {
    className: "iconspace"
  });
  return React.createElement("button", {
    className: "iconbtn tvbtn",
    onClick: onTv,
    "aria-label": t('tvMode'),
    title: t('tvMode')
  }, "\uD83D\uDCFA");
}
function TvSheet({
  onClose,
  onHere
}) {
  const [msg, setMsg] = useState('');
  const newWindow = () => {
    if (!canChannel()) {
      setMsg(t('tvNoChannel'));
      return;
    }
    const w = window.open(tvUrl(), '_blank');
    if (!w) setMsg(t('tvBlocked'));else onClose();
  };
  return React.createElement(Sheet, {
    center: true,
    onClose: onClose
  }, React.createElement("h2", {
    className: "display",
    style: {
      fontSize: 30
    }
  }, "\uD83D\uDCFA ", t('tvMode')), React.createElement("p", {
    className: "hint"
  }, t('tvIntro')), React.createElement("button", {
    className: "btn btn-gold",
    onClick: () => {
      onClose();
      onHere();
    }
  }, t('tvHere')), React.createElement("p", {
    className: "hint",
    style: {
      margin: 0
    }
  }, t('tvHereSub')), React.createElement("button", {
    className: "btn",
    onClick: newWindow
  }, t('tvWindow')), React.createElement("p", {
    className: "hint",
    style: {
      margin: 0
    }
  }, t('tvWindowSub')), React.createElement("p", {
    className: "hint",
    style: {
      margin: 0
    }
  }, t('tvOtherDevice')), msg && React.createElement("p", {
    className: "warn"
  }, msg), React.createElement("button", {
    className: "btn btn-ghost",
    onClick: onClose
  }, t('close')));
}
function TvExit({
  onExit
}) {
  useEffect(() => {
    if (!onExit) return undefined;
    const k = e => {
      if (e.key === 'Escape' && !document.fullscreenElement) onExit();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onExit]);
  return React.createElement("div", {
    className: "tvbar"
  }, React.createElement("button", {
    className: "pillbtn",
    onClick: goFullscreen
  }, "\u26F6 ", t('tvFull')), onExit && React.createElement("button", {
    className: "pillbtn",
    onClick: onExit
  }, backArrow(), " ", t('tvBackToControls')));
}
function TvView({
  g,
  flash,
  onFlashDone
}) {
  let body;
  if (!g) body = React.createElement("div", {
    className: "tv-wait"
  }, React.createElement(LogoMark, {
    size: 120
  }), React.createElement("h2", {
    className: "display"
  }, t('appName')), React.createElement("p", {
    className: "muted"
  }, t('tvWaiting')));else if (g.phase === 'board') {
    const team = pickerTeam(g);
    body = React.createElement(React.Fragment, null, React.createElement(ScoreBar, {
      g: g,
      activeId: team.id,
      label: t('picksShort'),
      big: true
    }), React.createElement("p", {
      className: "turnline",
      style: tStyle(team)
    }, React.createElement("span", null, team.emoji), " ", t('picksNext', {
      team: teamName(team)
    }), " ", React.createElement("span", {
      className: "muted"
    }, " \xB7 ", t('roundN', {
      n: g.round
    }))), React.createElement(BoardGrid, {
      g: g,
      big: true
    }));
  } else if (g.phase === 'clue') {
    const cell = curCell(g);
    const cur = g.current;
    body = React.createElement(React.Fragment, null, React.createElement(ScoreBar, {
      g: g,
      activeId: cur.team,
      big: true
    }), React.createElement("div", {
      className: "tv-q"
    }, React.createElement(ClueHead, {
      g: g,
      cell: cell
    }), React.createElement(ClueStage, {
      g: g
    }), React.createElement(Clock, {
      g: g,
      big: true
    }), cell.q ? React.createElement(ClueCard, {
      q: cell.q,
      big: true,
      showAnswer: cur.stage === 'reveal',
      questionForm: g.rules.questionForm
    }) : React.createElement(RiskSplash, {
      g: g,
      big: true
    }), cur.stage === 'reveal' && React.createElement(ResultBanner, {
      g: g
    })));
  } else if (g.phase === 'between') body = React.createElement(Between, {
    g: g,
    big: true
  });else if (g.phase === 'final') body = React.createElement(FinalTv, {
    g: g
  });else {
    const sorted = [...g.teams].sort((a, b) => b.score - a.score);
    body = React.createElement(React.Fragment, null, React.createElement(Winner, {
      g: g,
      big: true
    }), React.createElement(ScoreBar, {
      g: {
        ...g,
        teams: sorted
      },
      big: true
    }));
  }
  return React.createElement("div", {
    className: "tvmode"
  }, React.createElement("div", {
    className: "tvwrap"
  }, body), flash && React.createElement(Flash, {
    f: flash,
    g: g,
    onDone: onFlashDone
  }));
}
const TV_ID = uid();
const soundAllowed = () => {
  try {
    return !navigator.userActivation || navigator.userActivation.hasBeenActive;
  } catch (e) {
    return true;
  }
};
function LocalTv() {
  const [g, setG] = useState(null);
  const [flash, setFlash] = useState(null);
  const [, setL] = useState(0);
  const [unlocked, setUnlocked] = useState(soundAllowed());
  const [tvPlays, setTvPlays] = useState(true);
  const chRef = useRef(null);
  const playsRef = useRef(true);
  playsRef.current = tvPlays;
  useTicks(g, tvPlays, (n, id) => sound.play(n, id));
  useEffect(() => {
    if (!canChannel()) return undefined;
    const ch = new BroadcastChannel(TV_CHANNEL);
    chRef.current = ch;
    ch.onmessage = e => {
      const m = e.data || {};
      if (m.type === 'game') setG(m.game);else if (m.type === 'flash') setFlash(m.info);else if (m.type === 'host-hello') ch.postMessage({
        type: 'hello',
        tv: TV_ID,
        sound: soundAllowed()
      });else if (m.type === 'sound-cfg') {
        sound.setConfig(m.cfg);
        setTvPlays(m.tvPlays !== false);
      } else if (m.type === 'sfx' && playsRef.current) sound.play(m.name, m.id);else if (m.type === 'lang') {
        setLang(m.lang);
        applyDocLang(m.lang);
        setL(x => x + 1);
      }
    };
    ch.postMessage({
      type: 'hello',
      tv: TV_ID
    });
    const ping = setInterval(() => {
      try {
        ch.postMessage({
          type: 'ping',
          tv: TV_ID,
          sound: soundAllowed()
        });
      } catch (e) {}
    }, 2500);
    const bye = () => {
      try {
        ch.postMessage({
          type: 'bye',
          tv: TV_ID
        });
      } catch (e) {}
    };
    window.addEventListener('beforeunload', bye);
    return () => {
      clearInterval(ping);
      bye();
      window.removeEventListener('beforeunload', bye);
      ch.close();
    };
  }, []);
  if (!canChannel()) return React.createElement("div", {
    className: "app"
  }, React.createElement("div", {
    className: "card stack"
  }, React.createElement("p", {
    className: "hint",
    style: {
      margin: 0
    }
  }, t('tvNoChannel'))));
  return React.createElement(React.Fragment, null, React.createElement(TvView, {
    g: g,
    flash: flash,
    onFlashDone: () => setFlash(null)
  }), !unlocked && React.createElement("button", {
    className: "soundunlock",
    onClick: () => {
      setUnlocked(true);
      sound.unlock();
      try {
        chRef.current.postMessage({
          type: 'ping',
          tv: TV_ID,
          sound: true
        });
      } catch (e) {}
    }
  }, "\uD83D\uDD0A ", t('tvAllowSound')), React.createElement(TvExit, null));
}
function useTvSender(game, settings, soundState) {
  const ch = useRef(null);
  const latest = useRef({
    game,
    settings,
    soundState
  });
  latest.current = {
    game,
    settings,
    soundState
  };
  const [tvs, setTvs] = useState({});
  useEffect(() => {
    if (!canChannel()) return undefined;
    const c = new BroadcastChannel(TV_CHANNEL);
    ch.current = c;
    c.onmessage = e => {
      const m = e.data || {};
      if (m.type === 'hello') {
        c.postMessage({
          type: 'lang',
          lang: latest.current.settings.lang
        });
        c.postMessage({
          type: 'game',
          game: tvGame(latest.current.game)
        });
        if (latest.current.soundState) c.postMessage({
          type: 'sound-cfg',
          ...latest.current.soundState
        });
      }
      if ((m.type === 'hello' || m.type === 'ping') && m.tv) setTvs(x => ({
        ...x,
        [m.tv]: {
          seen: Date.now(),
          sound: m.sound !== false
        }
      }));
      if (m.type === 'bye' && m.tv) setTvs(x => {
        const n = {
          ...x
        };
        delete n[m.tv];
        return n;
      });
    };
    c.postMessage({
      type: 'host-hello'
    });
    const sweep = setInterval(() => setTvs(x => {
      const now = Date.now();
      const n = {};
      let changed = false;
      Object.keys(x).forEach(k => {
        if (now - x[k].seen < 8000) n[k] = x[k];else changed = true;
      });
      return changed ? n : x;
    }), 3000);
    return () => {
      clearInterval(sweep);
      c.close();
      ch.current = null;
    };
  }, []);
  useEffect(() => {
    if (ch.current) ch.current.postMessage({
      type: 'game',
      game: tvGame(game)
    });
  }, [game]);
  useEffect(() => {
    if (ch.current) ch.current.postMessage({
      type: 'lang',
      lang: settings.lang
    });
  }, [settings.lang]);
  useEffect(() => {
    if (ch.current && soundState) ch.current.postMessage({
      type: 'sound-cfg',
      ...soundState
    });
  }, [soundState && JSON.stringify(soundState)]);
  const list = Object.values(tvs);
  return {
    send: info => {
      if (ch.current) ch.current.postMessage({
        type: 'flash',
        info
      });
    },
    sfx: (name, id) => {
      if (ch.current) ch.current.postMessage({
        type: 'sfx',
        name,
        id
      });
    },
    tv: {
      open: list.length > 0,
      sound: list.some(x => x.sound)
    }
  };
}
const SFX = [{
  id: 'countdown-tick',
  en: 'Clock ticks (last 5 s)',
  ar: 'تكتكة الساعة (آخر ٥ ثواني)'
}, {
  id: 'clue-open',
  en: 'A clue opens',
  ar: 'فتح تلميح'
}, {
  id: 'correct',
  en: 'Right answer',
  ar: 'جواب صح',
  voice: 1
}, {
  id: 'wrong',
  en: 'Wrong answer',
  ar: 'جواب غلط',
  voice: 1
}, {
  id: 'risk-it',
  en: 'Risk It square found',
  ar: 'خانة «خاطِر»',
  voice: 1
}, {
  id: 'round-end',
  en: 'End of a round',
  ar: 'نهاية جولة'
}, {
  id: 'final-category',
  en: 'Final Wager category',
  ar: 'فئة الرهان الأخير',
  voice: 1
}, {
  id: 'final-clue',
  en: 'Final clue shown',
  ar: 'عرض التلميح الأخير'
}, {
  id: 'game-intro',
  en: 'Game intro',
  ar: 'بداية اللعبة',
  voice: 1
}, {
  id: 'winner-fanfare',
  en: 'Winner',
  ar: 'الفائز',
  voice: 1
}];
const DEFAULT_SOUND = {
  volume: 0.8,
  muted: false,
  builtin: true,
  files: {}
};
const cleanSound = s => {
  const x = {
    ...DEFAULT_SOUND,
    ...(s || {})
  };
  x.volume = clamp(+x.volume || 0, 0, 1);
  x.muted = !!x.muted;
  x.builtin = x.builtin !== false;
  x.files = x.files && typeof x.files === 'object' ? x.files : {};
  return x;
};
const SOUND_MAX_BYTES = 3 * 1024 * 1024,
  SOUND_MAX_SECONDS = 20;
const REPO_SOUNDS = typeof SOUND_FILES !== 'undefined' && SOUND_FILES || {};
const sound = (() => {
  let ctx = null;
  let master = null;
  let cfg = cleanSound();
  const seen = new Set();
  const seenOrder = [];
  const buffers = new Map();
  const log = [];
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  function ensure() {
    if (!AC) return null;
    if (!ctx) {
      try {
        ctx = new AC();
        master = ctx.createGain();
        master.connect(ctx.destination);
      } catch (e) {
        ctx = null;
        return null;
      }
    }
    master.gain.value = cfg.volume;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  const remember = id => {
    if (!id) return false;
    if (seen.has(id)) return true;
    seen.add(id);
    seenOrder.push(id);
    if (seenOrder.length > 400) seen.delete(seenOrder.shift());
    return false;
  };
  async function bufferFor(src) {
    if (!buffers.has(src)) {
      buffers.set(src, (async () => {
        const c = ensure();
        if (!c) return null;
        try {
          let ab;
          if (isLocalFile(src)) {
            const rec = await fileStore.get(src.slice(4));
            if (!rec || !rec.blob) return null;
            ab = await rec.blob.arrayBuffer();
          } else {
            const r = await fetch(src);
            if (!r.ok) return null;
            ab = await r.arrayBuffer();
          }
          return await new Promise(res => {
            try {
              const p = c.decodeAudioData(ab, res, () => res(null));
              if (p && p.catch) p.catch(() => res(null));
            } catch (e) {
              res(null);
            }
          });
        } catch (e) {
          return null;
        }
      })());
    }
    return buffers.get(src);
  }
  const sourceOf = name => cfg.files[name] ? 'custom' : REPO_SOUNDS[name] ? 'file' : cfg.builtin ? 'builtin' : 'none';
  async function playFile(src) {
    const c = ensure();
    if (!c) return false;
    const b = await bufferFor(src);
    if (!b) return false;
    const n = c.createBufferSource();
    n.buffer = b;
    n.connect(master);
    n.start();
    return true;
  }
  async function playNow(name) {
    const via = sourceOf(name);
    const entry = {
      name,
      via,
      at: Date.now(),
      result: 'pending'
    };
    log.push(entry);
    if (log.length > 200) log.shift();
    let res = 'none';
    try {
      if (via === 'custom' && (await playFile(cfg.files[name]))) res = 'custom';else if ((via === 'custom' || via === 'file') && REPO_SOUNDS[name] && (await playFile(REPO_SOUNDS[name]))) res = 'file';else if (cfg.builtin) {
        const c = ensure();
        if (c) {
          synth(c, master, name);
          res = 'builtin';
        }
      }
    } catch (e) {
      res = 'error';
    }
    entry.result = res;
    return res;
  }
  return {
    play(name, id) {
      if (remember(id)) return false;
      if (cfg.muted || !SFX.some(x => x.id === name)) return false;
      playNow(name);
      return true;
    },
    preview(name) {
      if (!cfg.muted) playNow(name);
    },
    unlock() {
      ensure();
    },
    setConfig(c) {
      const next = cleanSound(c);
      Object.keys(cfg.files).forEach(k => {
        if (cfg.files[k] !== next.files[k]) buffers.delete(cfg.files[k]);
      });
      cfg = next;
      if (master) master.gain.value = cfg.volume;
    },
    get config() {
      return cfg;
    },
    get unlocked() {
      return !!ctx && ctx.state === 'running';
    },
    sourceOf,
    log,
    reset() {
      seen.clear();
      seenOrder.length = 0;
      log.length = 0;
    }
  };
})();
function synth(c, out, name) {
  const t0 = c.currentTime + 0.01;
  const tone = (f, at, dur, {
    type = 'sine',
    vol = 0.35,
    f2 = null,
    attack = 0.01
  } = {}) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, at);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, at + dur);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g);
    g.connect(out);
    o.start(at);
    o.stop(at + dur + 0.05);
  };
  const seq = (notes, step, opts) => notes.forEach((f, i) => tone(f, t0 + i * step, opts && opts.dur ? opts.dur : step * 1.6, opts));
  switch (name) {
    case 'countdown-tick':
      tone(1400, t0, 0.05, {
        type: 'square',
        vol: 0.16,
        attack: 0.002
      });
      break;
    case 'clue-open':
      tone(660, t0, 0.12, {
        type: 'triangle',
        vol: 0.22
      });
      tone(990, t0 + 0.08, 0.2, {
        type: 'triangle',
        vol: 0.2
      });
      break;
    case 'correct':
      seq([659, 880, 1175], 0.08, {
        type: 'triangle',
        vol: 0.32,
        dur: 0.3
      });
      break;
    case 'wrong':
      tone(240, t0, 0.32, {
        type: 'square',
        vol: 0.12,
        f2: 160
      });
      break;
    case 'risk-it':
      [0, 0.12, 0.24, 0.36].forEach((d, i) => tone(523 * Math.pow(1.26, i), t0 + d, 0.16, {
        type: 'sawtooth',
        vol: 0.12
      }));
      tone(1047, t0 + 0.5, 0.7, {
        type: 'triangle',
        vol: 0.25
      });
      break;
    case 'round-end':
      seq([784, 659, 523], 0.14, {
        type: 'triangle',
        vol: 0.25,
        dur: 0.3
      });
      tone(392, t0 + 0.42, 0.6, {
        vol: 0.2
      });
      break;
    case 'final-category':
      tone(196, t0, 0.9, {
        type: 'triangle',
        vol: 0.25
      });
      tone(294, t0 + 0.25, 0.9, {
        type: 'triangle',
        vol: 0.2
      });
      tone(392, t0 + 0.5, 1.1, {
        type: 'triangle',
        vol: 0.22
      });
      break;
    case 'final-clue':
      tone(880, t0, 0.25, {
        vol: 0.2
      });
      tone(1320, t0 + 0.2, 0.4, {
        vol: 0.18
      });
      break;
    case 'game-intro':
      [[440, 0], [554, 0.14], [659, 0.28], [880, 0.42]].forEach(([f, d], i) => tone(f, t0 + d, i === 3 ? 0.8 : 0.16, {
        type: 'triangle',
        vol: 0.22
      }));
      break;
    case 'winner-fanfare':
      [[523, 0], [659, 0.15], [784, 0.3], [1047, 0.45], [880, 0.75], [1047, 0.9]].forEach(([f, d], i) => tone(f, t0 + d, i === 5 ? 1.3 : 0.22, {
        type: 'triangle',
        vol: 0.22
      }));
      tone(523, t0 + 0.9, 1.3, {
        vol: 0.15
      });
      break;
    default:
      break;
  }
}
function soundEvents(prev, next) {
  if (!next) return [];
  if (!prev || prev.id !== next.id) return next.log.length === 0 && next.phase === 'board' && !next.current ? ['game-intro'] : [];
  if ((next.history || []).length < (prev.history || []).length) return [];
  const out = [];
  const pc = prev.current,
    nc = next.current;
  if (nc && (!pc || pc.cell !== nc.cell)) out.push(nc.wager ? 'risk-it' : 'clue-open');
  if (nc && pc && pc.cell === nc.cell) {
    if (nc.changes.length > pc.changes.length) out.push(nc.changes[nc.changes.length - 1].delta > 0 ? 'correct' : 'wrong');else if (nc.tried.length > pc.tried.length) out.push('wrong');
  }
  if (next.phase === 'between' && prev.phase !== 'between') out.push('round-end');
  if (next.phase === 'final' && prev.phase !== 'final') out.push('final-category');
  if (next.phase === 'final' && next.final && prev.final) {
    if (next.final.stage === 'clue' && prev.final.stage !== 'clue') out.push('final-clue');
    const pj = Object.keys(prev.final.judged || {}).length;
    const nj = Object.keys(next.final.judged || {});
    if (nj.length > pj) {
      const last = next.final.judged[next.final.order.find(id => next.final.judged[id] && !(prev.final.judged || {})[id])];
      if (last) out.push(last.right ? 'correct' : 'wrong');
    }
  }
  if (next.phase === 'done' && prev.phase !== 'done') out.push('winner-fanfare');
  return out;
}
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
  const last = useRef(null);
  const latest = useRef(g);
  latest.current = g;
  useEffect(() => {
    if (!enabled) return undefined;
    const id = setInterval(() => {
      const k = tickKey(latest.current, Date.now());
      if (k && k !== last.current) {
        last.current = k;
        play('countdown-tick', 'tick:' + k);
      }
    }, ms(100));
    return () => clearInterval(id);
  }, [enabled]);
}
function SettingsScreen({
  settings,
  setSettings,
  state,
  onRestore,
  onClearAll,
  onBack,
  bank,
  qhist,
  onResetHistory,
  issues,
  onClearIssues
}) {
  const [ask, setAsk] = useState(null);
  const [msg, setMsg] = useState(null);
  const fileRef = useRef(null);
  const set = (k, v) => setSettings({
    ...settings,
    [k]: v
  });
  const exportIt = () => downloadBlob(new Blob([JSON.stringify(makeBackup(state), null, 1)], {
    type: 'application/json'
  }), 'jeopardy-board-backup-' + todayStamp() + '.json');
  const readFile = file => {
    if (!file) return;
    const r = new FileReader();
    r.onerror = () => setMsg({
      text: t('bkUnreadable')
    });
    r.onload = () => {
      let obj = null;
      try {
        obj = JSON.parse(r.result);
      } catch (e) {
        setMsg({
          text: t('bkUnreadable')
        });
        return;
      }
      const v = validateBackup(obj);
      if (!v.ok) {
        setMsg({
          text: t(v.error)
        });
        return;
      }
      setAsk({
        kind: 'import',
        v
      });
    };
    r.readAsText(file);
  };
  const backendName = {
    indexeddb: 'IndexedDB',
    localStorage: 'localStorage',
    memory: LANG === 'ar' ? 'الذاكرة فقط' : 'memory only'
  }[store.backend];
  return React.createElement("div", {
    className: "app"
  }, React.createElement(TopBar, {
    onBack: onBack,
    title: t('settings')
  }), React.createElement("section", {
    className: "card stack"
  }, React.createElement("div", {
    className: "field"
  }, React.createElement("span", {
    className: "label"
  }, t('language')), React.createElement(Seg, {
    value: settings.lang,
    options: [['ar', 'العربية'], ['en', 'English']],
    onChange: v => set('lang', v),
    label: t('language')
  })), React.createElement("div", {
    className: "field"
  }, React.createElement("span", {
    className: "label"
  }, t('qLang')), React.createElement(Seg, {
    value: settings.qLang,
    options: [['auto', t('qLangAuto')], ['both', t('qLangBoth')]],
    onChange: v => set('qLang', v),
    label: t('qLang')
  }), React.createElement("p", {
    className: "hint"
  }, t('qLangSub'))), React.createElement(Toggle, {
    on: settings.hostPeek !== false,
    onChange: v => set('hostPeek', v),
    title: t('hostPeek'),
    sub: t('hostPeekSub')
  }), React.createElement("div", {
    className: "field"
  }, React.createElement("span", {
    className: "label"
  }, t('motion')), React.createElement(Seg, {
    value: settings.motion,
    options: [['system', t('motionSystem')], ['full', t('motionFull')], ['reduce', t('motionReduce')]],
    onChange: v => set('motion', v),
    label: t('motion')
  })), React.createElement("div", {
    className: "field"
  }, React.createElement("span", {
    className: "label"
  }, t('tvZoom')), React.createElement(Seg, {
    value: settings.tvZoom,
    options: [[0.85, 'S'], [1, 'M'], [1.2, 'L'], [1.4, 'XL']],
    onChange: v => set('tvZoom', v),
    label: t('tvZoom')
  }))), React.createElement(SoundSettings, {
    settings: settings,
    setSettings: setSettings
  }), bank && React.createElement("section", {
    className: "card stack"
  }, React.createElement("h3", null, t('qbank')), React.createElement("p", {
    className: "hint"
  }, t('bankNote', {
    q: bank.total,
    c: bank.cats.length
  })), React.createElement("p", {
    className: "hint"
  }, t('historySub', {
    n: Object.keys(qhist && qhist.seen || {}).length,
    g: qhist && qhist.n || 0
  })), React.createElement("button", {
    className: "btn",
    disabled: !qhist || !Object.keys(qhist.seen || {}).length,
    onClick: () => setAsk({
      kind: 'hist'
    })
  }, t('resetHistory'))), React.createElement("section", {
    className: "card stack"
  }, React.createElement("h3", null, "\u26A0 ", t('issues')), React.createElement("p", {
    className: "hint"
  }, t('issuesSub'), " ", React.createElement("b", null, t('issuesN', {
    n: issues.length
  }))), React.createElement(Toggle, {
    on: settings.skipReported !== false,
    onChange: v => set('skipReported', v),
    title: t('skipReported')
  }), issues.length > 0 ? React.createElement("details", {
    className: "issuelist"
  }, React.createElement("summary", {
    className: "label"
  }, t('issuesN', {
    n: issues.length
  })), React.createElement("ol", null, issues.slice(0, 100).map(x => {
    const c = bank && bank.cats.find(k => k.id === x.cat);
    return React.createElement("li", {
      key: x.id
    }, React.createElement("span", {
      className: "muted small"
    }, c ? c.emoji + ' ' + pick(c.name) : x.cat, x.value ? ' · ' + x.value : '', " \xB7 ", t('reason_' + (x.reason || 'other')), x.note ? ' · ' : ''), x.note ? React.createElement("bdi", {
      dir: "auto",
      className: "small"
    }, x.note) : null, React.createElement(Txt, {
      v: x.q,
      as: "span",
      className: "iq"
    }), React.createElement("span", {
      className: "small muted"
    }, " \u2192 ", React.createElement(Txt, {
      v: x.a
    })));
  }))) : React.createElement("p", {
    className: "hint"
  }, t('issuesNone')), React.createElement("div", {
    className: "row"
  }, React.createElement("button", {
    className: "btn grow",
    disabled: !issues.length,
    onClick: () => downloadBlob(new Blob([JSON.stringify({
      app: BACKUP_APP,
      kind: 'reported-clues',
      exportedAt: new Date().toISOString(),
      issues
    }, null, 1)], {
      type: 'application/json'
    }), 'jeopardy-board-reported-' + todayStamp() + '.json')
  }, "\u2B07 ", t('exportIssues')), React.createElement("button", {
    className: "btn btn-ghost grow",
    disabled: !issues.length,
    onClick: () => setAsk({
      kind: 'issues'
    })
  }, t('clearIssues')))), React.createElement("section", {
    className: "card stack"
  }, React.createElement("h3", null, t('backup')), React.createElement("p", {
    className: "hint"
  }, t('backupSub')), React.createElement("div", {
    className: "row"
  }, React.createElement("button", {
    className: "btn grow",
    onClick: exportIt
  }, "\u2B07 ", t('exportBackup')), React.createElement("button", {
    className: "btn grow",
    onClick: () => fileRef.current && fileRef.current.click()
  }, "\u2B06 ", t('importBackup'))), React.createElement("input", {
    ref: fileRef,
    type: "file",
    accept: "application/json,.json",
    hidden: true,
    onChange: e => {
      readFile(e.target.files[0]);
      e.target.value = '';
    }
  })), React.createElement("section", {
    className: "card stack"
  }, React.createElement("h3", null, t('storage')), React.createElement("p", {
    className: "hint"
  }, t('storageWhere', {
    b: backendName
  })), isIOS() && React.createElement("p", {
    className: "hint"
  }, t('installIos')), React.createElement("button", {
    className: "btn btn-danger",
    onClick: () => setAsk({
      kind: 'clear'
    })
  }, t('clearAll'))), React.createElement("details", {
    className: "card"
  }, React.createElement("summary", {
    className: "label"
  }, t('credits')), React.createElement("p", {
    className: "hint"
  }, t('creditsBody'))), React.createElement("p", {
    className: "exportfoot"
  }, t('version', {
    v: APP_VERSION
  })), ask && ask.kind === 'import' && React.createElement(Confirm, {
    title: t('importQ'),
    body: t('importBody', {
      past: ask.v.summary.past,
      cur: ask.v.summary.current ? t('importCur') : '',
      date: (ask.v.summary.exportedAt || '').slice(0, 10)
    }),
    yes: t('importBackup'),
    onYes: () => {
      onRestore(ask.v.data);
      setMsg({
        text: t('restored'),
        ok: true
      });
    },
    onClose: () => setAsk(null)
  }), ask && ask.kind === 'hist' && React.createElement(Confirm, {
    title: t('resetHistoryQ'),
    body: t('resetHistoryBody'),
    yes: t('resetHistory'),
    onYes: onResetHistory,
    onClose: () => setAsk(null)
  }), ask && ask.kind === 'issues' && React.createElement(Confirm, {
    title: t('clearIssuesQ'),
    body: t('clearIssuesBody'),
    yes: t('clearIssues'),
    onYes: onClearIssues,
    onClose: () => setAsk(null)
  }), ask && ask.kind === 'clear' && React.createElement(Confirm, {
    title: t('clearAllQ'),
    body: t('clearAllBody'),
    yes: t('deleteIt'),
    danger: true,
    onYes: onClearAll,
    onClose: () => setAsk(null)
  }), msg && React.createElement(Toast, {
    msg: msg.text,
    ok: msg.ok,
    onClose: () => setMsg(null)
  }));
}
function SoundSettings({
  settings,
  setSettings
}) {
  const cfg = cleanSound(settings.sound);
  const setCfg = patch => setSettings({
    ...settings,
    sound: cleanSound({
      ...cfg,
      ...patch
    })
  });
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);
  const fileRef = useRef(null);
  const target = useRef(null);
  const upload = async (name, file) => {
    if (!file) return;
    setBusy(name);
    setMsg(null);
    try {
      if (file.size > SOUND_MAX_BYTES) throw new Error('sndTooBig');
      const len = await checkAudio(file);
      if (len > SOUND_MAX_SECONDS) throw new Error('sndTooLong');
      const id = await fileStore.put({
        blob: file,
        size: file.size,
        at: Date.now()
      });
      const old = cfg.files[name];
      setCfg({
        files: {
          ...cfg.files,
          [name]: 'idb:' + id
        }
      });
      if (isLocalFile(old)) fileStore.del(old.slice(4));
      setMsg({
        text: t('sndSaved'),
        ok: true
      });
    } catch (e) {
      setMsg({
        text: t(/quota/i.test(e.message) ? 'storeFull' : S[e.message] ? e.message : 'sndUnsupported')
      });
    }
    setBusy(null);
  };
  const remove = name => {
    const old = cfg.files[name];
    const files = {
      ...cfg.files
    };
    delete files[name];
    setCfg({
      files
    });
    if (isLocalFile(old)) fileStore.del(old.slice(4));
  };
  const SRC = {
    custom: 'sndSrcCustom',
    file: 'sndSrcFile',
    builtin: 'sndSrcBuiltin',
    none: 'sndSrcNone'
  };
  const srcOf = name => cfg.files[name] ? 'custom' : REPO_SOUNDS[name] ? 'file' : cfg.builtin ? 'builtin' : 'none';
  return React.createElement("section", {
    className: "card stack soundset"
  }, React.createElement("h3", null, "\uD83D\uDD0A ", t('sndTitle')), React.createElement("button", {
    className: 'btn ' + (cfg.muted ? 'btn-danger' : 'btn-gold'),
    "aria-pressed": cfg.muted,
    onClick: () => setCfg({
      muted: !cfg.muted
    })
  }, cfg.muted ? '🔇 ' + t('sndMutedTap') : '🔊 ' + t('sndOnTap')), React.createElement("label", {
    className: "vol"
  }, React.createElement("span", {
    "aria-hidden": "true"
  }, "\uD83D\uDD08"), React.createElement("input", {
    type: "range",
    min: "0",
    max: "1",
    step: "0.05",
    value: cfg.volume,
    "aria-label": t('sndVolume'),
    onChange: e => setCfg({
      volume: +e.target.value
    })
  }), React.createElement("span", {
    "aria-hidden": "true"
  }, "\uD83D\uDD0A"), React.createElement("b", {
    className: "num"
  }, Math.round(cfg.volume * 100), "%")), React.createElement(Toggle, {
    on: cfg.builtin,
    onChange: v => setCfg({
      builtin: v
    }),
    title: t('sndBuiltin'),
    sub: t('sndBuiltinSub')
  }), React.createElement("button", {
    className: "btn btn-sm",
    onClick: () => {
      sound.unlock();
      sound.preview('correct');
    }
  }, "\u25B6 ", t('sndTest')), React.createElement("p", {
    className: "hint",
    style: {
      margin: 0
    }
  }, t('sndWhere')), React.createElement("details", {
    className: "sndlist"
  }, React.createElement("summary", {
    className: "label"
  }, t('sndEvents')), React.createElement("p", {
    className: "hint"
  }, t('sndEventsSub')), React.createElement("ul", null, SFX.map(x => {
    const src = srcOf(x.id);
    return React.createElement("li", {
      key: x.id,
      className: "sndrow"
    }, React.createElement("span", {
      className: "grow"
    }, React.createElement("b", null, pick({
      en: x.en,
      ar: x.ar
    })), x.voice ? React.createElement("span", {
      className: "voicetag"
    }, "\uD83C\uDF99\uFE0F ", t('sndVoiceIdea')) : null, React.createElement("small", {
      className: 'muted src-' + src
    }, t(SRC[src]), src === 'file' ? ' (' + REPO_SOUNDS[x.id] + ')' : '')), React.createElement("button", {
      className: "mini",
      "aria-label": t('sndPreview') + ': ' + x.en,
      disabled: src === 'none',
      onClick: () => {
        sound.unlock();
        sound.preview(x.id);
      }
    }, "\u25B6"), React.createElement("button", {
      className: "btn btn-sm",
      disabled: busy === x.id,
      onClick: () => {
        target.current = x.id;
        fileRef.current.click();
      }
    }, cfg.files[x.id] ? t('sndReplace') : t('sndUpload')), cfg.files[x.id] && React.createElement("button", {
      className: "btn btn-sm btn-ghost",
      onClick: () => remove(x.id)
    }, t('sndRemove')));
  }))), React.createElement("input", {
    ref: fileRef,
    type: "file",
    accept: "audio/*,.mp3,.m4a,.wav,.ogg",
    hidden: true,
    onChange: e => {
      upload(target.current, e.target.files[0]);
      e.target.value = '';
    }
  }), React.createElement("p", {
    className: "hint",
    style: {
      margin: 0
    }
  }, t('sndStorage')), msg && React.createElement(Toast, {
    msg: msg.text,
    ok: msg.ok,
    onClose: () => setMsg(null)
  }));
}
const deviceLang = () => {
  try {
    return /^ar\b/i.test(navigator.languages && navigator.languages[0] || navigator.language || '') ? 'ar' : 'en';
  } catch (e) {
    return 'en';
  }
};
const DEFAULT_SETTINGS = {
  lang: deviceLang(),
  qLang: 'auto',
  motion: 'system',
  tvZoom: 1,
  rules: null,
  lastTeams: null,
  skipReported: true,
  hostPeek: true,
  sound: DEFAULT_SOUND
};
function applyDocLang(lang) {
  const el = document.documentElement;
  el.setAttribute('lang', lang === 'en' ? 'en' : 'ar');
  el.setAttribute('dir', lang === 'en' ? 'ltr' : 'rtl');
}
const SESSION_ID = Math.random().toString(36).slice(2, 8);
const BASE_BANK = typeof window !== 'undefined' ? window.JB_BANK : null;
function App() {
  const [ready, setReady] = useState(false);
  const [settings, setSettingsRaw] = useState(DEFAULT_SETTINGS);
  const [game, setGameRaw] = useState(null);
  const [past, setPast] = useState([]);
  const [qhist, setQhistRaw] = useState(emptyHistory());
  const histRef = useRef(qhist);
  histRef.current = qhist;
  const setQhist = h => {
    histRef.current = h;
    setQhistRaw(h);
    store.set(K.history, h);
  };
  const [screen, setScreen] = useState('home');
  const [flash, setFlash] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [tvHere, setTvHere] = useState(false);
  const [toast, setToast] = useState(null);
  const [wrongAt, setWrongAt] = useState(null);
  const [playedList, setPlayedList] = useState(false);
  const BANK = useMemo(() => indexBank(BASE_BANK), []);
  const [issues, setIssuesRaw] = useState([]);
  const issuesRef = useRef(issues);
  issuesRef.current = issues;
  const setIssues = l => {
    issuesRef.current = l;
    setIssuesRaw(l);
    store.set(K.issues, l);
  };
  const tvRoute = typeof location !== 'undefined' && /^#tv\b/.test(location.hash);
  useEffect(() => {
    store.onError = key => setToast({
      text: t(key)
    });
    store.init().then(() => {
      const s = {
        ...DEFAULT_SETTINGS,
        ...store.get(K.settings, {})
      };
      setLang(s.lang);
      setSettingsRaw(s);
      const cur = store.get(K.current, null);
      if (cur && Array.isArray(cur.teams) && Array.isArray(cur.boards)) setGameRaw(cur);
      setPast(store.get(K.past, []));
      const h = store.get(K.history, null);
      if (h && h.seen) {
        const hh = {
          cats: {},
          ...h
        };
        histRef.current = hh;
        setQhistRaw(hh);
      }
      const iss = store.get(K.issues, []);
      if (Array.isArray(iss)) {
        issuesRef.current = iss;
        setIssuesRaw(iss);
      }
      setReady(true);
    });
  }, []);
  useEffect(() => {
    setLang(settings.lang);
    applyDocLang(settings.lang);
    document.documentElement.setAttribute('data-motion', settings.motion || 'system');
    document.documentElement.style.setProperty('--tvzoom', String(settings.tvZoom || 1));
  }, [settings.lang, settings.motion, settings.tvZoom]);
  const latestSettings = useRef(settings);
  latestSettings.current = settings;
  const setSettings = s => {
    setLang(s.lang);
    setSettingsRaw(s);
    store.set(K.settings, s);
  };
  const sfxSeq = useRef(0);
  const emitSfx = names => names.forEach(name => {
    const id = SESSION_ID + ':' + ++sfxSeq.current;
    const o = outRef.current;
    if (o.here) sound.play(name, id);else o.tv.sfx(name, id);
  });
  const setGame = next => {
    setGameRaw(prev => {
      const g = typeof next === 'function' ? next(prev) : next;
      if (g !== prev) {
        const evs = soundEvents(prev, g);
        if (evs.length) setTimeout(() => emitSfx(evs), 0);
      }
      if (g) store.set(K.current, g);else store.del(K.current);
      const qidOf = x => {
        const c = x && x.current ? curCell(x) : null;
        return c && c.q ? c.q.id : null;
      };
      if (qidOf(g) && qidOf(g) !== qidOf(prev)) setQhist(trimHistory(markSeen(histRef.current, qidOf(g), g.gameNo)));
      if (g && g.phase === 'final' && g.final && g.final.q && g.final.stage === 'clue' && !(prev && prev.final && prev.final.stage === 'clue' && prev.final.q === g.final.q)) setQhist(markSeen(histRef.current, g.final.q.id, g.gameNo));
      if (g && g.phase === 'done' && (!prev || prev !== g)) {
        setPast(p => {
          const list = [pastEntry(g), ...p.filter(x => x.id !== g.id)].slice(0, 30);
          store.set(K.past, list);
          return list;
        });
      }
      return g;
    });
  };
  const act = fn => setGame(g => g ? fn(g) : g);
  const reportedIds = () => latestSettings.current.skipReported !== false ? issuesRef.current.map(x => x.qid) : [];
  const ctx = () => ({
    bank: BANK,
    recent: histRef.current.seen,
    catSeen: histRef.current.cats,
    rand: Math.random,
    exclude: reportedIds(),
    used: reportedIds()
  });
  const soundCfg = cleanSound(settings.sound);
  const tvLink = useTvSender(game, settings, {
    cfg: soundCfg,
    tvPlays: true
  });
  const sendTv = tvLink.send;
  const outputHere = !tvLink.tv.open;
  const outRef = useRef({
    here: outputHere,
    tv: tvLink
  });
  outRef.current = {
    here: outputHere,
    tv: tvLink
  };
  useEffect(() => {
    sound.setConfig(soundCfg);
  }, [JSON.stringify(soundCfg)]);
  useEffect(() => {
    const u = () => sound.unlock();
    window.addEventListener('pointerdown', u);
    window.addEventListener('keydown', u);
    return () => {
      window.removeEventListener('pointerdown', u);
      window.removeEventListener('keydown', u);
    };
  }, []);
  useTicks(game, outputHere && !tvRoute && screen === 'game', (n, id) => sound.play(n, id));
  const doFlash = info => {
    setFlash(info);
    sendTv(info);
  };
  const curId = game && game.current ? game.current.cell : null;
  const prevCur = useRef(curId);
  useEffect(() => {
    if (curId && curId !== prevCur.current && game.current.wager && game.current.stage === 'wager') doFlash({
      kind: 'risk',
      team: game.current.team
    });
    prevCur.current = curId;
  }, [curId]);
  if (tvRoute) return React.createElement(QLangCtx.Provider, {
    value: settings.qLang
  }, ready ? React.createElement(LocalTv, null) : null);
  if (!ready) return React.createElement("div", {
    className: "boot"
  }, React.createElement("div", null, "JEOPARDY-BOARD", React.createElement("small", null, "GAME NIGHT")));
  const startNew = (teams, rules) => {
    setSettings({
      ...settings,
      rules,
      lastTeams: teams
    });
    const gameNo = startGameNo(histRef.current);
    const g = createGame(teams, rules, {
      ...ctx(),
      gameNo
    }, Date.now());
    setQhist(markCatsUsed(histRef.current, gameCatIds(g), gameNo));
    setGame(g);
    setScreen('game');
  };
  const goHome = () => {
    setTvHere(false);
    setScreen('home');
  };
  const playAgain = () => {
    startNew(game.teams.map(({
      name,
      color,
      emoji
    }) => ({
      name,
      color,
      emoji
    })), game.rules);
  };
  const restore = d => {
    const s = {
      ...DEFAULT_SETTINGS,
      ...(d.settings || {})
    };
    setSettings(s);
    setGame(d.current || null);
    setPast(d.past || []);
    store.set(K.past, d.past || []);
    setIssues(Array.isArray(d.issues) ? d.issues : []);
    if (d.history) setQhist({
      cats: {},
      ...d.history
    });
  };
  const clearAll = () => {
    Object.values(K).forEach(k => store.del(k));
    setSettingsRaw(DEFAULT_SETTINGS);
    setLang(DEFAULT_SETTINGS.lang);
    setGameRaw(null);
    setPast([]);
    cleanFiles({}).catch(() => {});
    issuesRef.current = [];
    setIssuesRaw([]);
    histRef.current = emptyHistory();
    setQhistRaw(emptyHistory());
    setScreen('home');
  };
  const onWrongDone = info => {
    setIssues(addIssue(issuesRef.current, issueEntry(game, info)));
    setToast({
      text: info.refunded ? t('wrongDoneRefund') : t('wrongDone'),
      ok: true
    });
    sendTv({
      kind: 'invalid'
    });
  };
  let view;
  if (screen === 'settings') view = React.createElement(SettingsScreen, {
    settings: settings,
    setSettings: setSettings,
    state: {
      settings,
      game,
      past,
      history: qhist,
      issues
    },
    issues: issues,
    onClearIssues: () => setIssues([]),
    onRestore: restore,
    onClearAll: clearAll,
    bank: BANK,
    qhist: qhist,
    onResetHistory: () => setQhist({
      n: histRef.current.n,
      seen: {},
      cats: {}
    }),
    onBack: () => setScreen('home')
  });else if (screen === 'setup') view = React.createElement(Setup, {
    bank: BANK,
    initial: {
      teams: settings.lastTeams,
      rules: settings.rules
    },
    onBack: () => setScreen('home'),
    onStart: startNew
  });else if (screen === 'game' && game) {
    const common = {
      g: game,
      act,
      onMenu: () => setSheet('menu'),
      onTv: () => setSheet('tv'),
      onWrong: id => setWrongAt(id),
      onFix: () => setSheet('fix'),
      settings,
      setSettings,
      flash: doFlash
    };
    if (tvHere) view = React.createElement(React.Fragment, null, React.createElement(TvView, {
      g: tvGame(game),
      flash: flash,
      onFlashDone: () => setFlash(null)
    }), React.createElement(TvExit, {
      onExit: () => setTvHere(false)
    }));else if (game.phase === 'board') view = React.createElement(Board, common);else if (game.phase === 'clue') view = React.createElement(ClueScreen, common);else if (game.phase === 'between') view = React.createElement(Between, {
      g: game,
      act: act,
      onTv: () => setSheet('tv')
    });else if (game.phase === 'final') view = React.createElement(FinalScreen, common);else view = React.createElement(Results, {
      g: game,
      act: act,
      onHome: goHome,
      onAgain: playAgain,
      onFlagPlayed: () => setPlayedList(true),
      onFix: () => setSheet('fix'),
      onTv: () => setSheet('tv')
    });
  } else view = React.createElement(Home, {
    game: game,
    past: past,
    settings: settings,
    setSettings: setSettings,
    onNew: () => setScreen('setup'),
    onContinue: () => setScreen('game'),
    onHow: () => setSheet('how'),
    onSettings: () => setScreen('settings'),
    bank: BANK
  });
  return React.createElement(QLangCtx.Provider, {
    value: settings.qLang
  }, React.createElement("div", {
    key: settings.lang,
    className: "langroot"
  }, view, flash && !tvHere && screen === 'game' && React.createElement(Flash, {
    f: flash,
    g: game,
    onDone: () => setFlash(null)
  }), sheet === 'menu' && game && React.createElement(GameMenu, {
    g: game,
    act: act,
    onClose: () => setSheet(null),
    onHome: goHome,
    onFix: () => setSheet('fix'),
    onFlagPlayed: () => setPlayedList(true),
    sound: soundCfg,
    onSound: c => setSettings({
      ...settings,
      sound: c
    })
  }), sheet === 'fix' && game && React.createElement(FixScores, {
    g: game,
    act: act,
    onClose: () => setSheet(null)
  }), playedList && game && React.createElement(PlayedList, {
    g: game,
    onClose: () => setPlayedList(false),
    onPick: id => {
      setPlayedList(false);
      setWrongAt(id);
    }
  }), wrongAt && game && React.createElement(WrongSheet, {
    g: game,
    where: wrongAt,
    ctx: ctx,
    act: act,
    onClose: () => setWrongAt(null),
    onDone: onWrongDone
  }), sheet === 'tv' && React.createElement(TvSheet, {
    onClose: () => setSheet(null),
    onHere: () => setTvHere(true)
  }), sheet === 'how' && React.createElement(HowTo, {
    onClose: () => setSheet(null)
  }), toast && React.createElement(Toast, {
    msg: toast.text,
    ok: toast.ok,
    onClose: () => setToast(null)
  })));
}
if (window.__JB_TEST__) window.__JB = {
  store,
  K,
  BANK: indexBank(BASE_BANK),
  indexBank,
  selectGame,
  pickClue,
  usableCats,
  catsNeeded,
  tierCounts,
  ROWS,
  DEFAULT_RULES,
  cleanRules,
  valuesAscending,
  createGame,
  rematch,
  openCell,
  setRiskWager,
  buzzIn,
  markRight,
  markWrong,
  nobody,
  skipClue,
  putBack,
  finishClue,
  endRound,
  nextStage,
  endGame,
  adjustScore,
  undo,
  undoLabel,
  winners,
  gameStats,
  pastEntry,
  timeLeft,
  pauseTimer,
  resumeTimer,
  pickerTeam,
  openCells,
  isBoardDone,
  boardOf,
  cellById,
  curCell,
  curValue,
  maxRiskWager,
  maxFinalWager,
  roundTop,
  lowestFirst,
  finalToWagers,
  setFinalWager,
  clearFinalWager,
  allWagersIn,
  showFinalClue,
  startJudging,
  judgeFinal,
  finalNext,
  finishGame,
  invalidateClue,
  invalidRefunds,
  findReplacement,
  isInvalidated,
  gameUsed,
  gameCatIds,
  tvGame,
  sound,
  soundEvents,
  tickKey,
  cleanSound,
  SFX,
  markSeen,
  markCatsUsed,
  emptyHistory,
  startGameNo,
  trimHistory,
  makeBackup,
  validateBackup,
  addIssue,
  issueEntry,
  t,
  setLang,
  pick,
  S,
  APP_NAME
};
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Boundary, null, React.createElement(App, null)));
})();
