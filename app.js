/* Jeopardy-Board 0fd6fb3bbe — built from src/ by build.js. Edit src/, not this file. */
"use strict";
(function(){
const APP_VERSION = "0fd6fb3bbe";
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
  issues: 'jb_issues_v1',
  packs: 'jb_packs_v1'
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
async function cleanFiles(soundFiles, packs) {
  const snd = soundFiles || ((store.get(K.settings, {}) || {}).sound || {}).files || {};
  const used = new Set(Object.values(snd).filter(isLocalFile).map(s => s.slice(4)));
  packFileIds(packs || store.get(K.packs, [])).forEach(id => used.add(id));
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
      issues: state.issues || [],
      packs: state.packs || []
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
  if (d.packs != null && (!Array.isArray(d.packs) || d.packs.some(p => !p || typeof p.id !== 'string' || !Array.isArray(p.clues) || !Array.isArray(p.categories)))) return {
    ok: false,
    error: 'bkDamaged'
  };
  return {
    ok: true,
    data: d,
    summary: {
      past: d.past.length,
      current: !!d.current,
      packs: (d.packs || []).length,
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
const APP_NAME = 'Jeopardy-Board';
const S = {
  appName: 'Jeopardy-Board',
  tagline: 'Pick a clue, buzz in first, and bet it all in the final round.',
  gameNight: 'Game night',
  newGame: 'New game',
  continueGame: 'Continue game',
  resumeRound: 'round {n} · {left} clues left',
  resumeFinal: 'final wager',
  howToPlay: 'How to play',
  settings: 'Settings',
  back: 'Back',
  close: 'Close',
  cancel: 'Cancel',
  confirm: 'Confirm',
  done: 'Done',
  dismiss: 'OK',
  menu: 'Menu',
  home: 'Home',
  reload: 'Reload',
  install: 'Install on this device',
  updateReady: 'A new version is ready.',
  pastGames: 'Recent games',
  won: 'won',
  draw: 'Draw',
  bankNote: '{q} clues in {c} categories.',
  crashed: 'Something went wrong',
  crashedSub: 'Your game is saved. Reload to carry on.',
  seconds: '{n}s',
  setupTitle: 'New game',
  teams: 'Teams',
  teamN: 'Team {n}',
  defaultTeam1: 'Falcons',
  defaultTeam2: 'Leopards',
  addTeam: 'Add a team (up to 4)',
  removeTeam: 'Remove team {n}',
  changeEmoji: 'Change emoji',
  colour: 'Colour',
  categories: 'Categories',
  catsOn: '{n} of {of} categories on',
  catsPerGame: '{n} per game',
  chooseCats: 'Choose categories',
  chooseCatsSub: 'Switched-on categories can come up. A game uses {n}.',
  catsRandom: 'Each board gets 6 categories at random from the ones switched on, mixing topics and avoiding recent ones.',
  cluesN: '{n} clues',
  allOn: 'All on',
  allOff: 'All off',
  gameRules: 'Game rules',
  rulesSummary: '{r} round(s) · {f} · {v}',
  withFinal: 'final wager',
  noFinal: 'no final',
  rounds: 'Rounds',
  oneRound: '1 round',
  twoRounds: '2 rounds',
  values: 'Points per row (round 1)',
  valuesSub: 'Round 2 doubles them: {r2}.',
  rowN: 'Row {n} points',
  finalRound: 'Final wager round',
  finalRoundSub: 'One last clue. Every team secretly bets on it.',
  finalTime: 'Time to write the final response',
  questionForm: 'Responses must be a question',
  questionFormSub: 'Teams answer “What is…?” / “Who is…?”. You judge.',
  modifiers: 'Optional modifiers',
  modifiersOff: 'All off',
  noMinus: 'No minus points',
  noMinusSub: 'A wrong answer on a normal clue costs nothing. (Risk It and the final still count.)',
  answerClock: 'Answer clock',
  answerClockSub: 'A countdown starts when a team buzzes in.',
  answerTime: 'Time to answer',
  strictRepeats: 'Strict no-repeats',
  strictRepeatsSub: 'Never reuse a clue seen in the last 50 games on this device, until a category runs out.',
  needNames: 'Every team needs a name.',
  needAscending: 'Points must go up from row 1 to row 5.',
  needCats: 'Switch on more categories: {have} can fill a board, the game needs {need}.',
  startGame: 'Start the game',
  roundN: 'Round {n}',
  roundLeft: 'Round {n} · {left} left',
  picksNext: '{team} picks a clue',
  picksShort: 'Picks',
  boardHint: 'Tap the tile the picking team calls out.',
  reportShort: '{n} tiles are empty: not enough clues left in those categories.',
  tileEmpty: 'no clue left',
  tileInvalid: 'removed as wrong',
  buzzNow: 'Read the clue. Who buzzed first?',
  othersBuzz: 'The other teams can buzz now.',
  whoBuzzed: 'Who buzzed first?',
  nobody: 'Nobody — show the response',
  nobodyElse: 'Nobody else — show the response',
  answering: '{team} is answering',
  right: 'Right',
  wrong: 'Wrong',
  wrongTeamTapped: 'Wrong team? Undo the buzz',
  response: 'Response',
  alsoAccept: 'Also accept:',
  asOf: 'True as of {d}',
  needsCheck: '⏳ Time-sensitive (as of {d}): check before trusting it',
  showResponse: 'Show the response (host)',
  hideResponse: 'Hide the response',
  qFormReminder: 'Answer in the form of a question',
  qFormJudge: 'Only accept it if it was phrased as a question.',
  flashRight: 'Right!',
  flashWrong: 'Wrong',
  flashNone: 'Nobody',
  flashInvalid: 'Clue removed',
  nobodyGotIt: 'Nobody got it',
  skipped: 'Skipped',
  pointsTo: '+{n} to {team}',
  lostPoints: '−{n} for {team}',
  backToBoard: 'Back to the board',
  endOfRound: 'End of the round',
  timeUp: 'Time!',
  riskIt: 'Risk It!',
  riskItSub: 'A hidden wager square',
  riskWagering: '{team} found a Risk It square',
  riskWagerQ: 'How much does {team} risk?',
  riskWagerRule: 'Score {score}. Bet anything from 0 up to {max} (your score, or the round’s top value if that’s more).',
  riskHidden: 'Only this team plays it. The clue appears once the wager is locked.',
  wager: 'Wager',
  allIn: 'All in ({n})',
  wagerRange: 'Enter a whole number from 0 to {max}.',
  lockWager: 'Lock the wager',
  bestRisk: 'Biggest Risk It won',
  roundOver: 'End of round {n}',
  cutShort: 'ended early, {n} left',
  nextRound2: 'Round 2: double points',
  nextFinal: 'Next: the final wager',
  nextEnd: 'That’s the game',
  round2Sub: 'New categories, every value doubled. {team} (lowest score) picks first.',
  finalSub: 'One category, one clue. Every team bets in secret.',
  startRound2: 'Start round 2',
  startFinal: 'Go to the final wager',
  seeResults: 'See the results',
  finalWager: 'Final Wager',
  finalCatHint: 'Announce the category. Teams think about how much to bet.',
  startWagers: 'Collect the secret wagers',
  wagersHint: 'Pass the phone to each team in turn. Nobody else looks.',
  maxWager: 'max {n}',
  enterWager: 'Enter wager',
  locked: 'Locked',
  redo: 'Redo',
  redoQ: 'Redo {team}’s wager?',
  redoBody: 'Their wager is cleared and they enter it again.',
  passTo: 'Pass the phone to {team}',
  passToSub: 'Only {team} should look at the screen.',
  imTeam: 'We’re {team} — show',
  yourWager: 'Your secret wager',
  finalWagerRule: 'Your score is {score}. Bet from 0 up to {max}.',
  wagerLocked: 'Wager locked',
  passBack: 'Pass the phone back to the host.',
  imHost: 'I’m the host — continue',
  showFinalClue: 'All in: show the final clue',
  finalWriteHint: 'Teams write their response before time runs out.',
  startJudging: 'Time’s up: start judging',
  judgeNext: '{team}: what did they write?',
  judgingNow: 'Now',
  wagerWas: 'bet {n}',
  finalTvCat: 'Think about your wager…',
  finalTvWagers: 'Wagers are being placed in secret',
  resultsTitle: 'Results',
  finalScores: 'Final scores',
  winnerIs: 'The winner',
  sharedWin: 'Shared win',
  itsADraw: 'It’s a draw!',
  rightShort: 'right',
  wrongShort: 'wrong',
  gameLog: 'Game log',
  logAdjust: 'Score fixed: {team} {d}',
  logVoid: '(reversed)',
  logInvalid: 'clue removed as wrong',
  logInvalidRep: 'clue replaced as wrong',
  playAgain: 'Play again',
  playAgainSub: 'Same teams and rules, new boards.',
  undo: 'Undo',
  undoWhat: 'Undo {what}',
  nothingToUndo: 'Nothing to undo',
  pause: 'Pause the clock',
  resume: 'Resume the clock',
  putBack: 'Put it back',
  putBackSub: 'Opened by mistake: back on the board',
  skipClue: 'Skip this clue',
  endRound: 'End this round now',
  endRoundQ: 'End the round?',
  endRoundBody: 'The {n} clues left on this board are skipped.',
  endGame: 'End the game',
  endGameQ: 'End the game now?',
  endGameBody: 'Scores stay as they are and the winner is shown.',
  quitHome: 'Home',
  quitHomeSub: 'The game is saved. Continue it from the home screen.',
  fixScores: 'Fix scores',
  fixScoresSub: 'For mistakes. Every change is in the game log and can be undone.',
  fixStep: 'Step',
  setScoreTo: 'Set to…',
  setScoreFor: 'Set the score for {team}',
  setScore: 'Set',
  undoLastFix: 'Undo the last fix',
  fixWrongTip: 'A clue that was itself wrong? Use “This is wrong”: it reverses exactly what that clue did.',
  editScoreOf: 'Fix the score of {team}',
  sndMute: 'Mute sounds',
  sndUnmute: 'Turn sounds on',
  thisIsWrong: 'This is wrong',
  flagPlayed: 'Flag a played clue',
  flagPlayedSub: 'Pick the clue that was wrong. Its points are reversed.',
  noPlayed: 'No clues played yet.',
  wrongTitle: 'This clue is wrong',
  whyWrong: 'What’s wrong?',
  reason_answer: 'Wrong response',
  reason_unclear: 'Unclear / two answers',
  reason_duplicate: 'Already had it',
  reason_other: 'Something else',
  wrongNote: 'A note (optional)',
  willRefund: 'These changes will be reversed:',
  refundLine: '{team} {d}',
  noRefund: 'No points changed hands on this clue.',
  repSame: 'Replace it with another {cat} clue',
  repOther: 'Replace it with a clue from {cat}',
  repNow: 'The new clue opens straight away.',
  repBoard: 'The tile goes back on the board.',
  repEmpty: 'The tile is left empty.',
  repNone: 'No replacement left in this row: the tile is left empty.',
  repPlayedOnly: 'That board is finished, so the points are reversed and nothing replaces it.',
  repFinalSame: 'A new final clue from the same category ({cat}). Wagers stay.',
  repFinalOther: 'A new final clue from {cat}. Wagers stay.',
  repFinalNone: 'No replacement final clue is left.',
  reverseIt: 'Reverse it',
  removeIt: 'Remove it',
  wrongDone: 'Clue removed.',
  wrongDoneRefund: 'Clue removed and its points reversed.',
  tvMode: 'TV mode',
  tvIntro: 'Show the board big on a TV. Answers and wagers never appear there before they’re revealed.',
  tvHere: 'Use this screen as the TV',
  tvHereSub: 'For a laptop plugged into the TV, or casting this screen.',
  tvWindow: 'Open a TV window',
  tvWindowSub: 'A second window in this browser (drag it onto the TV). This one stays the remote.',
  tvOtherDevice: 'A TV on another device needs online rooms, which aren’t built yet.',
  tvNoChannel: 'This browser can’t link two windows. Use “this screen as the TV” instead.',
  tvBlocked: 'The window was blocked. Allow pop-ups for this site.',
  tvFull: 'Full screen',
  tvBackToControls: 'Back to controls',
  tvWaiting: 'Waiting for the host…',
  tvAllowSound: 'Allow sound',
  hostPeek: 'Show the response to the host',
  hostPeekSub: 'Turn off if the host is playing too.',
  motion: 'Animations',
  motionSystem: 'System',
  motionFull: 'On',
  motionReduce: 'Less',
  tvZoom: 'TV text size',
  qbank: 'Clue bank',
  historySub: '{n} clues seen on this device over {g} games. Seen clues come up less often.',
  resetHistory: 'Forget seen clues',
  resetHistoryQ: 'Forget seen clues?',
  resetHistoryBody: 'Every clue can come up again as if new.',
  issues: 'Reported clues',
  issuesSub: 'Clues flagged with “This is wrong” on this device.',
  issuesN: '{n} reported',
  issuesNone: 'Nothing reported.',
  skipReported: 'Don’t use reported clues again',
  exportIssues: 'Export the list',
  clearIssues: 'Clear the list',
  clearIssuesQ: 'Clear the reported list?',
  clearIssuesBody: 'Those clues can come up again.',
  backup: 'Backup',
  backupSub: 'Save settings, the current game, recent games, history and your clue packs to a file, or load them back. Your sound recordings in Settings aren’t included.',
  exportBackup: 'Save backup',
  importBackup: 'Load backup',
  importQ: 'Load this backup?',
  importBody: '{past} recent games {cur}and {packs} clue packs, from {date}. It replaces what’s on this device.',
  importCur: 'and a game in progress ',
  restored: 'Backup loaded.',
  bkUnreadable: 'That file couldn’t be read.',
  bkNotOurs: 'That isn’t a Jeopardy-Board backup.',
  bkNewer: 'That backup is from a newer version. Update the game first.',
  bkDamaged: 'That backup is damaged.',
  storage: 'Storage',
  storageWhere: 'Saved on this device in {b}. Nothing is sent anywhere.',
  storeFull: 'This device is out of storage space.',
  storeFail: 'Couldn’t save on this device.',
  installIos: 'On iPhone: Share → Add to Home Screen keeps your games safer.',
  clearAll: 'Delete everything',
  clearAllQ: 'Delete everything?',
  clearAllBody: 'Settings, games, history and recordings on this device are deleted.',
  deleteIt: 'Delete',
  credits: 'Credits',
  creditsBody: 'Jeopardy-Board is an independent fan-made game, not affiliated with or endorsed by the Jeopardy! TV show, and uses none of its music, logo, set design or catchphrases. Fonts: Anton, Barlow, Barlow Semi Condensed (SIL Open Font License). Game sound effects are generated in the browser. Picture and sound clues: flags from flag-icons (MIT), country outlines from Natural Earth (public domain), sounds by Kenney and Ben Burnes (CC0) plus generated tones. Clues are written for this game.',
  version: 'Version {v}',
  sndTitle: 'Sound',
  sndOnTap: 'Sound is on (tap to mute)',
  sndMutedTap: 'Muted (tap for sound)',
  sndVolume: 'Volume',
  sndBuiltin: 'Built-in sounds',
  sndBuiltinSub: 'Simple sounds made in the browser, used when there’s no recording for an event.',
  sndTest: 'Test the sound',
  sndWhere: 'With a TV window open, sound plays there only. Otherwise on this device.',
  sndEvents: 'Sounds for each moment',
  sndEventsSub: 'Upload your own clip (up to 20 s, 3 MB). Only use sounds you made or may use.',
  sndVoiceIdea: 'good spot for a voice line',
  sndSrcCustom: 'Your recording',
  sndSrcFile: 'File in sounds/',
  sndSrcBuiltin: 'Built-in',
  sndSrcNone: 'Silent',
  sndPreview: 'Play',
  sndUpload: 'Upload',
  sndReplace: 'Replace',
  sndRemove: 'Remove',
  sndSaved: 'Saved.',
  sndTooBig: 'That file is over 3 MB.',
  sndTooLong: 'That clip is over 20 seconds.',
  sndNotAudio: 'That isn’t an audio file.',
  sndUnsupported: 'This browser can’t play that file. Try MP3 or M4A.',
  sndStorage: 'Recordings are saved in this browser only, and aren’t in backups.',
  type_text: 'Text',
  type_image: 'Picture',
  type_audio: 'Sound',
  pictureAlt: 'Picture for this clue',
  mediaFailedShort: 'The picture couldn’t load.',
  mediaMissing: 'The file is missing from this browser.',
  mediaFailed: 'The file couldn’t be played.',
  mPlay: 'Play',
  mPause: 'Pause',
  mResume: 'Resume',
  mReplay: 'Replay',
  mVolume: 'Volume',
  mIdle: 'Press Play when you’re ready.',
  mReady: 'Ready.',
  mPlaying: 'Playing…',
  mPaused: 'Paused.',
  mEnded: 'Finished.',
  mBlocked: 'The browser blocked the sound: tap “Allow sound” on the TV, then Play.',
  mError: 'Something went wrong.',
  playsHere: 'Plays on this device',
  playsOnTv: 'Plays on the TV window',
  previewOnTv: 'Preview',
  myClues: 'My clues',
  myCluesSub: 'Make your own clue packs. Switched-on packs mix into the game: in built-in categories, or in your own categories once each of the five rows has a clue.',
  newPack: 'New pack',
  newPackName: 'My pack {n}',
  noPacks: 'No packs yet.',
  importPack: 'Import a pack',
  exportPack: 'Export',
  deletePack: 'Delete pack',
  deletePackQ: 'Delete this pack?',
  deletePackBody: 'Its {n} clues and their pictures and sounds are deleted from this device.',
  packInGames: 'Use in games',
  packCatsN: '{n} categories',
  packNoCats: 'no own categories',
  packName: 'Pack name',
  packCategories: 'Your categories',
  packCategoriesSub: 'A category goes on a board once it has a clue in every row (200–1000).',
  rowsMissing: 'needs clues for {list}',
  readyForBoard: 'ready for the board',
  addCategory: 'Add a category',
  editCategory: 'Edit category',
  categoryName: 'Category name',
  emoji: 'Emoji',
  deleteCategory: 'Delete category',
  categoryInUse: 'Move or delete its {n} clues first.',
  all: 'All',
  incomplete: 'incomplete',
  noCluesYet: 'No clues in this pack yet.',
  chooseType: 'What kind of clue?',
  addClue: 'Add a clue',
  deleteClue: 'Delete clue',
  deleteClueQ: 'Delete this clue?',
  category: 'Category',
  chooseCategory: 'Choose a category…',
  thisPack: 'This pack',
  rowLabel: 'Row (difficulty)',
  rowSub: 'Row 1 is the easiest. In a game the points follow the setup (round 2 doubles them).',
  picture: 'Picture',
  choosePicture: 'Choose a picture',
  replacePicture: 'Replace the picture',
  pictureRights: 'Only use pictures you took or are allowed to use. Big photos are shrunk to fit.',
  sound: 'Sound',
  chooseSound: 'Choose a sound',
  replaceSound: 'Replace the sound',
  soundLength: '{s} seconds long.',
  soundRights: 'Only use sounds you made or are allowed to use. MP3 or M4A plays everywhere.',
  clueText: 'Clue',
  clueTextPh: 'A statement, e.g. “This planet is known for its rings.”',
  responseText: 'Response',
  responseTextPh: 'The short answer, e.g. Saturn',
  alsoAcceptField: 'Also accept',
  alsoAcceptPh: 'Other answers, separated by commas',
  noteField: 'Note shown after the response',
  sourceField: 'Source (where you checked it)',
  sourcePh: 'A link or a book',
  previewLabel: 'Preview',
  previewOnTvBtn: 'Preview on the TV window',
  stopTvPreview: 'Stop the TV preview',
  previewTvHint: 'Open a TV window (📺 during a game) to preview there too.',
  save: 'Save',
  working: 'Working…',
  vPoints: 'Choose a row.',
  vCat: 'Choose a category.',
  vClue: 'Write the clue.',
  vResponse: 'Write the response.',
  vResponseQuestion: 'Write the plain response (“Saturn”), not a question.',
  vNoPicture: 'Choose a picture.',
  vNoSound: 'Choose a sound.',
  vMediaMissing: 'The picture or sound is missing from this browser. Choose it again.',
  vNotImage: 'That isn’t a picture.',
  vTooBig: 'That picture is over 8 MB.',
  vTooBigAudio: 'That sound is over 5 MB.',
  vLongSound: 'That sound is over 30 seconds. It will work, but short clips play better.',
  vUnsupported: 'This browser can’t open that file.',
  vTooBigPack: 'That file is too big to be a pack.',
  pkNotPack: 'That isn’t a Jeopardy-Board clue pack.',
  pkBadPoints: 'That pack has clues with values that aren’t 200–1000.',
  importPackQ: 'Import “{name}”?',
  importPackBody: '{clues} clues, {cats} categories, {media} pictures/sounds.',
  importPackBad: '{bad} of them are incomplete and won’t be used until fixed.',
  packImported: '“{name}” imported.',
  packStorageNote: 'Packs live in this browser. Export them (or save a backup in Settings) to keep a copy.',
  howBody: ['One phone is the host’s remote. Show the board on a TV (📺): the TV never shows a response or a wager before it’s revealed.', 'Each round has a board of 6 categories × 5 clues. Higher values are harder. Round 2 has new categories and doubles every value.', 'The picking team calls a category and value. The host reads the clue out loud: it’s a statement, and teams give the short response.', 'Teams buzz out loud. The host taps who was first. Right = + the value, and that team picks next. Wrong = − the value, and the other teams can buzz.', 'If nobody gets it, the host shows the response and the same team picks again.', 'Risk It! squares are hidden on the board: 1 in round 1, 2 in round 2. Only the team that found it plays: it bets up to its score (or the round’s top value if that’s more), then sees the clue.', 'Final Wager: one category, then each team secretly bets on the phone, passed round with the screen hidden between teams. Then the clue, a timer, and the host judges each team, lowest score first.', 'Mistakes: Undo in the menu, Fix scores, or “This is wrong” on a bad clue, which reverses exactly what that clue did.']
};
function t(key, vars) {
  let s = S[key] != null ? S[key] : key;
  if (vars && typeof s === 'string') Object.keys(vars).forEach(k => {
    s = s.split('{' + k + '}').join(vars[k]);
  });
  return s;
}
function pick(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  return String(v.en || '').trim();
}
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
    const deep = cands.filter(x => (bank.byCat[x.id] || []).some(q => q.tier === 5 && q.type === 'text'));
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
    const pool = (bank.byCat[final.cat.id] || []).filter(q => q.type === 'text');
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
  const textOnly = ctx.textOnly ? q => q.type === 'text' : () => true;
  const same = pickClue((ctx.bank.byCat[catId] || []).filter(textOnly), tier, c).q;
  if (same) return {
    q: same,
    how: 'same'
  };
  const inGame = new Set(gameCatIds(g));
  for (const cat of shuffleWith(usableCats(ctx.bank, g.rules).filter(x => !inGame.has(x.id)), c.rand)) {
    const q = pickClue((ctx.bank.byCat[cat.id] || []).filter(textOnly), tier, c).q;
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
const freshPlay = () => ({
  state: 'idle',
  seq: 0,
  vol: 0.9
});
function mediaCmd(g, cmd, v) {
  const key = g.phase === 'final' ? 'final' : 'current';
  const cur = g[key];
  if (!cur) return g;
  const p = {
    ...freshPlay(),
    ...(cur.play || {})
  };
  if (cmd === 'play') p.state = 'playing';else if (cmd === 'pause') p.state = 'paused';else if (cmd === 'replay') {
    p.state = 'playing';
    p.seq = (p.seq || 0) + 1;
  } else if (cmd === 'stop') p.state = 'idle';else if (cmd === 'vol') p.vol = clamp(+v || 0, 0, 1);else return g;
  return {
    ...g,
    [key]: {
      ...cur,
      play: p
    }
  };
}
function quietMedia(g) {
  if (!g) return g;
  const calm = c => c && c.play && c.play.state === 'playing' ? {
    ...c,
    play: {
      ...c.play,
      state: 'paused'
    }
  } : c;
  return {
    ...g,
    current: calm(g.current),
    final: calm(g.final)
  };
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
    opener: g.picker,
    play: freshPlay()
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
      pausedLeft: null,
      play: freshPlay()
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
        pausedLeft: null,
        play: freshPlay()
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
        pausedLeft: null,
        play: freshPlay()
      } : {
        ...cur,
        stage: cur.wager ? 'wager' : 'open',
        team: cur.wager ? cur.opener : null,
        tried: [],
        changes: [],
        result: null,
        endsAt: null,
        pausedLeft: null,
        play: freshPlay()
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
const backArrow = () => '←';
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
function Txt({
  v,
  as = 'span',
  className
}) {
  const Tag = as;
  return React.createElement(Tag, {
    className: className
  }, React.createElement("span", {
    dir: "auto"
  }, pick(v)));
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
    className: "en"
  }, APP_NAME));
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
  onClues,
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
  }, React.createElement("span", {
    className: "iconspace"
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
  }, t('newGame')), onClues && React.createElement("button", {
    className: "btn",
    onClick: onClues
  }, "\u270F\uFE0F ", t('myClues')), React.createElement("div", {
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
  const lines = S.howBody;
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
  open: 'opening the clue',
  wager: 'the Risk It wager',
  buzz: 'who buzzed',
  right: '“right”',
  wrong: '“wrong”',
  nobody: '“nobody”',
  skip: 'the skip',
  putBack: 'putting it back',
  next: 'back to the board',
  endRound: 'ending the round',
  nextStage: 'starting the next part',
  end: 'ending the game',
  adjust: 'the score fix',
  finalWagers: 'starting the wagers',
  finalWager: 'a final wager',
  finalWagerClear: 'clearing a wager',
  finalClue: 'showing the final clue',
  finalJudge: 'starting the judging',
  finalJudged: 'the last judgement',
  finish: 'finishing the game',
  invalid: '“This is wrong”'
};
const undoText = g => {
  const l = undoLabel(g);
  return l ? t('undoWhat', {
    what: UNDO_TXT[l] || l
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
const altList = q => q && q.alt ? Array.isArray(q.alt) ? q.alt : q.alt.en || [] : [];
function ClueCard({
  q,
  big,
  showAnswer,
  host,
  questionForm,
  media
}) {
  const md = media || {};
  return React.createElement("div", {
    className: 'qcard' + (big ? ' big' : '') + (q.media ? ' hasmedia m-' + q.media.type : '')
  }, q.media && React.createElement(MediaView, {
    q: q,
    big: big,
    play: md.play,
    output: !!md.output,
    onStatus: md.onStatus,
    status: md.status
  }), React.createElement(Txt, {
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
    className: "atext"
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
  }), cell.q && cell.q.media && React.createElement("span", {
    className: "qh-type"
  }, MEDIA_ICON[cell.q.media.type], " ", t('type_' + cell.q.media.type))), risk ? React.createElement("span", {
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
  setSettings,
  media
}) {
  const md = media || {};
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
    questionForm: g.rules.questionForm,
    media: {
      play: cur.play,
      output: md.output,
      onStatus: md.onStatus,
      status: md.status
    }
  }), React.createElement(MediaControls, {
    q: cell.q,
    play: cur.play,
    act: act,
    status: md.status,
    where: md.where
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
  setSettings,
  media
}) {
  const md = media || {};
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
    questionForm: g.rules.questionForm,
    media: {
      play: f.play,
      output: md.output,
      onStatus: md.onStatus,
      status: md.status
    }
  }), React.createElement(MediaControls, {
    q: f.q,
    play: f.play,
    act: act,
    status: md.status,
    where: md.where
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
  g,
  media
}) {
  const md = media || {};
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
    questionForm: g.rules.questionForm,
    media: {
      play: f.play,
      ...md
    }
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
      rep: canRep ? findReplacement(g, catId, tier, isFinal ? {
        ...c,
        textOnly: true
      } : c) : null,
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
  type: q.type,
  media: q.media || null,
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
  onFlashDone,
  media,
  preview
}) {
  const md = media || {};
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
      questionForm: g.rules.questionForm,
      media: {
        play: cur.play,
        ...md
      }
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
    g: g,
    media: md
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
  if (preview) body = React.createElement("div", {
    className: "tv-q"
  }, React.createElement("span", {
    className: "eyebrow"
  }, t('previewOnTv')), React.createElement(ClueCard, {
    q: preview.q,
    big: true,
    media: {
      play: preview.play,
      ...md
    }
  }));
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
  const [status, setStatus] = useState(null);
  const [preview, setPreview] = useState(null);
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
      if (m.type === 'game') setG(m.game);else if (m.type === 'flash') setFlash(m.info);else if (m.type === 'preview') setPreview(m.preview || null);else if (m.type === 'host-hello') ch.postMessage({
        type: 'hello',
        tv: TV_ID,
        sound: soundAllowed()
      });else if (m.type === 'sound-cfg') {
        sound.setConfig(m.cfg);
        setTvPlays(m.tvPlays !== false);
      } else if (m.type === 'sfx' && playsRef.current) sound.play(m.name, m.id);
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
  const onStatus = s => {
    setStatus(s);
    try {
      chRef.current && chRef.current.postMessage({
        type: 'media-status',
        tv: TV_ID,
        status: s
      });
    } catch (e) {}
  };
  const key = g && (g.phase === 'final' ? 'final:' + (g.final && g.final.q && g.final.q.id) : g.current ? g.current.cell + ':' + ((curCell(g) || {}).q || {}).id : '');
  useEffect(() => {
    setStatus(null);
  }, [key]);
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
  const needsClick = !unlocked || status && status.s === 'blocked';
  return React.createElement(React.Fragment, null, React.createElement(TvView, {
    g: g,
    flash: flash,
    onFlashDone: () => setFlash(null),
    media: {
      output: tvPlays,
      onStatus,
      status
    },
    preview: preview
  }), needsClick && React.createElement("button", {
    className: "soundunlock",
    onClick: () => {
      setUnlocked(true);
      sound.unlock();
      if (status && status.s === 'blocked') onStatus({
        s: 'ready'
      });
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
function useTvSender(game, settings, soundState, preview) {
  const ch = useRef(null);
  const latest = useRef({
    game,
    settings,
    soundState,
    preview
  });
  latest.current = {
    game,
    settings,
    soundState,
    preview
  };
  const [tvs, setTvs] = useState({});
  const [status, setStatus] = useState(null);
  useEffect(() => {
    if (!canChannel()) return undefined;
    const c = new BroadcastChannel(TV_CHANNEL);
    ch.current = c;
    c.onmessage = e => {
      const m = e.data || {};
      if (m.type === 'hello') {
        c.postMessage({
          type: 'game',
          game: tvGame(latest.current.game)
        });
        if (latest.current.soundState) c.postMessage({
          type: 'sound-cfg',
          ...latest.current.soundState
        });
        if (latest.current.preview) c.postMessage({
          type: 'preview',
          preview: latest.current.preview
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
      if (m.type === 'media-status') setStatus(m.status || null);
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
      type: 'preview',
      preview: preview || null
    });
  }, [preview]);
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
    },
    status,
    setStatus
  };
}
const MEDIA_ICON = {
  image: '🖼️',
  audio: '🔊'
};
function useMediaUrl(src) {
  const [state, setState] = useState({
    url: isLocalFile(src) ? null : src || null,
    missing: false
  });
  useEffect(() => {
    if (!isLocalFile(src)) {
      setState({
        url: src || null,
        missing: !src
      });
      return undefined;
    }
    let url = null;
    let live = true;
    fileStore.get(src.slice(4)).then(rec => {
      if (!live) return;
      if (rec && rec.blob) {
        url = URL.createObjectURL(rec.blob);
        setState({
          url,
          missing: false
        });
      } else setState({
        url: null,
        missing: true
      });
    });
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [src]);
  return state;
}
function AudioPlayer({
  media,
  play,
  output,
  onStatus
}) {
  const ref = useRef(null);
  const {
    url,
    missing
  } = useMediaUrl(media.src);
  const st = s => onStatus && onStatus(s);
  useEffect(() => {
    if (missing && output) st({
      s: 'error',
      msg: 'mediaMissing'
    });
  }, [missing, output]);
  useEffect(() => {
    const a = ref.current;
    if (a) a.volume = play ? play.vol : 0.9;
  }, [play && play.vol, url]);
  const lastSeq = useRef(play ? play.seq : 0);
  useEffect(() => {
    const a = ref.current;
    if (!a || !output || !play) return;
    if (play.seq !== lastSeq.current) {
      lastSeq.current = play.seq;
      try {
        a.currentTime = 0;
      } catch (e) {}
    }
    if (play.state === 'playing') {
      const p = a.play();
      if (p && p.catch) p.catch(e => st(e && e.name === 'NotAllowedError' ? {
        s: 'blocked'
      } : {
        s: 'error',
        msg: 'mediaFailed'
      }));
    } else if (play.state === 'paused' || play.state === 'idle') {
      a.pause();
      if (play.state === 'idle') try {
        a.currentTime = 0;
      } catch (e) {}
    }
  }, [play && play.state, play && play.seq, output, url]);
  if (!output) return null;
  return url ? React.createElement("audio", {
    ref: ref,
    src: url,
    preload: "auto",
    onPlaying: () => st({
      s: 'playing'
    }),
    onPause: () => st({
      s: 'paused'
    }),
    onEnded: () => st({
      s: 'ended'
    }),
    onCanPlay: () => st({
      s: 'ready'
    }),
    onError: () => st({
      s: 'error',
      msg: 'mediaFailed'
    })
  }) : null;
}
function SoundBadge({
  status,
  big
}) {
  const playing = status && status.s === 'playing';
  return React.createElement("div", {
    className: 'soundbadge' + (playing ? ' on' : '') + (big ? ' big' : ''),
    "aria-hidden": "true"
  }, React.createElement("span", {
    className: "sb-ic"
  }, "\uD83D\uDD0A"), React.createElement("span", {
    className: "eq"
  }, [0, 1, 2, 3, 4].map(i => React.createElement("i", {
    key: i,
    style: {
      animationDelay: i * 0.12 + 's'
    }
  }))));
}
function ImageView({
  media,
  big
}) {
  const {
    url,
    missing
  } = useMediaUrl(media.src);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [url]);
  const alt = media.alt || t('pictureAlt');
  if (missing || failed) return React.createElement("div", {
    className: 'qimg broken' + (big ? ' big' : ''),
    role: "img",
    "aria-label": alt
  }, React.createElement("span", null, "\uD83D\uDDBC\uFE0F"), React.createElement("b", null, t('mediaFailedShort')));
  return React.createElement("div", {
    className: 'qimg' + (big ? ' big' : '') + (media.frame === 'flag' ? ' flag' : '')
  }, url && React.createElement("img", {
    src: url,
    alt: alt,
    draggable: false,
    onError: () => setFailed(true)
  }));
}
function MediaView({
  q,
  play,
  big,
  output,
  onStatus,
  status
}) {
  const m = q && q.media;
  if (!m) return null;
  if (m.type === 'image') return React.createElement(ImageView, {
    media: m,
    big: big
  });
  if (m.type === 'audio') return React.createElement(React.Fragment, null, React.createElement(SoundBadge, {
    status: status,
    big: big
  }), React.createElement(AudioPlayer, {
    media: m,
    play: play || freshPlay(),
    output: output,
    onStatus: onStatus
  }));
  return null;
}
const STATUS_TXT = {
  ready: 'mReady',
  playing: 'mPlaying',
  paused: 'mPaused',
  ended: 'mEnded',
  blocked: 'mBlocked',
  error: 'mError'
};
function MediaControls({
  q,
  play,
  act,
  status,
  where
}) {
  if (!q || !q.media || q.media.type !== 'audio') return null;
  const p = play || freshPlay();
  const s = status || {};
  const playing = p.state === 'playing' && s.s !== 'ended' && s.s !== 'error';
  return React.createElement("div", {
    className: "mctl"
  }, React.createElement("div", {
    className: "row mbtns"
  }, playing ? React.createElement("button", {
    className: "btn btn-sm grow",
    onClick: () => act(x => mediaCmd(x, 'pause'))
  }, "\u23F8 ", t('mPause')) : React.createElement("button", {
    className: "btn btn-sm btn-gold grow",
    onClick: () => act(x => mediaCmd(x, s.s === 'ended' ? 'replay' : 'play'))
  }, "\u25B6 ", p.state === 'idle' ? t('mPlay') : s.s === 'ended' ? t('mReplay') : t('mResume')), React.createElement("button", {
    className: "btn btn-sm",
    onClick: () => act(x => mediaCmd(x, 'replay'))
  }, "\u21BA ", t('mReplay'))), React.createElement("label", {
    className: "vol"
  }, React.createElement("span", {
    "aria-hidden": "true"
  }, "\uD83D\uDD08"), React.createElement("input", {
    type: "range",
    min: "0",
    max: "1",
    step: "0.05",
    value: p.vol,
    "aria-label": t('mVolume'),
    onChange: e => act(x => mediaCmd(x, 'vol', +e.target.value))
  }), React.createElement("span", {
    "aria-hidden": "true"
  }, "\uD83D\uDD0A")), React.createElement("p", {
    className: 'mstatus' + (s.s === 'error' || s.s === 'blocked' ? ' bad' : ''),
    role: "status"
  }, where && React.createElement("span", {
    className: "muted"
  }, where, " \xB7 "), p.state === 'idle' && (!s.s || s.s === 'ready') ? t('mIdle') : s.s ? t(STATUS_TXT[s.s] || 'mReady') : '', s.msg ? ' ' + t(s.msg) : ''));
}
const PACK_FORMAT = 1;
const PACK_MAX_IMAGE = 8 * 1024 * 1024,
  PACK_MAX_AUDIO = 5 * 1024 * 1024,
  PACK_MAX_FILE = 60 * 1024 * 1024;
const CTYPES = ['text', 'image', 'audio'];
const ROW_VALUES = [200, 400, 600, 800, 1000];
function packClue(p, c) {
  return {
    id: 'pk.' + p.id + '.' + c.id,
    cat: c.cat,
    tier: ROW_VALUES.indexOf(c.points) + 1,
    points: c.points,
    q: c.q,
    a: c.a,
    alt: (c.alt || []).filter(Boolean),
    note: c.note || null,
    ref: c.ref || null,
    verified: null,
    facts: [],
    reviewed: 0,
    check: 0,
    asOf: null,
    type: c.type || 'text',
    media: c.type && c.type !== 'text' ? c.media || null : null,
    pack: p.id
  };
}
function mergePacks(raw, packs) {
  const on = (packs || []).filter(p => p && p.enabled !== false);
  if (!on.length) return raw;
  const groups = [...raw.groups];
  const cats = raw.cats.map(c => ({
    ...c
  }));
  const own = [];
  on.forEach(p => (p.categories || []).forEach(c => own.push({
    id: c.id,
    group: 'custom',
    emoji: c.emoji || '📦',
    name: c.name,
    count: [0, 0, 0, 0, 0],
    popular: 0,
    nicheTopic: 0,
    pack: p.id
  })));
  if (own.length) {
    groups.push({
      id: 'custom',
      emoji: '📦',
      name: 'Your packs'
    });
    cats.push(...own);
  }
  const ids = new Set(cats.map(c => c.id));
  const clues = [...raw.clues];
  on.forEach(p => (p.clues || []).forEach(c => {
    if (ids.has(c.cat) && ROW_VALUES.includes(c.points) && !clueProblems(c).length) clues.push(packClue(p, c));
  }));
  return {
    ...raw,
    groups,
    cats,
    clues
  };
}
function clueProblems(c, opts = {}) {
  const out = [];
  if (!ROW_VALUES.includes(c.points)) out.push('vPoints');
  if (!c.cat) out.push('vCat');
  const m = c.media || {};
  if (!(c.q || '').trim() && !(c.type !== 'text' && m.src)) out.push('vClue');
  if (!(c.a || '').trim()) out.push('vResponse');
  if (/^\s*(what|who|where|when) (is|are|was|were)\b/i.test(c.a || '')) out.push('vResponseQuestion');
  if (c.type === 'image' && !m.src) out.push('vNoPicture');
  if (c.type === 'audio' && !m.src) out.push('vNoSound');
  if (opts.mediaMissing) out.push('vMediaMissing');
  return out;
}
const emptyClue = (type, cat) => ({
  id: uid(),
  type,
  cat: cat || '',
  points: 200,
  q: '',
  a: '',
  alt: [],
  note: '',
  ref: '',
  media: type === 'text' ? null : {
    type,
    src: null
  }
});
const missingRows = (clues, catId) => ROW_VALUES.filter(v => !(clues || []).some(c => c.cat === catId && c.points === v && !clueProblems(c).length));
const blobToDataUrl = blob => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result);
  r.onerror = () => rej(r.error);
  r.readAsDataURL(blob);
});
function dataUrlToBlob(d) {
  const m = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(d || '');
  if (!m) return null;
  const bin = m[2] ? atob(m[3]) : decodeURIComponent(m[3]);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return new Blob([u], {
    type: m[1]
  });
}
async function prepareImage(file) {
  if (!/^image\//.test(file.type)) throw new Error('vNotImage');
  if (file.size > PACK_MAX_IMAGE) throw new Error('vTooBig');
  if (file.type === 'image/svg+xml' || file.type === 'image/gif' || file.size < 450 * 1024) return file;
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error('vUnsupported'));
      i.src = url;
    });
    const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const cv = document.createElement('canvas');
    cv.width = Math.round(img.naturalWidth * scale);
    cv.height = Math.round(img.naturalHeight * scale);
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    const out = await new Promise(res => cv.toBlob(res, 'image/webp', 0.86));
    if (out && out.type === 'image/webp' && out.size < file.size) return out;
    const jpg = await new Promise(res => cv.toBlob(res, 'image/jpeg', 0.86));
    return jpg && jpg.size < file.size ? jpg : file;
  } finally {
    URL.revokeObjectURL(url);
  }
}
const packFileIds = packs => {
  const s = new Set();
  (packs || []).forEach(p => (p.clues || []).forEach(c => {
    const src = c.media && c.media.src;
    if (isLocalFile(src)) s.add(src.slice(4));
  }));
  return s;
};
async function exportPack(p) {
  const media = {};
  for (const c of p.clues || []) {
    const src = c.media && c.media.src;
    if (isLocalFile(src)) {
      const rec = await fileStore.get(src.slice(4));
      if (rec && rec.blob) media[src.slice(4)] = {
        type: rec.blob.type,
        data: await blobToDataUrl(rec.blob)
      };
    }
  }
  return {
    app: BACKUP_APP,
    kind: 'pack',
    format: PACK_FORMAT,
    exportedAt: new Date().toISOString(),
    pack: p,
    media
  };
}
function validatePack(obj) {
  if (!obj || obj.app !== BACKUP_APP || obj.kind !== 'pack') return {
    ok: false,
    error: 'pkNotPack'
  };
  if (typeof obj.format !== 'number' || obj.format > PACK_FORMAT) return {
    ok: false,
    error: 'bkNewer'
  };
  const p = obj.pack;
  if (!p || typeof p.name !== 'string' || !Array.isArray(p.clues) || !Array.isArray(p.categories)) return {
    ok: false,
    error: 'bkDamaged'
  };
  const media = obj.media && typeof obj.media === 'object' ? obj.media : {};
  if (p.categories.some(c => !c || typeof c.id !== 'string' || typeof c.name !== 'string')) return {
    ok: false,
    error: 'bkDamaged'
  };
  const catIds = new Set(p.categories.map(c => c.id));
  let bad = 0;
  for (const c of p.clues) {
    if (!c || typeof c !== 'object' || typeof c.q !== 'string' || typeof c.a !== 'string' || !CTYPES.includes(c.type || 'text')) return {
      ok: false,
      error: 'bkDamaged'
    };
    if (!ROW_VALUES.includes(c.points)) return {
      ok: false,
      error: 'pkBadPoints'
    };
    if (clueProblems(c).length) bad++;
    const src = c.media && c.media.src;
    if (isLocalFile(src) && !media[src.slice(4)]) bad++;
    if (src && !isLocalFile(src) && !/^media\//.test(src)) return {
      ok: false,
      error: 'bkDamaged'
    };
  }
  for (const k of Object.keys(media)) {
    const m = media[k];
    if (!m || typeof m.data !== 'string' || !/^data:(image|audio)\//.test(m.data)) return {
      ok: false,
      error: 'bkDamaged'
    };
  }
  return {
    ok: true,
    pack: p,
    media,
    summary: {
      name: p.name,
      clues: p.clues.length,
      cats: p.categories.length,
      media: Object.keys(media).length,
      bad,
      unknownCats: p.clues.filter(c => !catIds.has(c.cat)).length
    }
  };
}
async function importPack(v, packs) {
  const p = v.pack;
  const remap = {};
  for (const [oldId, m] of Object.entries(v.media)) {
    const blob = dataUrlToBlob(m.data);
    if (blob) remap[oldId] = await fileStore.put({
      blob,
      size: blob.size,
      at: Date.now()
    });
  }
  const pid = uid();
  const catMap = {};
  const categories = p.categories.map(c => {
    const id = 'pk-' + pid + '-' + uid().slice(0, 5);
    catMap[c.id] = id;
    return {
      id,
      emoji: c.emoji || '📦',
      name: String(c.name).slice(0, 40)
    };
  });
  const clues = p.clues.map(c => {
    const media = c.media ? {
      ...c.media
    } : null;
    if (media && isLocalFile(media.src)) media.src = remap[media.src.slice(4)] ? 'idb:' + remap[media.src.slice(4)] : null;
    return {
      ...c,
      id: uid(),
      cat: catMap[c.cat] || c.cat,
      media
    };
  });
  let name = p.name || 'Pack';
  const names = new Set((packs || []).map(x => x.name));
  if (names.has(name)) {
    let k = 2;
    while (names.has(name + ' (' + k + ')')) k++;
    name = name + ' (' + k + ')';
  }
  return {
    id: pid,
    name,
    enabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    categories,
    clues
  };
}
function CluesScreen({
  packs,
  setPacks,
  bank,
  onBack,
  tvOpen,
  setPreview,
  cleanUp
}) {
  const [openId, setOpenId] = useState(null);
  const [msg, setMsg] = useState(null);
  const [ask, setAsk] = useState(null);
  const fileRef = useRef(null);
  useEffect(() => () => setPreview(null), []);
  const pack = packs.find(p => p.id === openId);
  const savePack = p => setPacks(packs.map(x => x.id === p.id ? {
    ...p,
    updatedAt: Date.now()
  } : x));
  const newPack = () => {
    const p = {
      id: uid(),
      name: t('newPackName', {
        n: packs.length + 1
      }),
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      categories: [],
      clues: []
    };
    setPacks([...packs, p]);
    setOpenId(p.id);
  };
  const readFile = file => {
    if (!file) return;
    if (file.size > PACK_MAX_FILE) {
      setMsg({
        text: t('vTooBigPack')
      });
      return;
    }
    const r = new FileReader();
    r.onerror = () => setMsg({
      text: t('bkUnreadable')
    });
    r.onload = () => {
      let obj;
      try {
        obj = JSON.parse(r.result);
      } catch (e) {
        setMsg({
          text: t('bkUnreadable')
        });
        return;
      }
      const v = validatePack(obj);
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
  if (pack) return React.createElement(PackScreen, {
    pack: pack,
    savePack: savePack,
    bank: bank,
    tvOpen: tvOpen,
    setPreview: setPreview,
    cleanUp: cleanUp,
    onBack: () => {
      setOpenId(null);
      setPreview(null);
    },
    onDelete: () => setAsk({
      kind: 'delete',
      p: pack
    }),
    onExport: async () => {
      const data = await exportPack(pack);
      downloadBlob(new Blob([JSON.stringify(data)], {
        type: 'application/json'
      }), 'jeopardy-board-pack-' + pack.name.replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 40) + '.json');
    },
    extra: ask && ask.kind === 'delete' && React.createElement(Confirm, {
      title: t('deletePackQ'),
      body: t('deletePackBody', {
        n: ask.p.clues.length
      }),
      yes: t('deleteIt'),
      danger: true,
      onYes: () => {
        const rest = packs.filter(x => x.id !== ask.p.id);
        setPacks(rest);
        setOpenId(null);
        cleanUp(rest);
      },
      onClose: () => setAsk(null)
    })
  });
  return React.createElement("div", {
    className: "app"
  }, React.createElement(TopBar, {
    onBack: onBack,
    title: t('myClues')
  }), React.createElement("p", {
    className: "hint"
  }, t('myCluesSub')), packs.map(p => React.createElement("div", {
    key: p.id,
    className: "card packrow"
  }, React.createElement("button", {
    className: "pr-main",
    onClick: () => setOpenId(p.id)
  }, React.createElement("b", {
    className: "grow",
    dir: "auto"
  }, "\uD83D\uDCE6 ", p.name), React.createElement("span", {
    className: "small muted"
  }, t('cluesN', {
    n: p.clues.length
  }), " \xB7 ", p.categories.length ? t('packCatsN', {
    n: p.categories.length
  }) : t('packNoCats'))), React.createElement(Toggle, {
    on: p.enabled !== false,
    onChange: v => setPacks(packs.map(x => x.id === p.id ? {
      ...x,
      enabled: v
    } : x)),
    title: t('packInGames')
  }))), !packs.length && React.createElement("p", {
    className: "hint center"
  }, t('noPacks')), React.createElement("button", {
    className: "btn btn-gold",
    onClick: newPack
  }, "\uFF0B ", t('newPack')), React.createElement("button", {
    className: "btn",
    onClick: () => fileRef.current && fileRef.current.click()
  }, "\u2B06 ", t('importPack')), React.createElement("input", {
    ref: fileRef,
    type: "file",
    accept: "application/json,.json",
    hidden: true,
    onChange: e => {
      readFile(e.target.files[0]);
      e.target.value = '';
    }
  }), React.createElement("p", {
    className: "hint"
  }, t('packStorageNote')), ask && ask.kind === 'import' && React.createElement(Confirm, {
    title: t('importPackQ', {
      name: ask.v.summary.name
    }),
    body: t('importPackBody', ask.v.summary) + (ask.v.summary.bad ? ' ' + t('importPackBad', {
      n: ask.v.summary.bad
    }) : ''),
    yes: t('importPack'),
    onYes: async () => {
      try {
        const p = await importPack(ask.v, packs);
        setPacks([...packs, p]);
        setMsg({
          text: t('packImported', {
            name: p.name
          }),
          ok: true
        });
      } catch (e) {
        setMsg({
          text: t(/quota/i.test(e.message) ? 'storeFull' : 'storeFail')
        });
      }
    },
    onClose: () => setAsk(null)
  }), msg && React.createElement(Toast, {
    msg: msg.text,
    ok: msg.ok,
    onClose: () => setMsg(null)
  }));
}
function PackScreen({
  pack,
  savePack,
  bank,
  onBack,
  onDelete,
  onExport,
  extra,
  tvOpen,
  setPreview,
  cleanUp
}) {
  const [edit, setEdit] = useState(null);
  const [newType, setNewType] = useState(false);
  const [catForm, setCatForm] = useState(null);
  const [filter, setFilter] = useState('all');
  const [delC, setDelC] = useState(null);
  if (edit) return React.createElement(ClueForm, {
    initial: edit,
    pack: pack,
    bank: bank,
    tvOpen: tvOpen,
    setPreview: setPreview,
    onCancel: () => {
      setEdit(null);
      setPreview(null);
    },
    onSave: c => {
      const exists = pack.clues.some(x => x.id === c.id);
      const next = {
        ...pack,
        clues: exists ? pack.clues.map(x => x.id === c.id ? c : x) : [...pack.clues, c]
      };
      savePack(next);
      setEdit(null);
      setPreview(null);
      cleanUp();
    }
  });
  const catName = id => {
    const c = pack.categories.find(x => x.id === id) || bank.cats.find(x => x.id === id);
    return c ? (c.emoji || '') + ' ' + pick(c.name) : '—';
  };
  const list = pack.clues.filter(c => filter === 'all' || (c.type || 'text') === filter).sort((a, b) => a.cat === b.cat ? a.points - b.points : String(a.cat).localeCompare(String(b.cat)));
  return React.createElement("div", {
    className: "app"
  }, React.createElement(TopBar, {
    onBack: onBack,
    title: pack.name
  }), React.createElement("div", {
    className: "card stack-sm"
  }, React.createElement("label", {
    className: "field"
  }, React.createElement("span", {
    className: "label"
  }, t('packName')), React.createElement("input", {
    className: "input",
    dir: "auto",
    maxLength: 60,
    value: pack.name,
    onChange: e => savePack({
      ...pack,
      name: e.target.value
    })
  })), React.createElement("span", {
    className: "label"
  }, t('packCategories')), React.createElement("p", {
    className: "hint",
    style: {
      margin: 0
    }
  }, t('packCategoriesSub')), React.createElement("div", {
    className: "stack-sm"
  }, pack.categories.map(c => {
    const miss = missingRows(pack.clues, c.id);
    return React.createElement("button", {
      key: c.id,
      className: "optrow",
      onClick: () => setCatForm(c)
    }, React.createElement("span", {
      className: "cr-em"
    }, c.emoji), React.createElement("span", {
      className: "grow"
    }, React.createElement("b", {
      dir: "auto"
    }, c.name), React.createElement("span", {
      className: "small muted",
      style: {
        display: 'block'
      }
    }, miss.length ? '⚠ ' + t('rowsMissing', {
      list: miss.join(', ')
    }) : '✓ ' + t('readyForBoard'))), React.createElement("span", {
      className: "small muted"
    }, t('cluesN', {
      n: pack.clues.filter(x => x.cat === c.id).length
    })));
  }), React.createElement("button", {
    className: "btn btn-sm btn-ghost",
    onClick: () => setCatForm({
      id: 'pk-' + pack.id + '-' + uid().slice(0, 5),
      emoji: '📦',
      name: '',
      isNew: true
    })
  }, "\uFF0B ", t('addCategory')))), React.createElement("div", {
    className: "fchips"
  }, ['all', ...CTYPES].map(k => React.createElement("button", {
    key: k,
    className: 'fchip' + (filter === k ? ' on' : ''),
    onClick: () => setFilter(k)
  }, k === 'all' ? t('all') : (MEDIA_ICON[k] || '📝') + ' ' + t('type_' + k)))), list.map(c => {
    const probs = clueProblems(c);
    return React.createElement("div", {
      key: c.id,
      className: "card qrow"
    }, React.createElement("button", {
      className: "qr-main",
      onClick: () => setEdit(JSON.parse(JSON.stringify(c)))
    }, React.createElement("span", {
      className: "qr-v num"
    }, c.points), React.createElement("span", {
      className: "grow"
    }, React.createElement("span", {
      className: "small muted"
    }, MEDIA_ICON[c.type] || '📝', " ", catName(c.cat), probs.length ? ' · ⚠ ' + t('incomplete') : ''), React.createElement("span", {
      className: "qr-q",
      dir: "auto"
    }, c.q || '—'), React.createElement("span", {
      className: "small muted",
      dir: "auto"
    }, "\u2192 ", c.a))), React.createElement("button", {
      className: "iconbtn",
      "aria-label": t('deleteClue'),
      onClick: () => setDelC(c)
    }, "\uD83D\uDDD1"));
  }), !pack.clues.length && React.createElement("p", {
    className: "hint center"
  }, t('noCluesYet')), newType ? React.createElement("div", {
    className: "card stack-sm"
  }, React.createElement("span", {
    className: "label"
  }, t('chooseType')), React.createElement("div", {
    className: "typegrid"
  }, CTYPES.map(k => React.createElement("button", {
    key: k,
    className: "btn",
    onClick: () => {
      setNewType(false);
      setEdit(emptyClue(k, pack.categories[0] ? pack.categories[0].id : ''));
    }
  }, MEDIA_ICON[k] || '📝', " ", t('type_' + k)))), React.createElement("button", {
    className: "btn btn-ghost btn-sm",
    onClick: () => setNewType(false)
  }, t('cancel'))) : React.createElement("button", {
    className: "btn btn-gold",
    onClick: () => setNewType(true)
  }, "\uFF0B ", t('addClue')), React.createElement("div", {
    className: "row"
  }, React.createElement("button", {
    className: "btn grow",
    onClick: onExport,
    disabled: !pack.clues.length
  }, "\u2B07 ", t('exportPack')), React.createElement("button", {
    className: "btn btn-danger grow",
    onClick: onDelete
  }, t('deletePack'))), catForm && React.createElement(CategoryForm, {
    c: catForm,
    onClose: () => setCatForm(null),
    inUse: pack.clues.filter(x => x.cat === catForm.id).length,
    onSave: c => {
      const {
        isNew,
        ...cc
      } = c;
      savePack({
        ...pack,
        categories: isNew ? [...pack.categories, cc] : pack.categories.map(x => x.id === cc.id ? cc : x)
      });
      setCatForm(null);
    },
    onDelete: () => {
      savePack({
        ...pack,
        categories: pack.categories.filter(x => x.id !== catForm.id)
      });
      setCatForm(null);
    }
  }), delC && React.createElement(Confirm, {
    title: t('deleteClueQ'),
    body: delC.q || delC.a,
    yes: t('deleteIt'),
    danger: true,
    onYes: () => {
      const next = {
        ...pack,
        clues: pack.clues.filter(x => x.id !== delC.id)
      };
      savePack(next);
      cleanUp();
    },
    onClose: () => setDelC(null)
  }), extra);
}
function CategoryForm({
  c,
  onSave,
  onDelete,
  onClose,
  inUse
}) {
  const [d, setD] = useState(c);
  return React.createElement(Sheet, {
    onClose: onClose
  }, React.createElement("div", {
    className: "stack-sm"
  }, React.createElement("h2", {
    className: "display",
    style: {
      fontSize: 26
    }
  }, c.isNew ? t('addCategory') : t('editCategory')), React.createElement("label", {
    className: "field"
  }, React.createElement("span", {
    className: "label"
  }, t('emoji')), React.createElement("input", {
    className: "input",
    style: {
      maxWidth: 90,
      fontSize: 26
    },
    maxLength: 4,
    value: d.emoji,
    onChange: e => setD({
      ...d,
      emoji: e.target.value
    })
  })), React.createElement("label", {
    className: "field"
  }, React.createElement("span", {
    className: "label"
  }, t('categoryName')), React.createElement("input", {
    className: "input",
    dir: "auto",
    maxLength: 40,
    value: d.name,
    onChange: e => setD({
      ...d,
      name: e.target.value
    })
  })), React.createElement("button", {
    className: "btn btn-gold",
    disabled: !d.name.trim(),
    onClick: () => onSave({
      ...d,
      name: d.name.trim()
    })
  }, t('save')), !c.isNew && React.createElement("button", {
    className: "btn btn-danger",
    disabled: inUse > 0,
    onClick: onDelete
  }, t('deleteCategory')), !c.isNew && inUse > 0 && React.createElement("p", {
    className: "hint",
    style: {
      margin: 0
    }
  }, t('categoryInUse', {
    n: inUse
  })), React.createElement("button", {
    className: "btn btn-ghost",
    onClick: onClose
  }, t('cancel'))));
}
function ClueForm({
  initial,
  pack,
  bank,
  onSave,
  onCancel,
  tvOpen,
  setPreview
}) {
  const [c, setC] = useState(initial);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [play, setPlay] = useState(freshPlay());
  const [status, setStatus] = useState(null);
  const [onTv, setOnTv] = useState(false);
  const [audioLen, setAudioLen] = useState(null);
  const [mediaMissing, setMediaMissing] = useState(false);
  const [tried, setTried] = useState(false);
  const [altText, setAltText] = useState((initial.alt || []).join(', '));
  const fileRef = useRef(null);
  const set = patch => setC({
    ...c,
    ...patch
  });
  useEffect(() => {
    const s = c.media && c.media.src;
    if (isLocalFile(s)) fileStore.get(s.slice(4)).then(r => setMediaMissing(!r));else setMediaMissing(false);
  }, [c.media && c.media.src]);
  useEffect(() => {
    setStatus(null);
    setPlay(freshPlay());
  }, [c.media && c.media.src]);
  const probs = clueProblems(c, {
    mediaMissing
  });
  const pickFile = async file => {
    if (!file) return;
    setErr(null);
    setBusy(true);
    try {
      let blob = file;
      if (c.type === 'image') blob = await prepareImage(file);else {
        if (file.size > PACK_MAX_AUDIO) throw new Error('vTooBigAudio');
        const len = await checkAudio(file);
        setAudioLen(len);
        if (len > 30) setErr('vLongSound');
      }
      const id = await fileStore.put({
        blob,
        size: blob.size,
        at: Date.now()
      });
      setC(x => ({
        ...x,
        media: {
          type: x.type,
          src: 'idb:' + id
        }
      }));
    } catch (e) {
      setErr(/quota/i.test(e.message) ? 'storeFull' : e.message && S[e.message] ? e.message : 'vUnsupported');
    }
    setBusy(false);
  };
  const previewQ = {
    ...packClue(pack, c),
    q: c.q || '…'
  };
  useEffect(() => {
    if (tvOpen && onTv) setPreview({
      q: {
        ...previewQ,
        a: null,
        alt: null,
        note: null,
        ref: null
      },
      play
    });else setPreview(null);
  }, [onTv, tvOpen, play, c.q, c.media && c.media.src]);
  const cmd = k => {
    const g = mediaCmd({
      phase: 'clue',
      current: {
        play
      }
    }, k);
    setPlay(g.current.play);
  };
  const save = () => {
    setTried(true);
    if (probs.length) return;
    onSave({
      ...c,
      q: c.q.trim(),
      a: c.a.trim(),
      note: (c.note || '').trim(),
      ref: (c.ref || '').trim(),
      alt: altText.split(',').map(s => s.trim()).filter(Boolean)
    });
  };
  return React.createElement("div", {
    className: "app qform"
  }, React.createElement(TopBar, {
    onBack: onCancel,
    title: (MEDIA_ICON[c.type] || '📝') + ' ' + t('type_' + c.type)
  }), React.createElement("div", {
    className: "field"
  }, React.createElement("span", {
    className: "label"
  }, t('category')), React.createElement("select", {
    className: "input",
    value: c.cat,
    onChange: e => set({
      cat: e.target.value
    })
  }, React.createElement("option", {
    value: ""
  }, t('chooseCategory')), pack.categories.length > 0 && React.createElement("optgroup", {
    label: t('thisPack')
  }, pack.categories.map(x => React.createElement("option", {
    key: x.id,
    value: x.id
  }, x.emoji, " ", x.name))), bank.groups.filter(g => g.id !== 'custom').map(g => React.createElement("optgroup", {
    key: g.id,
    label: g.emoji + ' ' + pick(g.name)
  }, bank.cats.filter(x => x.group === g.id).map(x => React.createElement("option", {
    key: x.id,
    value: x.id
  }, x.emoji, " ", pick(x.name))))))), React.createElement("div", {
    className: "field"
  }, React.createElement("span", {
    className: "label"
  }, t('rowLabel')), React.createElement(Seg, {
    value: c.points,
    options: ROW_VALUES.map(v => [v, String(v)]),
    onChange: v => set({
      points: v
    }),
    label: t('rowLabel')
  }), React.createElement("p", {
    className: "hint"
  }, t('rowSub'))), c.type === 'image' && React.createElement("div", {
    className: "card stack-sm"
  }, React.createElement("span", {
    className: "label"
  }, t('picture')), React.createElement("button", {
    className: "btn",
    disabled: busy,
    onClick: () => fileRef.current.click()
  }, "\uD83D\uDDBC\uFE0F ", c.media && c.media.src ? t('replacePicture') : t('choosePicture')), React.createElement("input", {
    ref: fileRef,
    type: "file",
    accept: "image/*",
    hidden: true,
    onChange: e => {
      pickFile(e.target.files[0]);
      e.target.value = '';
    }
  }), React.createElement("p", {
    className: "hint",
    style: {
      margin: 0
    }
  }, t('pictureRights'))), c.type === 'audio' && React.createElement("div", {
    className: "card stack-sm"
  }, React.createElement("span", {
    className: "label"
  }, t('sound')), React.createElement("button", {
    className: "btn",
    disabled: busy,
    onClick: () => fileRef.current.click()
  }, "\uD83D\uDD0A ", c.media && c.media.src ? t('replaceSound') : t('chooseSound')), React.createElement("input", {
    ref: fileRef,
    type: "file",
    accept: "audio/*,.mp3,.m4a,.wav,.ogg",
    hidden: true,
    onChange: e => {
      pickFile(e.target.files[0]);
      e.target.value = '';
    }
  }), audioLen != null && React.createElement("p", {
    className: "hint",
    style: {
      margin: 0
    }
  }, t('soundLength', {
    s: Math.round(audioLen)
  })), React.createElement("p", {
    className: "hint",
    style: {
      margin: 0
    }
  }, t('soundRights'))), React.createElement("label", {
    className: "field"
  }, React.createElement("span", {
    className: "label"
  }, t('clueText'), c.type === 'text' ? ' *' : ''), React.createElement("textarea", {
    className: "input",
    dir: "auto",
    rows: 3,
    maxLength: 300,
    placeholder: t('clueTextPh'),
    value: c.q,
    onChange: e => set({
      q: e.target.value
    })
  })), React.createElement("label", {
    className: "field"
  }, React.createElement("span", {
    className: "label"
  }, t('responseText'), " *"), React.createElement("input", {
    className: "input",
    dir: "auto",
    maxLength: 120,
    placeholder: t('responseTextPh'),
    value: c.a,
    onChange: e => set({
      a: e.target.value
    })
  })), React.createElement("label", {
    className: "field"
  }, React.createElement("span", {
    className: "label"
  }, t('alsoAcceptField')), React.createElement("input", {
    className: "input",
    dir: "auto",
    maxLength: 300,
    placeholder: t('alsoAcceptPh'),
    value: altText,
    onChange: e => setAltText(e.target.value)
  })), React.createElement("label", {
    className: "field"
  }, React.createElement("span", {
    className: "label"
  }, t('noteField')), React.createElement("input", {
    className: "input",
    dir: "auto",
    maxLength: 200,
    value: c.note || '',
    onChange: e => set({
      note: e.target.value
    })
  })), React.createElement("label", {
    className: "field"
  }, React.createElement("span", {
    className: "label"
  }, t('sourceField')), React.createElement("input", {
    className: "input",
    dir: "auto",
    maxLength: 300,
    placeholder: t('sourcePh'),
    value: c.ref || '',
    onChange: e => set({
      ref: e.target.value
    })
  })), React.createElement("div", {
    className: "card stack-sm preview"
  }, React.createElement("span", {
    className: "label"
  }, t('previewLabel')), React.createElement(ClueCard, {
    q: previewQ,
    host: true,
    showAnswer: true,
    media: {
      play,
      output: !(tvOpen && onTv),
      onStatus: setStatus,
      status
    }
  }), c.type === 'audio' && c.media && c.media.src && React.createElement("div", {
    className: "row mbtns"
  }, React.createElement("button", {
    className: "btn btn-sm btn-gold grow",
    onClick: () => cmd(play.state === 'playing' ? 'pause' : 'play')
  }, play.state === 'playing' ? '⏸ ' + t('mPause') : '▶ ' + t('mPlay')), React.createElement("button", {
    className: "btn btn-sm",
    onClick: () => cmd('replay')
  }, "\u21BA ", t('mReplay'))), status && status.s && React.createElement("p", {
    className: 'mstatus' + (status.s === 'error' ? ' bad' : '')
  }, t(STATUS_TXT[status.s] || 'mReady'), status.msg ? ' ' + t(status.msg) : ''), tvOpen ? React.createElement("button", {
    className: "btn btn-sm",
    "aria-pressed": onTv,
    onClick: () => {
      setOnTv(!onTv);
      setPlay(freshPlay());
    }
  }, "\uD83D\uDCFA ", onTv ? t('stopTvPreview') : t('previewOnTvBtn')) : React.createElement("p", {
    className: "hint",
    style: {
      margin: 0
    }
  }, t('previewTvHint'))), tried && probs.length > 0 && React.createElement("ul", {
    className: "verrors"
  }, probs.map(k => React.createElement("li", {
    key: k
  }, t(k)))), err && React.createElement("p", {
    className: "warn"
  }, t(err)), busy && React.createElement("p", {
    className: "hint"
  }, t('working')), React.createElement("button", {
    className: "btn btn-gold",
    disabled: busy,
    onClick: save
  }, t('save')), React.createElement("button", {
    className: "btn btn-ghost",
    onClick: onCancel
  }, t('cancel')));
}
const SFX = [{
  id: 'countdown-tick',
  en: 'Clock ticks (last 5 s)'
}, {
  id: 'clue-open',
  en: 'A clue opens'
}, {
  id: 'correct',
  en: 'Right answer',
  voice: 1
}, {
  id: 'wrong',
  en: 'Wrong answer',
  voice: 1
}, {
  id: 'risk-it',
  en: 'Risk It square found',
  voice: 1
}, {
  id: 'round-end',
  en: 'End of a round'
}, {
  id: 'final-category',
  en: 'Final Wager category',
  voice: 1
}, {
  id: 'final-clue',
  en: 'Final clue shown'
}, {
  id: 'game-intro',
  en: 'Game intro',
  voice: 1
}, {
  id: 'winner-fanfare',
  en: 'Winner',
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
    memory: 'memory only'
  }[store.backend];
  return React.createElement("div", {
    className: "app"
  }, React.createElement(TopBar, {
    onBack: onBack,
    title: t('settings')
  }), React.createElement("section", {
    className: "card stack"
  }, React.createElement(Toggle, {
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
      packs: ask.v.summary.packs,
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
      if (isLocalFile(old)) cleanFiles({
        ...cfg.files,
        [name]: 'idb:' + id
      }).catch(() => {});
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
    if (isLocalFile(old)) cleanFiles(files).catch(() => {});
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
    }, React.createElement("b", null, x.en), x.voice ? React.createElement("span", {
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
const DEFAULT_SETTINGS = {
  motion: 'system',
  tvZoom: 1,
  rules: null,
  lastTeams: null,
  skipReported: true,
  hostPeek: true,
  sound: DEFAULT_SOUND
};
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
  const [packs, setPacksRaw] = useState([]);
  const setPacks = l => {
    setPacksRaw(l);
    store.set(K.packs, l);
  };
  const BANK = useMemo(() => indexBank(mergePacks(BASE_BANK, packs)), [packs]);
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
      setSettingsRaw(s);
      const cur = store.get(K.current, null);
      if (cur && Array.isArray(cur.teams) && Array.isArray(cur.boards)) setGameRaw(quietMedia(cur));
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
      const pk = store.get(K.packs, []);
      if (Array.isArray(pk)) setPacksRaw(pk);
      const iss = store.get(K.issues, []);
      if (Array.isArray(iss)) {
        issuesRef.current = iss;
        setIssuesRaw(iss);
      }
      setReady(true);
    });
  }, []);
  useEffect(() => {
    document.documentElement.setAttribute('data-motion', settings.motion || 'system');
    document.documentElement.style.setProperty('--tvzoom', String(settings.tvZoom || 1));
  }, [settings.motion, settings.tvZoom]);
  const latestSettings = useRef(settings);
  latestSettings.current = settings;
  const setSettings = s => {
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
  const [preview, setPreview] = useState(null);
  const tvLink = useTvSender(game, settings, {
    cfg: soundCfg,
    tvPlays: true
  }, preview);
  const sendTv = tvLink.send;
  const outputHere = !tvLink.tv.open;
  const [localStatus, setLocalStatus] = useState(null);
  const mediaKey = game ? game.phase === 'final' ? 'final:' + (game.final && game.final.q && game.final.q.id) : game.current ? game.current.cell + ':' + ((curCell(game) || {}).q || {}).id : '' : '';
  useEffect(() => {
    setLocalStatus(null);
    tvLink.setStatus(null);
  }, [mediaKey]);
  const mediaProps = {
    output: outputHere,
    onStatus: setLocalStatus,
    status: outputHere ? localStatus : tvLink.status,
    where: outputHere ? t('playsHere') : t('playsOnTv')
  };
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
  if (tvRoute) return ready ? React.createElement(LocalTv, null) : null;
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
    setGame(quietMedia(d.current || null));
    setPast(d.past || []);
    store.set(K.past, d.past || []);
    setIssues(Array.isArray(d.issues) ? d.issues : []);
    setPacks(Array.isArray(d.packs) ? d.packs : []);
    if (d.history) setQhist({
      cats: {},
      ...d.history
    });
  };
  const clearAll = () => {
    Object.values(K).forEach(k => store.del(k));
    setSettingsRaw(DEFAULT_SETTINGS);
    setGameRaw(null);
    setPast([]);
    setPacksRaw([]);
    cleanFiles({}, []).catch(() => {});
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
  const cleanUp = list => setTimeout(() => cleanFiles(null, list || null).catch(() => {}), 0);
  if (screen === 'clues') view = React.createElement(CluesScreen, {
    packs: packs,
    setPacks: setPacks,
    bank: BANK,
    onBack: () => setScreen('home'),
    tvOpen: tvLink.tv.open,
    setPreview: setPreview,
    cleanUp: cleanUp
  });else if (screen === 'settings') view = React.createElement(SettingsScreen, {
    settings: settings,
    setSettings: setSettings,
    state: {
      settings,
      game,
      past,
      history: qhist,
      issues,
      packs
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
      flash: doFlash,
      media: mediaProps
    };
    if (tvHere) view = React.createElement(React.Fragment, null, React.createElement(TvView, {
      g: tvGame(game),
      flash: flash,
      onFlashDone: () => setFlash(null),
      media: {
        output: outputHere,
        onStatus: setLocalStatus,
        status: localStatus
      }
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
    onClues: () => setScreen('clues'),
    bank: BANK
  });
  return React.createElement(React.Fragment, null, React.createElement("div", {
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
  pick,
  S,
  APP_NAME,
  mergePacks,
  packClue,
  clueProblems,
  emptyClue,
  missingRows,
  validatePack,
  exportPack,
  importPack,
  fileStore,
  cleanFiles,
  mediaCmd,
  quietMedia,
  freshPlay
};
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Boundary, null, React.createElement(App, null)));
})();
