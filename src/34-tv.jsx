/* ============================================================
   TV MODE (adapted from Khatfa's 34-tv.jsx)
   · On this screen: the host's device shows the big-screen view; "Back to controls" returns.
   · New window: a second window in the same browser, linked with BroadcastChannel,
     so no internet or server is needed. It only displays; this window runs the game.
   · Another device as the TV would need online rooms (not built).
   The TV never receives: responses before the reveal, where the hidden Risk It squares are,
   the final clue before it's shown, or a final wager before that team is judged.
   ============================================================ */
const TV_CHANNEL = 'jeopardy-board-tv';
const tvUrl = () => location.origin + location.pathname + '#tv';
const canChannel = () => typeof window !== 'undefined' && 'BroadcastChannel' in window;
function goFullscreen() { try { const el = document.documentElement; if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(() => {}); } catch (e) {} }

const hideAnswer = (q) => (q ? { id: q.id, q: q.q, type: q.type, media: q.media || null, a: null, alt: null, note: null, ref: null } : q);
function tvGame(g) {
  if (!g) return null;
  const { history, invalid, ...rest } = g;
  const cur = g.current;
  const boards = (g.boards || []).map((b) => ({ ...b, cells: b.cells.map((c) => {
    const isCur = cur && cur.cell === c.id;
    const { q, wager, ...cell } = c;
    if (!isCur) return { ...cell, q: null, wager: 0 };
    // The open clue: its text only once a Risk It wager is in; its response only at the reveal.
    const showText = !(cur.wager && cur.stage === 'wager');
    return { ...cell, wager, q: !showText ? null : cur.stage === 'reveal' ? q : hideAnswer(q) };
  }) }));
  let final = null;
  if (g.final) {
    const f = g.final;
    const showClue = f.stage === 'clue' || f.stage === 'judge' || f.stage === 'done';
    const wagers = {}; const locked = {};
    Object.keys(f.wagers || {}).forEach((id) => { locked[id] = true; if (f.judged && f.judged[id]) wagers[id] = f.wagers[id]; });
    final = { ...f, q: g.phase !== 'final' ? null : !showClue ? null : f.stage === 'done' ? f.q : hideAnswer(f.q), wagers, locked };
  }
  return { ...rest, boards, final };
}

