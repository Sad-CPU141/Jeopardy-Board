/* ============================================================
   "THIS IS WRONG": the host flags a broken / wrong clue (adapted from Khatfa).
   The sheet shows exactly which score changes will be reversed and what replaces
   the clue, then applies it as ONE engine step (invalidateClue), which is
   idempotent and undoable.
   ============================================================ */
const fmtDelta = (d) => (d > 0 ? '+' : '−') + Math.abs(d);

function WrongSheet({ g, where, ctx, act, onClose, onDone }) {
  const isFinal = where === 'final';
  const cell = isFinal ? null : cellById(g, where);
  const q = isFinal ? g.final && g.final.q : cell && cell.q;
  const qid = q && q.id;
  const [reason, setReason] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  // Worked out once, so what the host sees is exactly what happens.
  const plan = useMemo(() => {
    if (!q) return null;
    const c = ctx();
    const catId = isFinal ? g.final.cat.id : cell.cat;
    const tier = isFinal ? q.tier : cell.tier;
    const canRep = isFinal || canReplaceCell(g, where);
    return { refunds: invalidRefunds(g, where), rep: canRep ? findReplacement(g, catId, tier, isFinal ? { ...c, textOnly: true } : c) : null, canRep };
  }, [where, qid]);
  const [useRep, setUseRep] = useState(true);
  if (!q || !plan) return null;
  const refunding = plan.refunds.length > 0;
  const chosen = plan.rep && (useRep || isFinal) ? plan.rep : 'empty';
  const go = () => {
    if (busy) return; setBusy(true);
    const rec = { qid, reason: reason || 'other', note, replacement: chosen, now: Date.now() };
    act((x) => invalidateClue(x, where, rec));
    onDone && onDone({ where, q, value: cell ? cell.value : null, rec, refunds: plan.refunds, refunded: refunding });
    onClose();
  };
  const catLabel = (id) => { const c = catById(g, id) || (ctx().bank.cats.find((x) => x.id === id)); return c ? c.emoji + ' ' + pick(c.name) : id; };
  const blocked = isFinal && !plan.rep;
  return (
    <Sheet onClose={onClose}>
      <div className="stack wrongsheet">
        <h2 className="display" style={{ fontSize: 28 }}>⚠ {t('wrongTitle')}</h2>
        <div className="card wq"><span className="small muted">{isFinal ? t('finalWager') : catLabel(cell.cat) + ' · ' + cell.value}</span><Txt v={q.q} as="p" className="wq-q" /><span className="small muted">→ <Txt v={q.a} /></span></div>
        <span className="label">{t('whyWrong')}</span>
        <div className="chips">
          {INVALID_REASONS.map((r) => <button key={r} className={'chip' + (reason === r ? ' on' : '')} aria-pressed={reason === r} onClick={() => setReason(reason === r ? null : r)}>{t('reason_' + r)}</button>)}
        </div>
        <input className="input" dir="auto" maxLength={300} value={note} placeholder={t('wrongNote')} aria-label={t('wrongNote')} onChange={(e) => setNote(e.target.value)} />
        <div className={'card refundbox' + (refunding ? ' on' : '')}>
          {refunding ? <>
            <b>{t('willRefund')}</b>
            <ul>{plan.refunds.map((r, i) => { const tm = teamById(g, r.team); return <li key={i} style={tStyle(tm)}><span className="dot" /> <span dir="auto">{t('refundLine', { team: teamName(tm), d: fmtDelta(r.delta) })}</span> <span className="muted num" dir="ltr">({tm.score} → {tm.score + r.delta})</span></li>; })}</ul>
          </> : <span>{t('noRefund')}</span>}
        </div>
        {plan.rep ? (
          isFinal ? <p className="repline">🔁 {t(plan.rep.how === 'same' ? 'repFinalSame' : 'repFinalOther', { cat: catLabel(plan.rep.q.cat) })}</p> : <>
            <Toggle on={useRep} onChange={setUseRep} title={t(plan.rep.how === 'same' ? 'repSame' : 'repOther', { cat: catLabel(plan.rep.q.cat) })} sub={useRep ? (g.current && g.current.cell === where ? t('repNow') : t('repBoard')) : t('repEmpty')} />
          </>
        ) : <p className="hint" style={{ margin: 0 }}>{blocked ? t('repFinalNone') : plan.canRep ? t('repNone') : t('repPlayedOnly')}</p>}
        <div className="row">
          <button className="btn btn-ghost grow" onClick={onClose}>{t('cancel')}</button>
          <button className="btn btn-flag solid grow" disabled={busy || blocked} onClick={go}>{refunding ? t('reverseIt') : t('removeIt')}</button>
        </div>
      </div>
    </Sheet>
  );
}

// Choose an already-played clue to flag (from the menu or the results screen).
function PlayedList({ g, onPick, onClose }) {
  const order = {}; g.log.forEach((e, i) => { if (e.kind === 'clue' && !e.void) order[e.cell] = i; });
  const played = (g.boards || []).flatMap((b) => b.cells).filter((c) => c.status === 'done' && c.q && !isInvalidated(g, c.q.id)).sort((a, b) => (order[b.id] || 0) - (order[a.id] || 0));
  const finalOk = g.phase === 'final' && g.final && g.final.q && ['clue', 'judge', 'done'].includes(g.final.stage);
  return (
    <Sheet onClose={onClose}>
      <div className="stack-sm">
        <h2 className="display" style={{ fontSize: 28 }}>⚠ {t('flagPlayed')}</h2>
        <p className="hint" style={{ margin: 0 }}>{t('flagPlayedSub')}</p>
        {finalOk && <button className="optrow played" onClick={() => onPick('final')}><span className="pl-v">★</span><span className="grow"><span className="small muted">{t('finalWager')}</span><Txt v={g.final.q.q} as="span" className="pl-q" /></span></button>}
        {!played.length && !finalOk && <p className="hint center">{t('noPlayed')}</p>}
        {played.map((c) => {
          const tm = c.result && c.result.team ? teamById(g, c.result.team) : null; const cat = catById(g, c.cat);
          return (
            <button key={c.id} className="optrow played" onClick={() => onPick(c.id)}>
              <span className="pl-v num">{c.value}</span>
              <span className="grow"><span className="small muted">{cat ? cat.emoji + ' ' + pick(cat.name) : c.cat}{tm ? ' · ' + teamName(tm) : ''}</span><Txt v={c.q.q} as="span" className="pl-q" /></span>
            </button>
          );
        })}
        <button className="btn btn-ghost" onClick={onClose}>{t('close')}</button>
      </div>
    </Sheet>
  );
}

/* ---------- the device's reported-clues list (kept apart from games) ---------- */
const ISSUES_MAX = 500;
function issueEntry(g, info) {
  const q = info.q;
  return { id: uid(), at: info.rec.now, gameId: g.id, qid: q.id, cat: q.cat, tier: q.tier, value: info.value, where: info.where === 'final' ? 'final' : 'board',
    q: q.q, a: q.a, ref: q.ref || null, reason: info.rec.reason, note: info.rec.note || '', refunds: info.refunds };
}
function addIssue(list, entry) {
  if ((list || []).some((x) => x.gameId === entry.gameId && x.qid === entry.qid)) return list; // once per game
  return [entry, ...(list || [])].slice(0, ISSUES_MAX);
}
