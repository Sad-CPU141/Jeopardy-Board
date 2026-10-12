/* ============================================================
   SETTINGS: language, clue language, animations, TV size, sound, reported clues, backup.
   (Adapted from Khatfa.)
   ============================================================ */
function SettingsScreen({ settings, setSettings, state, onRestore, onClearAll, onBack, bank, qhist, onResetHistory, issues, onClearIssues }) {
  const [ask, setAsk] = useState(null);
  const [msg, setMsg] = useState(null);
  const fileRef = useRef(null);
  const set = (k, v) => setSettings({ ...settings, [k]: v });
  const exportIt = () => downloadBlob(new Blob([JSON.stringify(makeBackup(state), null, 1)], { type: 'application/json' }), 'jeopardy-board-backup-' + todayStamp() + '.json');
  const readFile = (file) => {
    if (!file) return;
    const r = new FileReader();
    r.onerror = () => setMsg({ text: t('bkUnreadable') });
    r.onload = () => {
      let obj = null; try { obj = JSON.parse(r.result); } catch (e) { setMsg({ text: t('bkUnreadable') }); return; }
      const v = validateBackup(obj);
      if (!v.ok) { setMsg({ text: t(v.error) }); return; }
      setAsk({ kind: 'import', v });
    };
    r.readAsText(file);
  };
  const backendName = { indexeddb: 'IndexedDB', localStorage: 'localStorage', memory: LANG === 'ar' ? 'الذاكرة فقط' : 'memory only' }[store.backend];
  return (
    <div className="app">
      <TopBar onBack={onBack} title={t('settings')} />
      <section className="card stack">
        <div className="field"><span className="label">{t('language')}</span>
          <Seg value={settings.lang} options={[['ar', 'العربية'], ['en', 'English']]} onChange={(v) => set('lang', v)} label={t('language')} /></div>
        <div className="field"><span className="label">{t('qLang')}</span>
          <Seg value={settings.qLang} options={[['auto', t('qLangAuto')], ['both', t('qLangBoth')]]} onChange={(v) => set('qLang', v)} label={t('qLang')} />
          <p className="hint">{t('qLangSub')}</p></div>
        <Toggle on={settings.hostPeek !== false} onChange={(v) => set('hostPeek', v)} title={t('hostPeek')} sub={t('hostPeekSub')} />
        <div className="field"><span className="label">{t('motion')}</span>
          <Seg value={settings.motion} options={[['system', t('motionSystem')], ['full', t('motionFull')], ['reduce', t('motionReduce')]]} onChange={(v) => set('motion', v)} label={t('motion')} /></div>
        <div className="field"><span className="label">{t('tvZoom')}</span>
          <Seg value={settings.tvZoom} options={[[0.85, 'S'], [1, 'M'], [1.2, 'L'], [1.4, 'XL']]} onChange={(v) => set('tvZoom', v)} label={t('tvZoom')} /></div>
      </section>
      <SoundSettings settings={settings} setSettings={setSettings} />
      {bank && <section className="card stack">
        <h3>{t('qbank')}</h3>
        <p className="hint">{t('bankNote', { q: bank.total, c: bank.cats.length })}</p>
        <p className="hint">{t('historySub', { n: Object.keys((qhist && qhist.seen) || {}).length, g: (qhist && qhist.n) || 0 })}</p>
        <button className="btn" disabled={!qhist || !Object.keys(qhist.seen || {}).length} onClick={() => setAsk({ kind: 'hist' })}>{t('resetHistory')}</button>
      </section>}
      <section className="card stack">
        <h3>⚠ {t('issues')}</h3>
        <p className="hint">{t('issuesSub')} <b>{t('issuesN', { n: issues.length })}</b></p>
        <Toggle on={settings.skipReported !== false} onChange={(v) => set('skipReported', v)} title={t('skipReported')} />
        {issues.length > 0 ? (
          <details className="issuelist"><summary className="label">{t('issuesN', { n: issues.length })}</summary>
            <ol>{issues.slice(0, 100).map((x) => {
              const c = bank && bank.cats.find((k) => k.id === x.cat);
              return <li key={x.id}><span className="muted small">{c ? c.emoji + ' ' + pick(c.name) : x.cat}{x.value ? ' · ' + x.value : ''} · {t('reason_' + (x.reason || 'other'))}{x.note ? ' · ' : ''}</span>{x.note ? <bdi dir="auto" className="small">{x.note}</bdi> : null}<Txt v={x.q} as="span" className="iq" /><span className="small muted"> → <Txt v={x.a} /></span></li>;
            })}</ol>
          </details>
        ) : <p className="hint">{t('issuesNone')}</p>}
        <div className="row">
          <button className="btn grow" disabled={!issues.length} onClick={() => downloadBlob(new Blob([JSON.stringify({ app: BACKUP_APP, kind: 'reported-clues', exportedAt: new Date().toISOString(), issues }, null, 1)], { type: 'application/json' }), 'jeopardy-board-reported-' + todayStamp() + '.json')}>⬇ {t('exportIssues')}</button>
          <button className="btn btn-ghost grow" disabled={!issues.length} onClick={() => setAsk({ kind: 'issues' })}>{t('clearIssues')}</button>
        </div>
      </section>
      <section className="card stack">
        <h3>{t('backup')}</h3>
        <p className="hint">{t('backupSub')}</p>
        <div className="row">
          <button className="btn grow" onClick={exportIt}>⬇ {t('exportBackup')}</button>
          <button className="btn grow" onClick={() => fileRef.current && fileRef.current.click()}>⬆ {t('importBackup')}</button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { readFile(e.target.files[0]); e.target.value = ''; }} />
      </section>
      <section className="card stack">
        <h3>{t('storage')}</h3>
        <p className="hint">{t('storageWhere', { b: backendName })}</p>
        {isIOS() && <p className="hint">{t('installIos')}</p>}
        <button className="btn btn-danger" onClick={() => setAsk({ kind: 'clear' })}>{t('clearAll')}</button>
      </section>
      <details className="card"><summary className="label">{t('credits')}</summary><p className="hint">{t('creditsBody')}</p></details>
      <p className="exportfoot">{t('version', { v: APP_VERSION })}</p>
      {ask && ask.kind === 'import' && (
        <Confirm title={t('importQ')} body={t('importBody', { past: ask.v.summary.past, cur: ask.v.summary.current ? t('importCur') : '', date: (ask.v.summary.exportedAt || '').slice(0, 10) })} yes={t('importBackup')}
          onYes={() => { onRestore(ask.v.data); setMsg({ text: t('restored'), ok: true }); }} onClose={() => setAsk(null)} />
      )}
      {ask && ask.kind === 'hist' && <Confirm title={t('resetHistoryQ')} body={t('resetHistoryBody')} yes={t('resetHistory')} onYes={onResetHistory} onClose={() => setAsk(null)} />}
      {ask && ask.kind === 'issues' && <Confirm title={t('clearIssuesQ')} body={t('clearIssuesBody')} yes={t('clearIssues')} onYes={onClearIssues} onClose={() => setAsk(null)} />}
      {ask && ask.kind === 'clear' && <Confirm title={t('clearAllQ')} body={t('clearAllBody')} yes={t('deleteIt')} danger onYes={onClearAll} onClose={() => setAsk(null)} />}
      {msg && <Toast msg={msg.text} ok={msg.ok} onClose={() => setMsg(null)} />}
    </div>
  );
}