function TvButton({ onTv }) {
  if (!onTv) return <span className="iconspace" />;
  return <button className="iconbtn tvbtn" onClick={onTv} aria-label={t('tvMode')} title={t('tvMode')}>📺</button>;
}
function TvSheet({ onClose, onHere }) {
  const [msg, setMsg] = useState('');
  const newWindow = () => {
    if (!canChannel()) { setMsg(t('tvNoChannel')); return; }
    const w = window.open(tvUrl(), '_blank');
    if (!w) setMsg(t('tvBlocked')); else onClose();
  };
  return (
    <Sheet center onClose={onClose}>
      <h2 className="display" style={{ fontSize: 30 }}>📺 {t('tvMode')}</h2>
      <p className="hint">{t('tvIntro')}</p>
      <button className="btn btn-gold" onClick={() => { onClose(); onHere(); }}>{t('tvHere')}</button>
      <p className="hint" style={{ margin: 0 }}>{t('tvHereSub')}</p>
      <button className="btn" onClick={newWindow}>{t('tvWindow')}</button>
      <p className="hint" style={{ margin: 0 }}>{t('tvWindowSub')}</p>
      <p className="hint" style={{ margin: 0 }}>{t('tvOtherDevice')}</p>
      {msg && <p className="warn">{msg}</p>}
      <button className="btn btn-ghost" onClick={onClose}>{t('close')}</button>
    </Sheet>
  );
}
function TvExit({ onExit }) {
  useEffect(() => {
    if (!onExit) return undefined;
    const k = (e) => { if (e.key === 'Escape' && !document.fullscreenElement) onExit(); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [onExit]);
  return (
    <div className="tvbar">
      <button className="pillbtn" onClick={goFullscreen}>⛶ {t('tvFull')}</button>
      {onExit && <button className="pillbtn" onClick={onExit}>{backArrow()} {t('tvBackToControls')}</button>}
    </div>
  );
}

// The big-screen view. Read-only. Always fed tvGame(g), so it can't show what it doesn't have.
// media: { output, onStatus, status } — whether this screen plays the sounds.
function TvView({ g, flash, onFlashDone, media, preview }) {
  const md = media || {};
  let body;
  if (!g) body = <div className="tv-wait"><LogoMark size={120} /><h2 className="display">{t('appName')}</h2><p className="muted">{t('tvWaiting')}</p></div>;
  else if (g.phase === 'board') {
    const team = pickerTeam(g);
    body = <>
      <ScoreBar g={g} activeId={team.id} label={t('picksShort')} big />
      <p className="turnline" style={tStyle(team)}><span>{team.emoji}</span> {t('picksNext', { team: teamName(team) })} <span className="muted"> · {t('roundN', { n: g.round })}</span></p>
      <BoardGrid g={g} big />
    </>;
  } else if (g.phase === 'clue') {
    const cell = curCell(g); const cur = g.current;
    body = <>
      <ScoreBar g={g} activeId={cur.team} big />
      <div className="tv-q">
        <ClueHead g={g} cell={cell} />
        <ClueStage g={g} />
        <Clock g={g} big />
        {cell.q ? <ClueCard q={cell.q} big showAnswer={cur.stage === 'reveal'} questionForm={g.rules.questionForm} media={{ play: cur.play, ...md }} /> : <RiskSplash g={g} big />}
        {cur.stage === 'reveal' && <ResultBanner g={g} />}
      </div>
    </>;
  } else if (g.phase === 'between') body = <Between g={g} big />;
  else if (g.phase === 'final') body = <FinalTv g={g} media={md} />;
  else {
    const sorted = [...g.teams].sort((a, b) => b.score - a.score);
    body = <><Winner g={g} big /><ScoreBar g={{ ...g, teams: sorted }} big /></>;
  }
  // "Preview on TV" from the clue editor (never sends the response).
  if (preview) body = <div className="tv-q"><span className="eyebrow">{t('previewOnTv')}</span><ClueCard q={preview.q} big media={{ play: preview.play, ...md }} /></div>;
  return (
    <div className="tvmode">
      <div className="tvwrap">{body}</div>
      {flash && <Flash f={flash} g={g} onDone={onFlashDone} />}
    </div>
  );
}

// The second window: listens to the host window in this browser.
const TV_ID = uid();
const soundAllowed = () => { try { return !navigator.userActivation || navigator.userActivation.hasBeenActive; } catch (e) { return true; } };
function LocalTv() {
  const [g, setG] = useState(null); const [flash, setFlash] = useState(null);
  const [status, setStatus] = useState(null);
  const [preview, setPreview] = useState(null);
  const [unlocked, setUnlocked] = useState(soundAllowed());
  const [tvPlays, setTvPlays] = useState(true);
  const chRef = useRef(null);
  const playsRef = useRef(true); playsRef.current = tvPlays;
  useTicks(g, tvPlays, (n, id) => sound.play(n, id));
  useEffect(() => {
    if (!canChannel()) return undefined;
    const ch = new BroadcastChannel(TV_CHANNEL); chRef.current = ch;
    ch.onmessage = (e) => {
      const m = e.data || {};
      if (m.type === 'game') setG(m.game);
      else if (m.type === 'flash') setFlash(m.info);
      else if (m.type === 'preview') setPreview(m.preview || null);
      else if (m.type === 'host-hello') ch.postMessage({ type: 'hello', tv: TV_ID, sound: soundAllowed() });
      else if (m.type === 'sound-cfg') { sound.setConfig(m.cfg); setTvPlays(m.tvPlays !== false); }
      else if (m.type === 'sfx' && playsRef.current) sound.play(m.name, m.id);
    };
    ch.postMessage({ type: 'hello', tv: TV_ID });
    const ping = setInterval(() => { try { ch.postMessage({ type: 'ping', tv: TV_ID, sound: soundAllowed() }); } catch (e) {} }, 2500);
    const bye = () => { try { ch.postMessage({ type: 'bye', tv: TV_ID }); } catch (e) {} };
    window.addEventListener('beforeunload', bye);
    return () => { clearInterval(ping); bye(); window.removeEventListener('beforeunload', bye); ch.close(); };
  }, []);
  const onStatus = (s) => { setStatus(s); try { chRef.current && chRef.current.postMessage({ type: 'media-status', tv: TV_ID, status: s }); } catch (e) {} };
  // A new clue: forget the last clue's player status.
  const key = g && (g.phase === 'final' ? 'final:' + (g.final && g.final.q && g.final.q.id) : g.current ? g.current.cell + ':' + ((curCell(g) || {}).q || {}).id : '');
  useEffect(() => { setStatus(null); }, [key]);
  if (!canChannel()) return <div className="app"><div className="card stack"><p className="hint" style={{ margin: 0 }}>{t('tvNoChannel')}</p></div></div>;
  const needsClick = !unlocked || (status && status.s === 'blocked');
  return <>
    <TvView g={g} flash={flash} onFlashDone={() => setFlash(null)} media={{ output: tvPlays, onStatus, status }} preview={preview} />
    {needsClick && <button className="soundunlock" onClick={() => { setUnlocked(true); sound.unlock(); if (status && status.s === 'blocked') onStatus({ s: 'ready' }); try { chRef.current.postMessage({ type: 'ping', tv: TV_ID, sound: true }); } catch (e) {} }}>🔊 {t('tvAllowSound')}</button>}
    <TvExit />
  </>;
}

// Host side: keeps any TV windows in sync, and knows whether one is open (so sound plays there).
function useTvSender(game, settings, soundState, preview) {
  const ch = useRef(null);
  const latest = useRef({ game, settings, soundState, preview });
  latest.current = { game, settings, soundState, preview };
  const [tvs, setTvs] = useState({}); // id → { seen, sound }
  const [status, setStatus] = useState(null); // the TV window's sound player status
  useEffect(() => {
    if (!canChannel()) return undefined;
    const c = new BroadcastChannel(TV_CHANNEL); ch.current = c;
    c.onmessage = (e) => {
      const m = e.data || {};
      if (m.type === 'hello') {
        c.postMessage({ type: 'game', game: tvGame(latest.current.game) });
        if (latest.current.soundState) c.postMessage({ type: 'sound-cfg', ...latest.current.soundState });
        if (latest.current.preview) c.postMessage({ type: 'preview', preview: latest.current.preview });
      }
      if ((m.type === 'hello' || m.type === 'ping') && m.tv) setTvs((x) => ({ ...x, [m.tv]: { seen: Date.now(), sound: m.sound !== false } }));
      if (m.type === 'bye' && m.tv) setTvs((x) => { const n = { ...x }; delete n[m.tv]; return n; });
      if (m.type === 'media-status') setStatus(m.status || null);
    };
    c.postMessage({ type: 'host-hello' }); // any TV window already open answers with "hello"
    const sweep = setInterval(() => setTvs((x) => { const now = Date.now(); const n = {}; let changed = false; Object.keys(x).forEach((k) => { if (now - x[k].seen < 8000) n[k] = x[k]; else changed = true; }); return changed ? n : x; }), 3000);
    return () => { clearInterval(sweep); c.close(); ch.current = null; };
  }, []);
  useEffect(() => { if (ch.current) ch.current.postMessage({ type: 'game', game: tvGame(game) }); }, [game]);
  useEffect(() => { if (ch.current) ch.current.postMessage({ type: 'preview', preview: preview || null }); }, [preview]);
  useEffect(() => { if (ch.current && soundState) ch.current.postMessage({ type: 'sound-cfg', ...soundState }); }, [soundState && JSON.stringify(soundState)]);
  const list = Object.values(tvs);
  return { send: (info) => { if (ch.current) ch.current.postMessage({ type: 'flash', info }); }, sfx: (name, id) => { if (ch.current) ch.current.postMessage({ type: 'sfx', name, id }); }, tv: { open: list.length > 0, sound: list.some((x) => x.sound) }, status, setStatus };
}
