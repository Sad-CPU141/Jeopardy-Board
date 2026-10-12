/* ============================================================
   APP: state, screens, saving, TV sync. (Same structure as Khatfa.)
   ============================================================ */
const DEFAULT_SETTINGS = { motion: 'system', tvZoom: 1, rules: null, lastTeams: null, skipReported: true, hostPeek: true, sound: DEFAULT_SOUND };
const SESSION_ID = Math.random().toString(36).slice(2, 8);
const BASE_BANK = typeof window !== 'undefined' ? window.JB_BANK : null;

function App() {
  const [ready, setReady] = useState(false);
  const [settings, setSettingsRaw] = useState(DEFAULT_SETTINGS);
  const [game, setGameRaw] = useState(null);
  const [past, setPast] = useState([]);
  const [qhist, setQhistRaw] = useState(emptyHistory());
  const histRef = useRef(qhist); histRef.current = qhist;
  const setQhist = (h) => { histRef.current = h; setQhistRaw(h); store.set(K.history, h); };
  const [screen, setScreen] = useState('home');
  const [flash, setFlash] = useState(null);
  const [sheet, setSheet] = useState(null); // 'menu' | 'tv' | 'how' | 'fix'
  const [tvHere, setTvHere] = useState(false);
  const [toast, setToast] = useState(null);
  const [wrongAt, setWrongAt] = useState(null);
  const [playedList, setPlayedList] = useState(false);
  const [packs, setPacksRaw] = useState([]);
  const setPacks = (l) => { setPacksRaw(l); store.set(K.packs, l); };
  // The bank the game uses: built-in clues plus switched-on packs.
  const BANK = useMemo(() => indexBank(mergePacks(BASE_BANK, packs)), [packs]);
  const [issues, setIssuesRaw] = useState([]);
  const issuesRef = useRef(issues); issuesRef.current = issues;
  const setIssues = (l) => { issuesRef.current = l; setIssuesRaw(l); store.set(K.issues, l); };
  const tvRoute = typeof location !== 'undefined' && /^#tv\b/.test(location.hash);

  useEffect(() => {
    store.onError = (key) => setToast({ text: t(key) });
    store.init().then(() => {
      const s = { ...DEFAULT_SETTINGS, ...store.get(K.settings, {}) };
      setSettingsRaw(s);
      const cur = store.get(K.current, null);
      if (cur && Array.isArray(cur.teams) && Array.isArray(cur.boards)) setGameRaw(quietMedia(cur));
      setPast(store.get(K.past, []));
      const h = store.get(K.history, null); if (h && h.seen) { const hh = { cats: {}, ...h }; histRef.current = hh; setQhistRaw(hh); }
      const pk = store.get(K.packs, []); if (Array.isArray(pk)) setPacksRaw(pk);
      const iss = store.get(K.issues, []); if (Array.isArray(iss)) { issuesRef.current = iss; setIssuesRaw(iss); }
      setReady(true);
    });
  }, []);
  useEffect(() => {
    document.documentElement.setAttribute('data-motion', settings.motion || 'system');
    document.documentElement.style.setProperty('--tvzoom', String(settings.tvZoom || 1));
  }, [settings.motion, settings.tvZoom]);

  const latestSettings = useRef(settings); latestSettings.current = settings;
  const setSettings = (s) => { setSettingsRaw(s); store.set(K.settings, s); };
  const sfxSeq = useRef(0);
  const emitSfx = (names) => names.forEach((name) => {
    const id = SESSION_ID + ':' + (++sfxSeq.current);
    const o = outRef.current;
    if (o.here) sound.play(name, id); else o.tv.sfx(name, id);
  });
  // Every game change: save it, note which clues were shown, and archive finished games.
  const setGame = (next) => {
    setGameRaw((prev) => {
      const g = typeof next === 'function' ? next(prev) : next;
      if (g !== prev) { const evs = soundEvents(prev, g); if (evs.length) setTimeout(() => emitSfx(evs), 0); }
      if (g) store.set(K.current, g); else store.del(K.current);
      const qidOf = (x) => { const c = x && x.current ? curCell(x) : null; return c && c.q ? c.q.id : null; };
      if (qidOf(g) && qidOf(g) !== qidOf(prev)) setQhist(trimHistory(markSeen(histRef.current, qidOf(g), g.gameNo)));
      if (g && g.phase === 'final' && g.final && g.final.q && g.final.stage === 'clue' && !(prev && prev.final && prev.final.stage === 'clue' && prev.final.q === g.final.q)) setQhist(markSeen(histRef.current, g.final.q.id, g.gameNo));
      if (g && g.phase === 'done' && (!prev || prev !== g)) {
        setPast((p) => { const list = [pastEntry(g), ...p.filter((x) => x.id !== g.id)].slice(0, 30); store.set(K.past, list); return list; });
      }
      return g;
    });
  };
  const act = (fn) => setGame((g) => (g ? fn(g) : g));
  const reportedIds = () => (latestSettings.current.skipReported !== false ? issuesRef.current.map((x) => x.qid) : []);
  const ctx = () => ({ bank: BANK, recent: histRef.current.seen, catSeen: histRef.current.cats, rand: Math.random, exclude: reportedIds(), used: reportedIds() });
  const soundCfg = cleanSound(settings.sound);
  const [preview, setPreview] = useState(null); // the clue editor's "Preview on TV"
  const tvLink = useTvSender(game, settings, { cfg: soundCfg, tvPlays: true }, preview);
  const sendTv = tvLink.send;
  const outputHere = !tvLink.tv.open;
  // Picture/sound clues: this device plays the sound unless a TV window is open.
  const [localStatus, setLocalStatus] = useState(null);
  const mediaKey = game ? (game.phase === 'final' ? 'final:' + (game.final && game.final.q && game.final.q.id) : game.current ? game.current.cell + ':' + ((curCell(game) || {}).q || {}).id : '') : '';
  useEffect(() => { setLocalStatus(null); tvLink.setStatus(null); }, [mediaKey]);
  const mediaProps = { output: outputHere, onStatus: setLocalStatus, status: outputHere ? localStatus : tvLink.status, where: outputHere ? t('playsHere') : t('playsOnTv') };
  const outRef = useRef({ here: outputHere, tv: tvLink }); outRef.current = { here: outputHere, tv: tvLink };
  useEffect(() => { sound.setConfig(soundCfg); }, [JSON.stringify(soundCfg)]);
  useEffect(() => { const u = () => sound.unlock(); window.addEventListener('pointerdown', u); window.addEventListener('keydown', u); return () => { window.removeEventListener('pointerdown', u); window.removeEventListener('keydown', u); }; }, []);
  useTicks(game, outputHere && !tvRoute && screen === 'game', (n, id) => sound.play(n, id));
  const doFlash = (info) => { setFlash(info); sendTv(info); };
  // A Risk It square: show the splash on both screens when it's found.
  const curId = game && game.current ? game.current.cell : null;
  const prevCur = useRef(curId);
  useEffect(() => { if (curId && curId !== prevCur.current && game.current.wager && game.current.stage === 'wager') doFlash({ kind: 'risk', team: game.current.team }); prevCur.current = curId; }, [curId]);

  if (tvRoute) return ready ? <LocalTv /> : null;
  if (!ready) return <div className="boot"><div>JEOPARDY-BOARD<small>GAME NIGHT</small></div></div>;

  const startNew = (teams, rules) => {
    setSettings({ ...settings, rules, lastTeams: teams });
    const gameNo = startGameNo(histRef.current);
    const g = createGame(teams, rules, { ...ctx(), gameNo }, Date.now());
    setQhist(markCatsUsed(histRef.current, gameCatIds(g), gameNo));
    setGame(g); setScreen('game');
  };
  const goHome = () => { setTvHere(false); setScreen('home'); };
  const playAgain = () => { startNew(game.teams.map(({ name, color, emoji }) => ({ name, color, emoji })), game.rules); };
  const restore = (d) => {
    const s = { ...DEFAULT_SETTINGS, ...(d.settings || {}) };
    setSettings(s); setGame(quietMedia(d.current || null)); setPast(d.past || []); store.set(K.past, d.past || []); setIssues(Array.isArray(d.issues) ? d.issues : []); setPacks(Array.isArray(d.packs) ? d.packs : []);
    if (d.history) setQhist({ cats: {}, ...d.history });
  };
  const clearAll = () => {
    Object.values(K).forEach((k) => store.del(k));
    setSettingsRaw(DEFAULT_SETTINGS); setGameRaw(null); setPast([]); setPacksRaw([]); cleanFiles({}, []).catch(() => {});
    issuesRef.current = []; setIssuesRaw([]); histRef.current = emptyHistory(); setQhistRaw(emptyHistory()); setScreen('home');
  };
  const onWrongDone = (info) => {
    setIssues(addIssue(issuesRef.current, issueEntry(game, info)));
    setToast({ text: info.refunded ? t('wrongDoneRefund') : t('wrongDone'), ok: true });
    sendTv({ kind: 'invalid' });
  };
  let view;
  const cleanUp = (list) => setTimeout(() => cleanFiles(null, list || null).catch(() => {}), 0);
  if (screen === 'clues') view = <CluesScreen packs={packs} setPacks={setPacks} bank={BANK} onBack={() => setScreen('home')} tvOpen={tvLink.tv.open} setPreview={setPreview} cleanUp={cleanUp} />;
  else if (screen === 'settings') view = <SettingsScreen settings={settings} setSettings={setSettings} state={{ settings, game, past, history: qhist, issues, packs }} issues={issues} onClearIssues={() => setIssues([])}
      onRestore={restore} onClearAll={clearAll} bank={BANK} qhist={qhist} onResetHistory={() => setQhist({ n: histRef.current.n, seen: {}, cats: {} })} onBack={() => setScreen('home')} />;
  else if (screen === 'setup') view = <Setup bank={BANK} initial={{ teams: settings.lastTeams, rules: settings.rules }} onBack={() => setScreen('home')} onStart={startNew} />;
  else if (screen === 'game' && game) {
    const common = { g: game, act, onMenu: () => setSheet('menu'), onTv: () => setSheet('tv'), onWrong: (id) => setWrongAt(id), onFix: () => setSheet('fix'), settings, setSettings, flash: doFlash, media: mediaProps };
    if (tvHere) view = <><TvView g={tvGame(game)} flash={flash} onFlashDone={() => setFlash(null)} media={{ output: outputHere, onStatus: setLocalStatus, status: localStatus }} /><TvExit onExit={() => setTvHere(false)} /></>;
    else if (game.phase === 'board') view = <Board {...common} />;
    else if (game.phase === 'clue') view = <ClueScreen {...common} />;
    else if (game.phase === 'between') view = <Between g={game} act={act} onTv={() => setSheet('tv')} />;
    else if (game.phase === 'final') view = <FinalScreen {...common} />;
    else view = <Results g={game} act={act} onHome={goHome} onAgain={playAgain} onFlagPlayed={() => setPlayedList(true)} onFix={() => setSheet('fix')} onTv={() => setSheet('tv')} />;
  } else view = <Home game={game} past={past} settings={settings} setSettings={setSettings} onNew={() => setScreen('setup')} onContinue={() => setScreen('game')} onHow={() => setSheet('how')} onSettings={() => setScreen('settings')} onClues={() => setScreen('clues')} bank={BANK} />;

  return (
    <>
      <div className="langroot">
        {view}
        {flash && !tvHere && screen === 'game' && <Flash f={flash} g={game} onDone={() => setFlash(null)} />}
        {sheet === 'menu' && game && <GameMenu g={game} act={act} onClose={() => setSheet(null)} onHome={goHome} onFix={() => setSheet('fix')} onFlagPlayed={() => setPlayedList(true)} sound={soundCfg} onSound={(c) => setSettings({ ...settings, sound: c })} />}
        {sheet === 'fix' && game && <FixScores g={game} act={act} onClose={() => setSheet(null)} />}
        {playedList && game && <PlayedList g={game} onClose={() => setPlayedList(false)} onPick={(id) => { setPlayedList(false); setWrongAt(id); }} />}
        {wrongAt && game && <WrongSheet g={game} where={wrongAt} ctx={ctx} act={act} onClose={() => setWrongAt(null)} onDone={onWrongDone} />}
        {sheet === 'tv' && <TvSheet onClose={() => setSheet(null)} onHere={() => setTvHere(true)} />}
        {sheet === 'how' && <HowTo onClose={() => setSheet(null)} />}
        {toast && <Toast msg={toast.text} ok={toast.ok} onClose={() => setToast(null)} />}
      </div>
    </>
  );
}

