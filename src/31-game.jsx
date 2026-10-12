/* ============================================================
   THE GAME: board, clue, between rounds, results, menu, fix scores.
   Every change goes through the engine (20-engine.js).
   Host screens get `act(fn)`; the TV gets tvGame(g), read-only.
   ============================================================ */
function useNow(active, every = 200) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { if (!active) return undefined; const id = setInterval(() => setNow(Date.now()), every); return () => clearInterval(id); }, [active, every]);
  return now;
}
const UNDO_TXT = {
  open: ['opening the clue', 'فتح التلميح'], wager: ['the Risk It wager', 'رهان «خاطِر»'], buzz: ['who buzzed', 'من ضغط أولاً'],
  right: ['“right”', '«صح»'], wrong: ['“wrong”', '«غلط»'], nobody: ['“nobody”', '«ولا أحد»'], skip: ['the skip', 'التخطي'],
  putBack: ['putting it back', 'إرجاع التلميح'], next: ['back to the board', 'الرجوع للوحة'], endRound: ['ending the round', 'إنهاء الجولة'],
  nextStage: ['starting the next part', 'بدء المرحلة التالية'], end: ['ending the game', 'إنهاء اللعبة'], adjust: ['the score fix', 'تعديل النقاط'],
  finalWagers: ['starting the wagers', 'بدء الرهانات'], finalWager: ['a final wager', 'رهان أخير'], finalWagerClear: ['clearing a wager', 'مسح رهان'],
  finalClue: ['showing the final clue', 'عرض التلميح الأخير'], finalJudge: ['starting the judging', 'بدء التحكيم'], finalJudged: ['the last judgement', 'آخر حكم'],
  finish: ['finishing the game', 'إنهاء اللعبة'], invalid: ['“This is wrong”', '«هذا غلط»'],
};
const undoText = (g) => { const l = undoLabel(g); return l ? t('undoWhat', { what: (UNDO_TXT[l] || [l, l])[LANG === 'ar' ? 1 : 0] }) : t('nothingToUndo'); };

/* ---------- board ---------- */
function Tile({ g, cell, onOpen }) {
  if (cell.status === 'empty') return <span className={'tile empty' + (cell.why === 'invalid' ? ' invalid' : '')} aria-label={cell.value + ' · ' + t(cell.why === 'invalid' ? 'tileInvalid' : 'tileEmpty')}><i>{cell.why === 'invalid' ? '⚠' : '∅'}</i></span>;
  if (cell.status === 'done') {
    const r = cell.result || {};
    const team = r.team ? teamById(g, r.team) : null;
    return <span className={'tile done' + (team ? ' won' : '')} style={tStyle(team)} aria-label={cell.value + ' · ' + (team ? teamName(team) : t('nobodyGotIt'))}>{team ? <i className="dot" /> : null}</span>;
  }
  const active = g.current && g.current.cell === cell.id;
  return <button className={'tile open' + (active ? ' active' : '')} disabled={!onOpen} onClick={() => onOpen && onOpen(cell.id)}><span className="num" dir="ltr">{cell.value}</span></button>;
}
function BoardGrid({ g, onOpen, big }) {
  const b = boardOf(g);
  if (!b) return null;
  const rows = [];
  for (let tier = 1; tier <= ROWS; tier++) b.cats.forEach((cat) => { const c = b.cells.find((x) => x.cat === cat.id && x.tier === tier); rows.push(c ? <Tile key={c.id} g={g} cell={c} onOpen={onOpen} /> : <span key={cat.id + tier} className="tile empty" />); });
  return (
    <div className={'board' + (big ? ' big' : '')} style={{ '--cols': b.cats.length }}>
      {b.cats.map((cat) => <header key={cat.id} className="bc-head"><span className="bc-em" aria-hidden="true">{cat.emoji}</span><Txt v={cat.name} className="bc-name" /></header>)}
      {rows}
    </div>
  );
}
function Board({ g, act, onMenu, onTv, onFix }) {
  const team = pickerTeam(g);
  return (
    <div className="app wide boardscreen">
      <TopBar left={<MenuBtn onClick={onMenu} />} title={t('roundLeft', { n: g.round, left: openCells(g).length })} right={<TvButton onTv={onTv} />} dense />
      <ScoreBar g={g} activeId={team.id} label={t('picksShort')} onEdit={onFix} />
      <p className="turnline" style={tStyle(team)}><span>{team.emoji}</span> {t('picksNext', { team: teamName(team) })}</p>
      {g.round === 1 && g.log.length === 0 && g.report && g.report.short > 0 && <p className="warn center">{t('reportShort', { n: g.report.short })}</p>}
      <BoardGrid g={g} onOpen={(id) => act((x) => openCell(x, id, Date.now()))} />
      <p className="hint center">{t('boardHint')}</p>
    </div>
  );
}