/* ---------- Sound: volume, mute, built-in sounds, your recordings ---------- */
function SoundSettings({ settings, setSettings }) {
  const cfg = cleanSound(settings.sound);
  const setCfg = (patch) => setSettings({ ...settings, sound: cleanSound({ ...cfg, ...patch }) });
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);
  const fileRef = useRef(null); const target = useRef(null);
  const upload = async (name, file) => {
    if (!file) return;
    setBusy(name); setMsg(null);
    try {
      if (file.size > SOUND_MAX_BYTES) throw new Error('sndTooBig');
      const len = await checkAudio(file);
      if (len > SOUND_MAX_SECONDS) throw new Error('sndTooLong');
      const id = await fileStore.put({ blob: file, size: file.size, at: Date.now() });
      const old = cfg.files[name];
      setCfg({ files: { ...cfg.files, [name]: 'idb:' + id } });
      if (isLocalFile(old)) fileStore.del(old.slice(4));
      setMsg({ text: t('sndSaved'), ok: true });
    } catch (e) {
      setMsg({ text: t(/quota/i.test(e.message) ? 'storeFull' : S[e.message] ? e.message : 'sndUnsupported') });
    }
    setBusy(null);
  };
  const remove = (name) => {
    const old = cfg.files[name]; const files = { ...cfg.files }; delete files[name];
    setCfg({ files }); if (isLocalFile(old)) fileStore.del(old.slice(4));
  };
  const SRC = { custom: 'sndSrcCustom', file: 'sndSrcFile', builtin: 'sndSrcBuiltin', none: 'sndSrcNone' };
  const srcOf = (name) => (cfg.files[name] ? 'custom' : REPO_SOUNDS[name] ? 'file' : cfg.builtin ? 'builtin' : 'none');
  return (
    <section className="card stack soundset">
      <h3>🔊 {t('sndTitle')}</h3>
      <button className={'btn ' + (cfg.muted ? 'btn-danger' : 'btn-gold')} aria-pressed={cfg.muted} onClick={() => setCfg({ muted: !cfg.muted })}>{cfg.muted ? '🔇 ' + t('sndMutedTap') : '🔊 ' + t('sndOnTap')}</button>
      <label className="vol"><span aria-hidden="true">🔈</span><input type="range" min="0" max="1" step="0.05" value={cfg.volume} aria-label={t('sndVolume')} onChange={(e) => setCfg({ volume: +e.target.value })} /><span aria-hidden="true">🔊</span><b className="num">{Math.round(cfg.volume * 100)}%</b></label>
      <Toggle on={cfg.builtin} onChange={(v) => setCfg({ builtin: v })} title={t('sndBuiltin')} sub={t('sndBuiltinSub')} />
      <button className="btn btn-sm" onClick={() => { sound.unlock(); sound.preview('correct'); }}>▶ {t('sndTest')}</button>
      <p className="hint" style={{ margin: 0 }}>{t('sndWhere')}</p>
      <details className="sndlist">
        <summary className="label">{t('sndEvents')}</summary>
        <p className="hint">{t('sndEventsSub')}</p>
        <ul>
          {SFX.map((x) => {
            const src = srcOf(x.id);
            return (
              <li key={x.id} className="sndrow">
                <span className="grow"><b>{pick({ en: x.en, ar: x.ar })}</b>{x.voice ? <span className="voicetag">🎙️ {t('sndVoiceIdea')}</span> : null}<small className={'muted src-' + src}>{t(SRC[src])}{src === 'file' ? ' (' + REPO_SOUNDS[x.id] + ')' : ''}</small></span>
                <button className="mini" aria-label={t('sndPreview') + ': ' + x.en} disabled={src === 'none'} onClick={() => { sound.unlock(); sound.preview(x.id); }}>▶</button>
                <button className="btn btn-sm" disabled={busy === x.id} onClick={() => { target.current = x.id; fileRef.current.click(); }}>{cfg.files[x.id] ? t('sndReplace') : t('sndUpload')}</button>
                {cfg.files[x.id] && <button className="btn btn-sm btn-ghost" onClick={() => remove(x.id)}>{t('sndRemove')}</button>}
              </li>
            );
          })}
        </ul>
      </details>
      <input ref={fileRef} type="file" accept="audio/*,.mp3,.m4a,.wav,.ogg" hidden onChange={(e) => { upload(target.current, e.target.files[0]); e.target.value = ''; }} />
      <p className="hint" style={{ margin: 0 }}>{t('sndStorage')}</p>
      {msg && <Toast msg={msg.text} ok={msg.ok} onClose={() => setMsg(null)} />}
    </section>
  );
}