if (window.__JB_TEST__) window.__JB = { store, K, BANK: indexBank(BASE_BANK), indexBank, selectGame, pickClue, usableCats, catsNeeded, tierCounts, ROWS, DEFAULT_RULES, cleanRules, valuesAscending, createGame, rematch, openCell, setRiskWager, buzzIn, markRight, markWrong, nobody, skipClue, putBack, finishClue, endRound, nextStage, endGame, adjustScore, undo, undoLabel, winners, gameStats, pastEntry, timeLeft, pauseTimer, resumeTimer, pickerTeam, openCells, isBoardDone, boardOf, cellById, curCell, curValue, maxRiskWager, maxFinalWager, roundTop, lowestFirst, finalToWagers, setFinalWager, clearFinalWager, allWagersIn, showFinalClue, startJudging, judgeFinal, finalNext, finishGame, invalidateClue, invalidRefunds, findReplacement, isInvalidated, gameUsed, gameCatIds, tvGame, sound, soundEvents, tickKey, cleanSound, SFX, markSeen, markCatsUsed, emptyHistory, startGameNo, trimHistory, makeBackup, validateBackup, addIssue, issueEntry, t, pick, S, APP_NAME, mergePacks, packClue, clueProblems, emptyClue, missingRows, validatePack, exportPack, importPack, fileStore, cleanFiles, mediaCmd, quietMedia, freshPlay };
ReactDOM.createRoot(document.getElementById('root')).render(<Boundary><App /></Boundary>);