/* ---------- a clue ---------- */
function Clock({ g, big }) {
  const cur = g.phase === 'final' ? g.final : g.current;
  const running = !!cur && cur.endsAt != null && cur.pausedLeft == null;
  const now = useNow(running, 200);
  if (!cur || cur.endsAt == null) return null;
  if (g.phase === 'clue' && cur.stage !== 'answer') return null;
  const total = ms((g.phase === 'final' ? g.rules.finalTime : g.rules.answerTime) * 1000);
  const left = timeLeft(g, now);
  const secs = Math.ceil(left / ms(1000));
  const pct = Math.max(0, Math.min(100, (left / total) * 100));
  const out = left <= 0;
  return (
    <div className={'clock' + (secs <= 5 && !out ? ' hot' : '') + (out ? ' out' : '') + (big ? ' big' : '')} role="timer" aria-live="off">
      <span className="ck-n num">{cur.pausedLeft != null ? '⏸ ' + secs : out ? t('timeUp') : secs}</span>
      <span className="ck-bar"><i style={{ width: pct + '%' }} /></span>
    </div>
  );
}
const altList = (q) => (q && q.alt ? [...(q.alt[LANG] || []), ...(q.alt[LANG === 'ar' ? 'en' : 'ar'] || [])] : []);
function ClueCard({ q, big, showAnswer, host, questionForm }) {
  return (
    <div className={'qcard' + (big ? ' big' : '')}>
      <Txt v={q.q} as="p" className="qtext" />
      {questionForm && !showAnswer && <p className="qform">❓ {t('qFormReminder')}</p>}
      {showAnswer && q.a && (
        <div className="qans">
          <span className="eyebrow">{t('response')}</span>
          <Txt v={q.a} as="p" className="atext" both />
          {host && altList(q).length > 0 && <p className="aalt"><b>{t('alsoAccept')}</b> <bdi dir="auto">{altList(q).join(' · ')}</bdi></p>}
          {q.note && <Txt v={q.note} as="p" className="anote" />}
          {host && q.asOf && <p className="aalt">{t('asOf', { d: q.asOf })}</p>}
          {host && questionForm && <p className="aalt">❓ {t('qFormJudge')}</p>}
        </div>
      )}
    </div>
  );
}
function ClueHead({ g, cell }) {
  const cat = catById(g, cell.cat);
  const cur = g.current;
  const risk = cur && cur.cell === cell.id && cur.wager;
  return (
    <div className="qhead">
      <span className="qh-cat">{cat.emoji} <Txt v={cat.name} /></span>
      {risk ? <span className="qh-val risk num">{t('riskIt')}{cur.bet != null ? ' · ' + cur.bet : ''}</span> : <span className="qh-val num" dir="ltr">{cell.value}</span>}
    </div>
  );
}
function ClueStage({ g }) {
  const cur = g.current;
  if (cur.stage === 'reveal') return null;
  const team = cur.team ? teamById(g, cur.team) : null;
  if (cur.stage === 'wager') return <div className="stage s-risk" style={tStyle(team)}><span className="st-em">{team.emoji}</span><b>{t('riskWagering', { team: teamName(team) })}</b></div>;
  if (cur.stage === 'open') return <div className="stage s-open"><span className="st-em">🔔</span><b>{cur.tried.length ? t('othersBuzz') : t('buzzNow')}</b></div>;
  return <div className="stage s-answer" style={tStyle(team)}><span className="st-em">{team.emoji}</span><b>{t('answering', { team: teamName(team) })}</b></div>;
}
function ResultBanner({ g }) {
  const r = g.current.result || {};
  const team = r.team ? teamById(g, r.team) : null;
  const title = { right: t('flashRight'), wrong: t('flashWrong'), none: t('nobodyGotIt'), skipped: t('skipped') }[r.kind];
  return (
    <div className={'result k-' + r.kind} style={tStyle(team)}>
      <b className="rs-t">{title}</b>
      {team && r.points > 0 && <span className="rs-s">{t('pointsTo', { n: r.points, team: teamName(team) })}</span>}
      {team && r.points < 0 && <span className="rs-s">{t('lostPoints', { n: -r.points, team: teamName(team) })}</span>}
    </div>
  );
}
function RiskSplash({ g, big }) {
  const team = teamById(g, g.current.team);
  return (
    <div className={'risksplash' + (big ? ' big' : '')} style={tStyle(team)}>
      <b className="rk-t">{t('riskIt')}</b>
      <span className="rk-s">{t('riskItSub')}</span>
      <span className="rk-team">{team.emoji} <Name team={team} /></span>
    </div>
  );
}
// The picking team's Risk It wager. The clue stays hidden until it's locked in.
function RiskWager({ g, act }) {
  const cur = g.current; const team = teamById(g, cur.team);
  const max = maxRiskWager(g, team.id);
  const [v, setV] = useState('');
  const n = parseInt(String(v).replace(/[^\d]/g, ''), 10);
  const okN = !isNaN(n) && n >= minRiskWager && n <= max;
  const quick = [...new Set([Math.min(max, roundTop(g) / 2), roundTop(g), Math.max(0, team.score), max].filter((x) => x >= 0 && x <= max))].sort((a, b) => a - b);
  return (
    <div className="card stack-sm wagerbox" style={tStyle(team)}>
      <b>{t('riskWagerQ', { team: teamName(team) })}</b>
      <p className="hint" style={{ margin: 0 }}>{t('riskWagerRule', { score: fmtNum(team.score), max })}</p>
      <input className="input wagerin num" type="text" inputMode="numeric" dir="ltr" value={v} placeholder={'0 – ' + max} aria-label={t('wager')} onChange={(e) => setV(e.target.value)} />
      <div className="chips">{quick.map((q) => <button key={q} className="chip" onClick={() => setV(String(q))}>{q === max ? t('allIn', { n: q }) : q}</button>)}</div>
      {v !== '' && !okN && <p className="warn">{t('wagerRange', { max })}</p>}
      <button className="btn btn-gold" disabled={!okN} onClick={() => act((x) => setRiskWager(x, n, Date.now()))}>{t('lockWager')}</button>
    </div>
  );
}
function ClueScreen({ g, act, flash, onMenu, onTv, onWrong, onFix, settings, setSettings }) {
  const cur = g.current; const cell = curCell(g);
  const peek = settings.hostPeek !== false;
  const setPeek = (v) => setSettings({ ...settings, hostPeek: v });
  const reveal = cur.stage === 'reveal';
  const right = () => { const pts = curValue(g); act(markRight); flash({ kind: 'right', team: cur.team, points: pts }); buzz(40); };
  const wrong = () => { const lose = cur.wager ? curValue(g) : g.rules.noMinus ? 0 : curValue(g); act(markWrong); flash({ kind: 'wrong', team: cur.team, points: lose ? -lose : 0 }); buzz(120); };
  const lastOnBoard = openCells(g).filter((c) => c.id !== cell.id).length === 0;
  const tried = (id) => cur.tried.includes(id);
  return (
    <div className="app qscreen">
      <TopBar left={<MenuBtn onClick={onMenu} />} title={t('roundLeft', { n: g.round, left: openCells(g).length })} right={<TvButton onTv={onTv} />} dense />
      <ScoreBar g={g} activeId={cur.team} onEdit={onFix} marks={Object.fromEntries(cur.tried.map((id) => [id, '✕']))} />
      <ClueHead g={g} cell={cell} />
      <ClueStage g={g} />
      {cur.stage === 'wager' ? <>
        <RiskSplash g={g} />
        <RiskWager g={g} act={act} />
        <p className="hint center">{t('riskHidden')}</p>
      </> : <>
        <Clock g={g} />
        <ClueCard q={cell.q} host showAnswer={reveal || peek} questionForm={g.rules.questionForm} />
        {!reveal && <button className="btn btn-ghost btn-sm peek" aria-pressed={peek} onClick={() => setPeek(!peek)}>👁 {peek ? t('hideResponse') : t('showResponse')}</button>}
        {!!cell.q.check && <p className="checkbadge">{t('needsCheck', { d: cell.q.asOf || '?' })}</p>}
        {reveal && <ResultBanner g={g} />}
        {onWrong && <button className="btn btn-sm btn-flag wrongbtn" onClick={() => onWrong(cell.id)}>⚠ {t('thisIsWrong')}</button>}
      </>}
      <div className="actions">
        {cur.stage === 'open' && <>
          <span className="eyebrow span2 center">{t('whoBuzzed')}</span>
          <div className={'buzzgrid span2 n' + g.teams.length}>
            {g.teams.map((tm) => <button key={tm.id} className="btn buzzbtn" style={tStyle(tm)} disabled={tried(tm.id)} onClick={() => act((x) => buzzIn(x, tm.id, Date.now()))}>{tm.emoji} <Name team={tm} />{tried(tm.id) ? ' ✕' : ''}</button>)}
          </div>
          <button className="btn btn-ghost span2" onClick={() => { act(nobody); flash({ kind: 'none' }); }}>{cur.tried.length ? t('nobodyElse') : t('nobody')}</button>
        </>}
        {cur.stage === 'answer' && <>
          <button className="btn btn-wrong" onClick={wrong}>✕ {t('wrong')}</button>
          <button className="btn btn-right" onClick={right}>✓ {t('right')}</button>
          {!cur.wager && <button className="btn btn-ghost btn-sm span2" onClick={() => act(undo)}>↶ {t('wrongTeamTapped')}</button>}
        </>}
        {reveal && <button className="btn btn-gold span2" onClick={() => act((x) => finishClue(x, Date.now()))}>{lastOnBoard ? t('endOfRound') : t('backToBoard')}</button>}
      </div>
    </div>
  );
}

