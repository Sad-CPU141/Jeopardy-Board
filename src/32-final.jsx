/* ============================================================
   FINAL WAGER (الرهان الأخير)
   category → secret wagers (the host phone is passed round; a cover screen sits between
   teams and nobody's wager is shown again) → the clue with a timer → the host judges
   each team, lowest score first, revealing its wager → the correct response.
   ============================================================ */
function FinalHead({ g }) {
  const f = g.final;
  return (
    <div className="finalhead">
      <span className="eyebrow">{t('finalWager')}</span>
      <span className="fh-cat">{f.cat.emoji} <Txt v={f.cat.name} /></span>
    </div>
  );
}
// A team's secret wager: cover → entry → locked → cover for the next team.
function WagerPass({ g, teamId, act, onDone }) {
  const team = teamById(g, teamId);
  const max = maxFinalWager(g, teamId);
  const [step, setStep] = useState('cover');
  const [v, setV] = useState('');
  const n = parseInt(String(v).replace(/[^\d]/g, ''), 10);
  const okN = !isNaN(n) && n >= 0 && n <= max;
  if (step === 'cover') return (
    <div className="passcover" style={tStyle(team)}>
      <span className="pc-em">{team.emoji}</span>
      <h2 className="display">{t('passTo', { team: teamName(team) })}</h2>
      <p className="muted">{t('passToSub', { team: teamName(team) })}</p>
      <button className="btn btn-gold" onClick={() => setStep('enter')}>{t('imTeam', { team: teamName(team) })}</button>
      <button className="btn btn-ghost" onClick={onDone}>{t('cancel')}</button>
    </div>
  );
  if (step === 'locked') return (
    <div className="passcover" style={tStyle(team)}>
      <span className="pc-em">🔒</span>
      <h2 className="display">{t('wagerLocked')}</h2>
      <p className="muted">{t('passBack')}</p>
      <button className="btn btn-gold" onClick={onDone}>{t('imHost')}</button>
    </div>
  );
  return (
    <div className="passcover enter" style={tStyle(team)}>
      <span className="eyebrow">{team.emoji} {teamName(team)}</span>
      <h2 className="display" style={{ fontSize: 30 }}>{t('yourWager')}</h2>
      <p className="hint" style={{ margin: 0 }}>{t('finalWagerRule', { score: fmtNum(team.score), max })}</p>
      <input className="input wagerin num" type="text" inputMode="numeric" dir="ltr" autoComplete="off" value={v} placeholder={'0 – ' + max} aria-label={t('wager')} onChange={(e) => setV(e.target.value)} />
      <div className="chips">{[...new Set([0, Math.floor(max / 2), max])].map((q) => <button key={q} className="chip" onClick={() => setV(String(q))}>{q === max && max > 0 ? t('allIn', { n: q }) : q}</button>)}</div>
      {v !== '' && !okN && <p className="warn">{t('wagerRange', { max })}</p>}
      <button className="btn btn-gold" disabled={!okN} onClick={() => { act((x) => setFinalWager(x, teamId, n)); setV(''); setStep('locked'); }}>{t('lockWager')}</button>
      <button className="btn btn-ghost" onClick={() => { setV(''); setStep('cover'); }}>{t('cancel')}</button>
    </div>
  );
}
function FinalScreen({ g, act, flash, onMenu, onTv, onWrong, onFix, settings, setSettings }) {
  const f = g.final;
  const [passing, setPassing] = useState(null);
  const [clearAsk, setClearAsk] = useState(null);
  const peek = settings.hostPeek !== false;
  if (passing) return <div className="app"><WagerPass g={g} teamId={passing} act={act} onDone={() => setPassing(null)} /></div>;
  const nextId = finalNext(g);
  const nextTeam = nextId ? teamById(g, nextId) : null;
  return (
    <div className="app qscreen finalscreen">
      <TopBar left={<MenuBtn onClick={onMenu} />} title={t('finalWager')} right={<TvButton onTv={onTv} />} dense />
      <ScoreBar g={g} activeId={nextId} onEdit={f.stage === 'wager' ? null : onFix} marks={f.stage === 'wager' ? Object.fromEntries(g.teams.map((tm) => [tm.id, f.wagers[tm.id] != null ? '🔒' : '…'])) : null} />
      <FinalHead g={g} />
      {f.stage === 'category' && <>
        <p className="hint center">{t('finalCatHint')}</p>
        <div className="actions"><button className="btn btn-gold span2" onClick={() => act(finalToWagers)}>{t('startWagers')}</button></div>
      </>}
      {f.stage === 'wager' && <>
        <p className="hint center">{t('wagersHint')}</p>
        <div className="stack-sm">
          {g.teams.map((tm) => {
            const locked = f.wagers[tm.id] != null;
            return (
              <div key={tm.id} className="wagerrow" style={tStyle(tm)}>
                <span className="grow">{tm.emoji} <Name team={tm} /> <small className="muted">· {t('maxWager', { n: maxFinalWager(g, tm.id) })}</small></span>
                {locked ? <><span className="lockmark">🔒 {t('locked')}</span><button className="btn btn-sm btn-ghost" onClick={() => setClearAsk(tm.id)}>{t('redo')}</button></>
                  : <button className="btn btn-sm btn-gold" onClick={() => setPassing(tm.id)}>{t('enterWager')}</button>}
              </div>
            );
          })}
        </div>
        <div className="actions"><button className="btn btn-gold span2" disabled={!allWagersIn(g)} onClick={() => act((x) => showFinalClue(x, Date.now()))}>{t('showFinalClue')}</button></div>
      </>}
      {f.stage === 'clue' && <>
        <Clock g={g} />
        <ClueCard q={f.q} host showAnswer={peek} questionForm={g.rules.questionForm} />
        <button className="btn btn-ghost btn-sm peek" aria-pressed={peek} onClick={() => setSettings({ ...settings, hostPeek: !peek })}>👁 {peek ? t('hideResponse') : t('showResponse')}</button>
        <p className="hint center">{t('finalWriteHint')}</p>
        {onWrong && <button className="btn btn-sm btn-flag wrongbtn" onClick={() => onWrong('final')}>⚠ {t('thisIsWrong')}</button>}
        <div className="actions"><button className="btn btn-gold span2" onClick={() => act(startJudging)}>{t('startJudging')}</button></div>
      </>}
      {(f.stage === 'judge' || f.stage === 'done') && <>
        <ClueCard q={f.q} host showAnswer questionForm={g.rules.questionForm} />
        <JudgeList g={g} />
        {onWrong && <button className="btn btn-sm btn-flag wrongbtn" onClick={() => onWrong('final')}>⚠ {t('thisIsWrong')}</button>}
        <div className="actions">
          {nextTeam && <>
            <span className="eyebrow span2 center">{t('judgeNext', { team: teamName(nextTeam) })}</span>
            <button className="btn btn-wrong" onClick={() => { act((x) => judgeFinal(x, nextId, false, Date.now())); flash({ kind: 'wrong', team: nextId, points: -(f.wagers[nextId] || 0) }); }}>✕ {t('wrong')}</button>
            <button className="btn btn-right" onClick={() => { act((x) => judgeFinal(x, nextId, true, Date.now())); flash({ kind: 'right', team: nextId, points: f.wagers[nextId] || 0 }); }}>✓ {t('right')}</button>
          </>}
          {f.stage === 'done' && <button className="btn btn-gold span2" onClick={() => act((x) => finishGame(x, Date.now()))}>{t('seeResults')}</button>}
        </div>
      </>}
      {clearAsk && <Confirm title={t('redoQ', { team: teamName(teamById(g, clearAsk)) })} body={t('redoBody')} yes={t('redo')} onYes={() => act((x) => clearFinalWager(x, clearAsk))} onClose={() => setClearAsk(null)} />}
    </div>
  );
}
// Teams in reveal order. A wager is only shown once that team has been judged.
function JudgeList({ g, big }) {
  const f = g.final;
  const next = finalNext(g);
  return (
    <div className={'judgelist stack-sm' + (big ? ' big' : '')}>
      {f.order.map((id) => {
        const tm = teamById(g, id); const j = f.judged[id];
        return (
          <div key={id} className={'judgerow' + (id === next ? ' next' : '') + (j ? (j.right ? ' right' : ' wrong') : '')} style={tStyle(tm)}>
            <span className="grow">{tm.emoji} <Name team={tm} /></span>
            {j ? <span className="jr-res" dir="ltr">{j.right ? '✓' : '✕'} {t('wagerWas', { n: j.wager })} → <b>{fmtNum(tm.score)}</b></span>
              : <span className="jr-res muted">{id === next ? t('judgingNow') : '🔒'}</span>}
          </div>
        );
      })}
    </div>
  );
}
// TV view of the final (fed tvGame: no clue before it's shown, no wager before it's judged).
function FinalTv({ g }) {
  const f = g.final;
  return <>
    <ScoreBar g={g} activeId={finalNext(g)} big marks={f.stage === 'wager' ? Object.fromEntries(g.teams.map((tm) => [tm.id, f.locked && f.locked[tm.id] ? '🔒' : '…'])) : null} />
    <div className="tv-q">
      <FinalHead g={g} />
      {f.stage === 'category' && <p className="tv-big muted center">{t('finalTvCat')}</p>}
      {f.stage === 'wager' && <p className="tv-big muted center">{t('finalTvWagers')}</p>}
      {f.stage === 'clue' && f.q && <><Clock g={g} big /><ClueCard q={f.q} big questionForm={g.rules.questionForm} /></>}
      {(f.stage === 'judge' || f.stage === 'done') && <>
        {f.q && <ClueCard q={f.q} big showAnswer={f.stage === 'done'} />}
        <JudgeList g={g} big />
      </>}
    </div>
  </>;
}
