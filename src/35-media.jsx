/* ============================================================
   PICTURE AND SOUND CLUES (adapted from Khatfa's 35-media.jsx; no video).
   · Built-in pictures and sounds ship with the app (media/), so they work offline.
   · Your own pictures and sounds ("My clues") are saved in this browser's IndexedDB
     (the file store in 00-platform.js), referenced as 'idb:<id>'.
   Sound playback is driven by the game state (current.play / final.play), so the host's
   buttons control whichever screen is the "output": a TV window if one is open,
   otherwise this device.
   ============================================================ */
const MEDIA_ICON = { image: '🖼️', audio: '🔊' };
// Turns a media src into a URL the browser can show/play. Local files become object URLs.
function useMediaUrl(src) {
  const [state, setState] = useState({ url: isLocalFile(src) ? null : src || null, missing: false });
  useEffect(() => {
    if (!isLocalFile(src)) { setState({ url: src || null, missing: !src }); return undefined; }
    let url = null; let live = true;
    fileStore.get(src.slice(4)).then((rec) => {
      if (!live) return;
      if (rec && rec.blob) { url = URL.createObjectURL(rec.blob); setState({ url, missing: false }); } else setState({ url: null, missing: true });
    });
    return () => { live = false; if (url) URL.revokeObjectURL(url); };
  }, [src]);
  return state;
}

// status: { s: 'ready'|'playing'|'paused'|'ended'|'error'|'blocked', msg? }
function AudioPlayer({ media, play, output, onStatus }) {
  const ref = useRef(null);
  const { url, missing } = useMediaUrl(media.src);
  const st = (s) => onStatus && onStatus(s);
  useEffect(() => { if (missing && output) st({ s: 'error', msg: 'mediaMissing' }); }, [missing, output]);
  useEffect(() => { const a = ref.current; if (a) a.volume = play ? play.vol : 0.9; }, [play && play.vol, url]);
  const lastSeq = useRef(play ? play.seq : 0);
  useEffect(() => {
    const a = ref.current; if (!a || !output || !play) return;
    if (play.seq !== lastSeq.current) { lastSeq.current = play.seq; try { a.currentTime = 0; } catch (e) {} }
    if (play.state === 'playing') {
      const p = a.play();
      if (p && p.catch) p.catch((e) => st(e && e.name === 'NotAllowedError' ? { s: 'blocked' } : { s: 'error', msg: 'mediaFailed' }));
    } else if (play.state === 'paused' || play.state === 'idle') { a.pause(); if (play.state === 'idle') try { a.currentTime = 0; } catch (e) {} }
  }, [play && play.state, play && play.seq, output, url]);
  if (!output) return null;
  return url ? <audio ref={ref} src={url} preload="auto" onPlaying={() => st({ s: 'playing' })} onPause={() => st({ s: 'paused' })} onEnded={() => st({ s: 'ended' })}
    onCanPlay={() => st({ s: 'ready' })} onError={() => st({ s: 'error', msg: 'mediaFailed' })} /> : null;
}
function SoundBadge({ status, big }) {
  const playing = status && status.s === 'playing';
  return (
    <div className={'soundbadge' + (playing ? ' on' : '') + (big ? ' big' : '')} aria-hidden="true">
      <span className="sb-ic">🔊</span>
      <span className="eq">{[0, 1, 2, 3, 4].map((i) => <i key={i} style={{ animationDelay: i * 0.12 + 's' }} />)}</span>
    </div>
  );
}
function ImageView({ media, big }) {
  const { url, missing } = useMediaUrl(media.src);
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [url]);
  const alt = media.alt || t('pictureAlt');
  if (missing || failed) return <div className={'qimg broken' + (big ? ' big' : '')} role="img" aria-label={alt}><span>🖼️</span><b>{t('mediaFailedShort')}</b></div>;
  return <div className={'qimg' + (big ? ' big' : '') + (media.frame === 'flag' ? ' flag' : '')}>{url && <img src={url} alt={alt} draggable={false} onError={() => setFailed(true)} />}</div>;
}
// What every screen shows for a clue's media. `output`: this screen plays the sound.
function MediaView({ q, play, big, output, onStatus, status }) {
  const m = q && q.media; if (!m) return null;
  if (m.type === 'image') return <ImageView media={m} big={big} />;
  if (m.type === 'audio') return <><SoundBadge status={status} big={big} /><AudioPlayer media={m} play={play || freshPlay()} output={output} onStatus={onStatus} /></>;
  return null;
}

/* ---------- the host's sound controls ---------- */
const STATUS_TXT = { ready: 'mReady', playing: 'mPlaying', paused: 'mPaused', ended: 'mEnded', blocked: 'mBlocked', error: 'mError' };
function MediaControls({ q, play, act, status, where }) {
  if (!q || !q.media || q.media.type !== 'audio') return null;
  const p = play || freshPlay();
  const s = status || {};
  const playing = p.state === 'playing' && s.s !== 'ended' && s.s !== 'error';
  return (
    <div className="mctl">
      <div className="row mbtns">
        {playing
          ? <button className="btn btn-sm grow" onClick={() => act((x) => mediaCmd(x, 'pause'))}>⏸ {t('mPause')}</button>
          : <button className="btn btn-sm btn-gold grow" onClick={() => act((x) => mediaCmd(x, s.s === 'ended' ? 'replay' : 'play'))}>▶ {p.state === 'idle' ? t('mPlay') : s.s === 'ended' ? t('mReplay') : t('mResume')}</button>}
        <button className="btn btn-sm" onClick={() => act((x) => mediaCmd(x, 'replay'))}>↺ {t('mReplay')}</button>
      </div>
      <label className="vol"><span aria-hidden="true">🔈</span><input type="range" min="0" max="1" step="0.05" value={p.vol} aria-label={t('mVolume')} onChange={(e) => act((x) => mediaCmd(x, 'vol', +e.target.value))} /><span aria-hidden="true">🔊</span></label>
      <p className={'mstatus' + (s.s === 'error' || s.s === 'blocked' ? ' bad' : '')} role="status">
        {where && <span className="muted">{where} · </span>}
        {p.state === 'idle' && (!s.s || s.s === 'ready') ? t('mIdle') : s.s ? t(STATUS_TXT[s.s] || 'mReady') : ''}
        {s.msg ? ' ' + t(s.msg) : ''}
      </p>
    </div>
  );
}