/* ---------- between rounds ---------- */
function Between({ g, act, big, onTv }) {
  const sorted = [...g.teams].sort((a, b) => b.score - a.score);
  const next = hasNextRound(g) ? 'round2' : hasFinal(g) ? 'final' : 'end';
  const firstPicker = teamById(g, lowestFirst(g)[0]);
  return (
    <div className={big ? 'stack' : 'app'}>
      {!big && <TopBar title={t('roundOver', { n: g.round })} right={<TvButton onTv={onTv} />} />}
      <div className="between card stack-sm center">
        <span className="eyebrow">{t('roundOver', { n: g.round })}</span>
        <h2 className="display">{next === 'round2' ? t('nextRound2') : next === 'final' ? t('nextFinal') : t('nextEnd')}</h2>
        {next === 'round2' && <p className="muted" style={{ margin: 0 }}>{t('round2Sub', { team: teamName(firstPicker) })}</p>}
        {next === 'final' && <p className="muted" style={{ margin: 0 }}>{t('finalSub')}</p>}
      </div>
      <ScoreBar g={{ ...g, teams: sorted }} big={big} />
      {act && <button className="btn btn-gold" onClick={() => act((x) => nextStage(x, Date.now()))}>{next === 'round2' ? t('startRound2') : next === 'final' ? t('startFinal') : t('seeResults')}</button>}
      {act && undoLabel(g) && <button className="btn btn-ghost" onClick={() => act(undo)}>↶ {undoText(g)}</button>}
    </div>
  );
}

/* ---------- results ---------- */
function Winner({ g, big }) {
  const w = winners(g);
  if (!w.length) return <div className={'winner draw' + (big ? ' big' : '')}><span className="eyebrow">{t('finalScores')}</span><h2 className="display">{t('itsADraw')}</h2></div>;
  return (
    <div className={'winner' + (big ? ' big' : '')} style={tStyle(w[0])}>
      <span className="w-crown">👑</span>
      <span className="eyebrow">{w.length > 1 ? t('sharedWin') : t('winnerIs')}</span>
      <h2 className="display">{w.map((tm, i) => <span key={tm.id}>{i ? ' & ' : ''}{tm.emoji} <Name team={tm} /></span>)}</h2>
      <span className="w-score num" dir="ltr">{fmtNum(w[0].score)}</span>
    </div>
  );
}
function GameLog({ g }) {
  return (
    <details className="card">
      <summary className="label">{t('gameLog')}</summary>
      <ol className="glog">
        {g.log.map((e, i) => {
          const tm = e.team ? teamById(g, e.team) : null;
          const c = e.cat ? catById(g, e.cat) : null;
          const pre = c ? <span className="muted">{c.emoji} {pick(c.name)} {e.value}{e.wager ? ' · ' + t('riskIt') + ' ' + e.bet : ''} · </span> : null;
          if (e.kind === 'clue') {
            const ch = (e.changes || []).map((x, k) => { const xt = teamById(g, x.team); return <span key={k}>{k ? ', ' : ''}{teamName(xt)} <span dir="ltr">{x.delta > 0 ? '+' : '−'}{Math.abs(x.delta)}</span></span>; });
            const tried = (e.tried || []).filter((id) => !(e.changes || []).some((x) => x.team === id));
            return <li key={i} className={e.void ? 'lg-void' : undefined}>{pre}<span dir="auto">{ch.length ? ch : e.result === 'skipped' ? t('skipped') : t('nobodyGotIt')}{tried.length ? ' · ' + tried.map((id) => teamName(teamById(g, id)) + ' ✕').join(', ') : ''}</span>{e.void ? <span className="muted"> {t('logVoid')}</span> : null}</li>;
          }
          if (e.kind === 'adjust') return <li key={i}>{t('logAdjust', { team: teamName(tm), d: (e.points > 0 ? '+' : '') + e.points })}</li>;
          if (e.kind === 'round-end' || e.kind === 'round-cut') return <li key={i} className="lg-round">— {t('roundOver', { n: e.round })}{e.kind === 'round-cut' ? ' (' + t('cutShort', { n: e.left }) + ')' : ''} —</li>;
          if (e.kind === 'final') return <li key={i} className={e.void ? 'lg-void' : undefined}><span className="muted">{t('finalWager')} · </span><span dir="auto">{teamName(tm)} {e.right ? '✓' : '✕'} <span dir="ltr">{e.delta >= 0 ? '+' : '−'}{Math.abs(e.delta)}</span></span></li>;
          if (e.kind === 'invalid') return <li key={i} className="lg-invalid">{e.where === 'final' ? <span className="muted">{t('finalWager')} · </span> : pre}⚠ {e.replaced ? t('logInvalidRep') : t('logInvalid')}{(e.refunds || []).map((r, k) => <span key={k} className="muted"> · {teamName(teamById(g, r.team))} <span dir="ltr">{r.delta > 0 ? '+' : '−'}{Math.abs(r.delta)}</span></span>)}</li>;
          return null;
        })}
      </ol>
    </details>
  );
}
function Results({ g, act, onHome, onAgain, onFlagPlayed, onFix, onTv }) {
  const sorted = [...g.teams].sort((a, b) => b.score - a.score);
  const s = gameStats(g);
  const br = s.bestRisk; const brTeam = br ? teamById(g, br.team) : null;
  return (
    <div className="app">
      <TopBar onBack={onHome} title={t('resultsTitle')} right={<TvButton onTv={onTv} />} />
      <Winner g={g} />
      <section className="stack-sm">
        <span className="eyebrow">{t('finalScores')}</span>
        {sorted.map((tm, i) => {
          const st = s.list.find((x) => x.team.id === tm.id);
          return (
            <div key={tm.id} className="frow" style={tStyle(tm)}>
              <span className="fr-rk num">{i + 1}</span>
              <span className="grow fr-n">{tm.emoji} <Name team={tm} /><small className="muted"> · {t('rightShort')} {st.right} · {t('wrongShort')} {st.wrong}</small></span>
              <b className="fr-s num" dir="ltr">{fmtNum(tm.score)}</b>
            </div>
          );
        })}
      </section>
      {br && brTeam && <div className="stat" style={tStyle(brTeam)}><span className="k">{t('bestRisk')}</span><span className="v num">{br.bet}</span><span className="d" dir="auto">{teamName(brTeam)}</span></div>}
      <GameLog g={g} />
      {onFix && <button className="btn btn-sm" onClick={onFix}>± {t('fixScores')}</button>}
      {onFlagPlayed && <button className="btn btn-sm btn-flag" onClick={onFlagPlayed}>⚠ {t('flagPlayed')}</button>}
      <button className="btn btn-gold" onClick={onAgain}>{t('playAgain')}</button>
      <p className="hint center" style={{ marginTop: -8 }}>{t('playAgainSub')}</p>
      <div className="row">
        <button className="btn grow" onClick={onHome}>{t('home')}</button>
        {undoLabel(g) && <button className="btn btn-ghost grow" onClick={() => act(undo)}>↶ {t('undo')}</button>}
      </div>
    </div>
  );
}

/* ---------- menu + fix scores ---------- */
function FixScores({ g, act, onClose }) {
  const [step, setStep] = useState(g.rules.values[0]);
  const [exact, setExact] = useState({});
  const lastIsFix = undoLabel(g) === 'adjust';
  const steps = [...new Set([g.rules.values[0], g.rules.values[1], g.rules.values[2], g.rules.values[4]])];
  const setTo = (tm) => {
    const v = parseInt(String(exact[tm.id] || '').replace(/[^\d-]/g, ''), 10);
    if (isNaN(v)) return;
    act((x) => adjustScore(x, tm.id, v - teamById(x, tm.id).score));
    setExact({ ...exact, [tm.id]: '' });
  };
  return (
    <Sheet onClose={onClose}>
      <div className="stack">
        <h2 className="display">{t('fixScores')}</h2>
        <p className="hint" style={{ margin: 0 }}>{t('fixScoresSub')}</p>
        <div className="field"><span className="label">{t('fixStep')}</span><Seg value={step} options={steps.map((n) => [n, String(n)])} onChange={setStep} label={t('fixStep')} /></div>
        {g.teams.map((tm) => (
          <div key={tm.id} className="fixteam stack-sm" style={tStyle(tm)}>
            <div className="fixrow">
              <span className="grow">{tm.emoji} <Name team={tm} /></span>
              <button className="mini" aria-label={'−' + step + ' ' + teamName(tm)} onClick={() => act((x) => adjustScore(x, tm.id, -step))}>−</button>
              <b className="num fx-s" dir="ltr">{fmtNum(tm.score)}</b>
              <button className="mini" aria-label={'+' + step + ' ' + teamName(tm)} onClick={() => act((x) => adjustScore(x, tm.id, step))}>+</button>
            </div>
            <div className="row fixexact">
              <input className="input" type="text" inputMode="numeric" dir="ltr" placeholder={t('setScoreTo')} aria-label={t('setScoreFor', { team: teamName(tm) })} value={exact[tm.id] || ''}
                onChange={(e) => setExact({ ...exact, [tm.id]: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') setTo(tm); }} />
              <button className="btn btn-sm" disabled={!exact[tm.id]} onClick={() => setTo(tm)}>{t('setScore')}</button>
            </div>
          </div>
        ))}
        {lastIsFix && <button className="btn btn-ghost" onClick={() => act(undo)}>↶ {t('undoLastFix')}</button>}
        <p className="hint" style={{ margin: 0 }}>{t('fixWrongTip')}</p>
        <button className="btn btn-gold" onClick={onClose}>{t('close')}</button>
      </div>
    </Sheet>
  );
}
function GameMenu({ g, act, onClose, onHome, onFlagPlayed, onFix, sound, onSound }) {
  const [ask, setAsk] = useState(null);
  const cur = g.phase === 'final' ? g.final : g.current;
  const inClue = g.phase === 'clue' && g.current && g.current.stage !== 'reveal';
  const clockOn = cur && cur.endsAt != null && (g.phase !== 'final' || g.final.stage === 'clue');
  const run = (fn) => { act(fn); onClose(); };
  if (ask === 'end') return <Confirm title={t('endGameQ')} body={t('endGameBody')} yes={t('endGame')} danger onYes={() => act((x) => endGame(x, Date.now()))} onClose={onClose} />;
  if (ask === 'round') return <Confirm title={t('endRoundQ')} body={t('endRoundBody', { n: openCells(g).length })} yes={t('endRound')} onYes={() => act((x) => endRound(x, Date.now()))} onClose={onClose} />;
  return (
    <Sheet onClose={onClose}>
      <div className="stack-sm">
        <h2 className="display">{t('menu')}</h2>
        <button className="btn" disabled={!undoLabel(g)} onClick={() => run(undo)}>↶ {undoText(g)}</button>
        {clockOn && (cur.pausedLeft == null
          ? <button className="btn" onClick={() => run((x) => pauseTimer(x, Date.now()))}>⏸ {t('pause')}</button>
          : <button className="btn" onClick={() => run((x) => resumeTimer(x, Date.now()))}>▶ {t('resume')}</button>)}
        {inClue && !g.current.changes.length && !g.current.tried.length && (g.current.stage === 'open' || g.current.stage === 'wager') && <button className="btn menu2" onClick={() => run(putBack)}><span>↩ {t('putBack')}</span><small>{t('putBackSub')}</small></button>}
        {inClue && <button className="btn" onClick={() => run(skipClue)}>⏭ {t('skipClue')}</button>}
        {g.phase === 'board' && <button className="btn" onClick={() => setAsk('round')}>⏩ {t('endRound')}</button>}
        <button className="btn" onClick={() => { onClose(); onFix(); }}>± {t('fixScores')}</button>
        {onSound && <button className="btn" aria-pressed={!!(sound && sound.muted)} onClick={() => onSound({ ...sound, muted: !(sound && sound.muted) })}>{sound && sound.muted ? '🔇 ' + t('sndUnmute') : '🔊 ' + t('sndMute')}</button>}
        {onFlagPlayed && <button className="btn btn-flag" onClick={() => { onClose(); onFlagPlayed(); }}>⚠ {t('flagPlayed')}</button>}
        <button className="btn btn-danger" onClick={() => setAsk('end')}>🏁 {t('endGame')}</button>
        <button className="btn btn-ghost menu2" onClick={() => { onClose(); onHome(); }}><span>🏠 {t('quitHome')}</span><small>{t('quitHomeSub')}</small></button>
        <button className="btn btn-ghost" onClick={onClose}>{t('close')}</button>
      </div>
    </Sheet>
  );
}
