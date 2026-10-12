/* ============================================================
   SHARED UI (same building blocks as Khatfa and Draft Night) + home, setup, how to play
   ============================================================ */
class Boundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err) { try { console.error(err); } catch (e) {} }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="app"><div className="card stack">
        <h2 className="display">{t('crashed')}</h2>
        <p className="muted" style={{ margin: 0 }}>{t('crashedSub')}</p>
        <button className="btn btn-gold" onClick={() => location.reload()}>{t('reload')}</button>
        <pre className="errtxt">{String(this.state.err && (this.state.err.message || this.state.err))}</pre>
      </div></div>
    );
  }
}

function Sheet({ onClose, children, center }) {
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  return (
    <div className={'backdrop' + (center ? ' center' : '')} onClick={onClose}>
      <div className={center ? 'modal' : 'sheet'} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {!center && <div className="grab" />}
        {children}
      </div>
    </div>
  );
}
function Confirm({ title, body, yes, danger, onYes, onClose }) {
  return (
    <Sheet center onClose={onClose}>
      <h2 className="display" style={{ fontSize: 30 }}>{title}</h2>
      {body && <p className="muted" style={{ margin: 0 }}>{body}</p>}
      <div className="row">
        <button className="btn btn-ghost grow" onClick={onClose}>{t('cancel')}</button>
        <button className={'btn grow ' + (danger ? 'btn-danger solid' : 'btn-gold')} onClick={() => { onYes(); onClose(); }}>{yes || t('confirm')}</button>
      </div>
    </Sheet>
  );
}
const backArrow = () => (LANG === 'ar' ? '→' : '←');
function TopBar({ onBack, left, title, right, dense }) {
  return (
    <div className={'topbar' + (dense ? ' dense' : '')}>
      {left || (onBack ? <button className="iconbtn" onClick={onBack} aria-label={t('back')}>{backArrow()}</button> : <span className="iconspace" />)}
      <div className="title">{title}</div>
      {right || <span className="iconspace" />}
    </div>
  );
}
const MenuBtn = ({ onClick }) => <button className="iconbtn" onClick={onClick} aria-label={t('menu')}>☰</button>;
function Seg({ value, options, onChange, label }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([v, l]) => <button key={String(v)} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>{l}</button>)}
    </div>
  );
}
function Toggle({ on, onChange, title, sub }) {
  return (
    <button type="button" className="toggle" aria-pressed={on} onClick={() => onChange(!on)}>
      <span className="grow"><b className="tgl-t">{title}</b>{sub && <span className="small muted">{sub}</span>}</span>
      <span className="sw" />
    </button>
  );
}
function Toast({ msg, ok, onClose }) {
  useEffect(() => { if (!ok) return undefined; const id = setTimeout(onClose, 3500); return () => clearTimeout(id); }, [msg, ok]);
  return <div className={'toast' + (ok ? ' ok' : '')} role="status"><span className="grow">{msg}</span><button onClick={onClose}>{t('dismiss')}</button></div>;
}
function LangButton({ settings, setSettings }) {
  return <button className="pillbtn langbtn" onClick={() => setSettings({ ...settings, lang: settings.lang === 'ar' ? 'en' : 'ar' })} aria-label={t('langSwitchLabel')} lang={LANG === 'ar' ? 'en' : 'ar'}>{t('langSwitch')}</button>;
}

/* ---------- bilingual content ---------- */
const QLangCtx = React.createContext('auto');
function Txt({ v, as = 'span', className, both }) {
  const qLang = React.useContext(QLangCtx);
  const Tag = as;
  const main = pick(v, LANG);
  const other = LANG === 'ar' ? 'en' : 'ar';
  const showOther = (both || qLang === 'both') && v && typeof v === 'object' && v[other] && v[other].trim() && v[other].trim() !== main;
  return (
    <Tag className={className}>
      <span dir="auto" lang={looksArabic(main) ? 'ar' : 'en'}>{main}</span>
      {showOther && <span className="alt" dir="auto" lang={other}>{v[other].trim()}</span>}
    </Tag>
  );
}
const Name = ({ team }) => <bdi dir="auto">{teamName(team)}</bdi>;
const fmtNum = (n) => (n < 0 ? '−' : '') + Math.abs(n);

/* ---------- scores ---------- */
function AnimatedNumber({ value }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (shown === value) return undefined;
    if (reducedMotion()) { setShown(value); from.current = value; return undefined; }
    const start = performance.now(); const a = from.current; const dur = 700;
    let raf;
    const step = (now) => {
      const k = Math.min(1, (now - start) / dur); const e = 1 - Math.pow(1 - k, 3);
      const v = Math.round(a + (value - a) * e); setShown(v);
      if (k < 1) raf = requestAnimationFrame(step); else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); from.current = value; };
  }, [value]);
  return <span className="num" dir="ltr">{fmtNum(shown)}</span>;
}
function useDelta(value) {
  const prev = useRef(value); const [d, setD] = useState(null);
  useEffect(() => { if (value !== prev.current) { setD({ n: value - prev.current, k: Date.now() }); prev.current = value; } }, [value]);
  useEffect(() => { if (!d) return undefined; const id = setTimeout(() => setD(null), 1600); return () => clearTimeout(id); }, [d]);
  return d;
}
function ScoreCard({ team, active, label, big, onEdit, mark }) {
  const d = useDelta(team.score);
  const El = onEdit ? 'button' : 'div';
  return (
    <El className={'scard' + (active ? ' active' : '') + (big ? ' big' : '') + (onEdit ? ' editable' : '') + (team.score < 0 ? ' neg' : '')} style={tStyle(team)} onClick={onEdit || undefined} aria-label={onEdit ? t('editScoreOf', { team: teamName(team) }) : undefined} type={onEdit ? 'button' : undefined}>
      {onEdit && <span className="s-edit" aria-hidden="true">✎</span>}
      <span className="s-em" aria-hidden="true">{team.emoji}</span>
      <span className="s-name"><Name team={team} /></span>
      <span className="s-score"><AnimatedNumber value={team.score} /></span>
      {active && label && <span className="s-turn">{label}</span>}
      {mark && <span className="s-mark">{mark}</span>}
      {d && <span key={d.k} dir="ltr" className={'s-delta' + (d.n < 0 ? ' neg' : '')}>{d.n > 0 ? '+' : '−'}{Math.abs(d.n)}</span>}
    </El>
  );
}
function ScoreBar({ g, activeId, label, big, onEdit, marks }) {
  return (
    <div className={'scorebar n' + g.teams.length + (big ? ' big' : '')}>
      {g.teams.map((tm) => <ScoreCard key={tm.id} team={tm} active={tm.id === activeId} label={label} big={big} onEdit={onEdit} mark={marks && marks[tm.id]} />)}
    </div>
  );
}

/* ---------- flash: right / wrong / Risk It ---------- */
function Flash({ f, g, onDone }) {
  useEffect(() => { const id = setTimeout(onDone, ms(f.kind === 'risk' ? 2000 : 1300)); return () => clearTimeout(id); }, [f]);
  const team = f.team && g ? teamById(g, f.team) : null;
  const big = { right: t('flashRight'), wrong: t('flashWrong'), none: t('flashNone'), risk: t('riskIt'), invalid: '⚠ ' + t('flashInvalid') }[f.kind];
  return (
    <div className={'flash k-' + f.kind} onClick={onDone} role="status" aria-live="assertive" style={tStyle(team)}>
      <div className="inner">
        <div className="big">{big}</div>
        {f.kind === 'risk' && <div className="fl-sub">{t('riskItSub')}</div>}
        {team && f.points > 0 && <div className="to">{t('pointsTo', { n: f.points, team: teamName(team) })}</div>}
        {team && f.points < 0 && <div className="to">{t('lostPoints', { n: -f.points, team: teamName(team) })}</div>}
        {team && f.kind === 'risk' && <div className="to">{team.emoji} {teamName(team)}</div>}
      </div>
    </div>
  );
}

/* ---------- logo: a 3×3 clue board, one square lit in lime (a hidden Risk It square) ---------- */
function LogoMark({ size = 64 }) {
  const tiles = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) tiles.push([10 + c * 15, 12 + r * 15, r === 1 && c === 2]);
  return (
    <svg className="logomark" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect x="2" y="2" width="60" height="60" rx="14" fill="#221d47" stroke="#3d3672" strokeWidth="2" />
      {tiles.map(([x, y, lit], i) => <rect key={i} x={x} y={y} width="13" height="12" rx="3" fill={lit ? '#b6f23d' : '#ffc83d'} />)}
    </svg>
  );
}
function Logo() {
  return <h1 className="logo"><span className="en" lang="en">{APP_NAME.en}</span>{APP_NAME.ar && <span className="ar" lang="ar">{APP_NAME.ar}</span>}</h1>;
}

/* ============================================================
   HOME
   ============================================================ */
function Home({ game, past, settings, setSettings, onNew, onContinue, onHow, onSettings, bank }) {
  const p = usePwa();
  const live = game && game.phase !== 'done' ? game : null;
  const where = live ? (live.phase === 'final' ? t('resumeFinal') : t('resumeRound', { n: live.round, left: openCells(live).length })) : '';
  return (
    <div className="app">
      <div className="topbar">
        <LangButton settings={settings} setSettings={setSettings} />
        <div className="title" />
        <button className="iconbtn" onClick={onSettings} aria-label={t('settings')}>⚙️</button>
      </div>
      <div className="hero">
        <span className="tag"><i />{t('gameNight')}</span>
        <LogoMark size={84} />
        <Logo />
        <p className="muted tagline">{t('tagline')}</p>
      </div>
      {p.updateReady && <div className="card row update"><span className="grow">{t('updateReady')}</span><button className="btn btn-sm btn-gold" onClick={() => p.applyUpdate()}>{t('reload')}</button></div>}
      <div className="menu">
        {live && (
          <button className="card resume rowbtn" onClick={onContinue}>
            <span className="r-em">▶️</span>
            <span className="grow">
              <b className="r-t">{t('continueGame')}</b>
              <span className="small muted r-s">{live.teams.map((tm) => teamName(tm)).join(' · ')} — {where}</span>
            </span>
          </button>
        )}
        <button className="btn btn-gold" onClick={onNew}>{t('newGame')}</button>
        <div className="row">
          <button className="btn grow" onClick={onHow}>{t('howToPlay')}</button>
          <button className="btn grow" onClick={onSettings}>{t('settings')}</button>
        </div>
        {p.canPrompt && <button className="btn btn-ghost" onClick={() => p.prompt()}>📲 {t('install')}</button>}
      </div>
      <p className="hint center">{bank && t('bankNote', { q: bank.total, c: bank.cats.length })}</p>
      {past.length > 0 && (
        <section className="stack-sm">
          <span className="eyebrow">{t('pastGames')}</span>
          {past.slice(0, 5).map((g) => {
            const w = winners(g);
            return (
              <div key={g.id} className="pastrow">
                <span className="grow">{g.teams.map((tm, i) => <span key={tm.id}>{i ? ' · ' : ''}{tm.emoji} <Name team={tm} /> <b className="num" dir="ltr">{fmtNum(tm.score)}</b></span>)}</span>
                <span className="small muted">{w.length ? <>{w[0].emoji} {t('won')}</> : t('draw')}</span>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

/* ============================================================
   HOW TO PLAY
   ============================================================ */
function HowTo({ onClose }) {
  const lines = LANG === 'ar' ? S.howBody[1] : S.howBody[0];
  return (
    <Sheet onClose={onClose}>
      <div className="stack">
        <h2 className="display">{t('howToPlay')}</h2>
        <ol className="howlist">{lines.map((l, i) => <li key={i}>{l}</li>)}</ol>
        <button className="btn btn-gold" onClick={onClose}>{t('close')}</button>
      </div>
    </Sheet>
  );
}

/* ============================================================
   SETUP: teams + rules
   ============================================================ */
const freshTeams = () => [
  { name: t('defaultTeam1'), color: COLORS[0], emoji: EMOJIS[0] },
  { name: t('defaultTeam2'), color: COLORS[1], emoji: EMOJIS[1] },
];
function TeamEditor({ team, i, onChange, others, onRemove }) {
  const used = new Set(others.map((o) => o.color));
  return (
    <div className="teamedit" style={tStyle(team)}>
      <div className="row">
        <button className="emo" aria-label={t('changeEmoji')} onClick={() => onChange({ ...team, emoji: EMOJIS[(EMOJIS.indexOf(team.emoji) + 1) % EMOJIS.length] })}>{team.emoji}</button>
        <input className="input grow" dir="auto" maxLength={18} value={team.name} aria-label={t('teamN', { n: i + 1 })} placeholder={t('teamN', { n: i + 1 })} onChange={(e) => onChange({ ...team, name: e.target.value })} />
        {onRemove && <button className="mini" aria-label={t('removeTeam', { n: i + 1 })} onClick={onRemove}>✕</button>}
      </div>
      <div className="chips swatches" role="group" aria-label={t('colour')}>
        {COLORS.map((c) => <button key={c} className={'swatch' + (team.color === c ? ' on' : '')} disabled={used.has(c)} style={{ background: c }} aria-label={t('colour') + ' ' + c} aria-pressed={team.color === c} onClick={() => onChange({ ...team, color: c })} />)}
      </div>
    </div>
  );
}
function Section({ icon, title, sub, children, startOpen }) {
  const [open, setOpen] = useState(!!startOpen);
  return (
    <section className="rsec">
      <button className="rtitle" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="re">{icon}</span>
        <span className="grow"><b>{title}</b>{sub && <span className="small muted rsum">{sub}</span>}</span>
        <span className="chev">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="rbody stack">{children}</div>}
    </section>
  );
}
const VALUE_PRESETS = [[200, 400, 600, 800, 1000], [100, 200, 300, 400, 500], [1, 2, 3, 4, 5]];
function ValuesEditor({ values, onChange }) {
  const [txt, setTxt] = useState(values.map(String));
  useEffect(() => { setTxt(values.map(String)); }, [values.join(',')]);
  const commit = (list) => { const nums = list.map((s) => parseInt(String(s).replace(/[^\d]/g, ''), 10)); if (nums.every((n) => n > 0 && n <= MAX_VALUE)) onChange(nums); };
  return (
    <div className="field">
      <span className="label">{t('values')}</span>
      <div className="valgrid">
        {txt.map((s, i) => <input key={i} className="input num" type="text" inputMode="numeric" dir="ltr" aria-label={t('rowN', { n: i + 1 })} value={s}
          onChange={(e) => { const nx = txt.map((x, j) => (j === i ? e.target.value : x)); setTxt(nx); commit(nx); }} />)}
      </div>
      <div className="chips">{VALUE_PRESETS.map((p) => <button key={p.join()} className={'chip' + (p.join() === values.join() ? ' on' : '')} onClick={() => onChange(p)}>{p.join(' · ')}</button>)}</div>
      <p className="hint">{t('valuesSub', { r2: values.map((v) => v * 2).join(' / ') })}</p>
    </div>
  );
}
function Setup({ initial, bank, onBack, onStart }) {
  const [teams, setTeams] = useState(() => (initial && initial.teams && initial.teams.length >= 2 ? initial.teams : freshTeams()));
  const [rules, setRules] = useState(() => cleanRules(initial && initial.rules));
  const [browse, setBrowse] = useState(false);
  const set = (k, v) => setRules(cleanRules({ ...rules, [k]: v }));
  const usable = usableCats(bank, rules).length;
  const need = catsNeeded(rules);
  const problems = [];
  if (teams.some((tm) => !tm.name.trim())) problems.push(t('needNames'));
  if (!valuesAscending(rules.values)) problems.push(t('needAscending'));
  if (usable < need) problems.push(t('needCats', { have: usable, need }));
  const addTeam = () => { const used = new Set(teams.map((x) => x.color)); const color = COLORS.find((c) => !used.has(c)); setTeams([...teams, { name: t('teamN', { n: teams.length + 1 }), color, emoji: EMOJIS[teams.length % EMOJIS.length] }]); };
  const mods = [rules.noMinus && t('noMinus'), rules.answerClock && t('answerClock'), rules.strict && t('strictRepeats')].filter(Boolean);
  return (
    <div className="app">
      <TopBar onBack={onBack} title={t('setupTitle')} />
      <section className="stack">
        <span className="eyebrow">{t('teams')}</span>
        {teams.map((tm, i) => <TeamEditor key={i} team={tm} i={i} others={teams.filter((_, j) => j !== i)} onChange={(x) => setTeams(teams.map((y, j) => (j === i ? x : y)))} onRemove={teams.length > 2 ? () => setTeams(teams.filter((_, j) => j !== i)) : null} />)}
        {teams.length < 4 && <button className="btn btn-ghost btn-sm" style={{ width: '100%' }} onClick={addTeam}>＋ {t('addTeam')}</button>}
      </section>
      <section className="card stack-sm">
        <span className="eyebrow">{t('categories')}</span>
        <div className="row"><span className="packem">📚</span><b className="grow">{t('catsOn', { n: usable, of: bank.cats.length })}</b><span className="small muted num">{t('catsPerGame', { n: need })}</span></div>
        <button className="btn btn-sm" style={{ width: '100%' }} onClick={() => setBrowse(true)}>{t('chooseCats')}</button>
        <p className="hint">{t('catsRandom')}</p>
      </section>
      <Section icon="⚙️" title={t('gameRules')} sub={t('rulesSummary', { r: rules.rounds, f: rules.final ? t('withFinal') : t('noFinal'), v: rules.values.join('/') })} startOpen>
        <div className="field"><span className="label">{t('rounds')}</span>
          <Seg value={rules.rounds} options={[[1, t('oneRound')], [2, t('twoRounds')]]} onChange={(v) => set('rounds', v)} label={t('rounds')} /></div>
        <ValuesEditor values={rules.values} onChange={(v) => set('values', v)} />
        <Toggle on={rules.final} onChange={(v) => set('final', v)} title={t('finalRound')} sub={t('finalRoundSub')} />
        {rules.final && <div className="field"><span className="label">{t('finalTime')}</span>
          <Seg value={rules.finalTime} options={FINAL_TIMES.map((n) => [n, t('seconds', { n })])} onChange={(v) => set('finalTime', v)} label={t('finalTime')} /></div>}
        <Toggle on={rules.questionForm} onChange={(v) => set('questionForm', v)} title={t('questionForm')} sub={t('questionFormSub')} />
      </Section>
      <Section icon="🧩" title={t('modifiers')} sub={mods.length ? mods.join(' · ') : t('modifiersOff')}>
        <Toggle on={rules.noMinus} onChange={(v) => set('noMinus', v)} title={t('noMinus')} sub={t('noMinusSub')} />
        <Toggle on={rules.answerClock} onChange={(v) => set('answerClock', v)} title={t('answerClock')} sub={t('answerClockSub')} />
        {rules.answerClock && <div className="field"><span className="label">{t('answerTime')}</span>
          <Seg value={rules.answerTime} options={ANSWER_TIMES.map((n) => [n, t('seconds', { n })])} onChange={(v) => set('answerTime', v)} label={t('answerTime')} /></div>}
        <Toggle on={rules.strict} onChange={(v) => set('strict', v)} title={t('strictRepeats')} sub={t('strictRepeatsSub')} />
      </Section>
      {problems.map((p) => <p key={p} className="warn">{p}</p>)}
      <button className="btn btn-gold" disabled={problems.length > 0} onClick={() => onStart(teams.map((tm) => ({ ...tm, name: tm.name.trim() })), rules)}>{t('startGame')}</button>
      {browse && <CategoryBrowser bank={bank} rules={rules} onChange={(exclude) => setRules(cleanRules({ ...rules, exclude }))} onClose={() => setBrowse(false)} />}
    </div>
  );
}

/* ---------- which categories can come up ---------- */
function CategoryBrowser({ bank, rules, onChange, onClose }) {
  const off = new Set(rules.exclude);
  const toggle = (ids, on) => { const s = new Set(off); ids.forEach((id) => (on ? s.delete(id) : s.add(id))); onChange([...s]); };
  return (
    <Sheet onClose={onClose}>
      <div className="stack-sm catbrowser">
        <h2 className="display" style={{ fontSize: 28 }}>{t('chooseCats')}</h2>
        <p className="hint" style={{ margin: 0 }}>{t('chooseCatsSub', { n: catsNeeded(rules) })}</p>
        <div className="row">
          <button className="btn btn-sm grow" onClick={() => onChange([])}>{t('allOn')}</button>
          <button className="btn btn-sm btn-ghost grow" onClick={() => onChange(bank.cats.map((c) => c.id))}>{t('allOff')}</button>
        </div>
        {bank.groups.map((gr) => {
          const cats = bank.cats.filter((c) => c.group === gr.id);
          if (!cats.length) return null;
          return (
            <div key={gr.id} className="cgroup">
              <div className="cg-head"><span className="cg-title"><span className="cg-em">{gr.emoji}</span><b><Txt v={gr.name} /></b></span>
                <button className="btn btn-sm btn-ghost" onClick={() => toggle(cats.map((c) => c.id), cats.some((c) => off.has(c.id)))}>{cats.some((c) => off.has(c.id)) ? t('allOn') : t('allOff')}</button></div>
              <div className="cg-body stack-sm">
                {cats.map((c) => {
                  const on = !off.has(c.id); const n = (bank.byCat[c.id] || []).length;
                  return (
                    <button key={c.id} className={'crow crow-main' + (on ? '' : ' off')} role="checkbox" aria-checked={on} onClick={() => toggle([c.id], !on)}>
                      <span className="cr-em">{c.emoji}</span>
                      <span className="grow cr-txt"><Txt v={c.name} className="cr-name" /><span className="small muted">{t('cluesN', { n })}</span></span>
                      <span className={'cr-check' + (on ? ' on' : '')}>{on ? '✓' : ''}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        <button className="btn btn-gold" onClick={onClose}>{t('done')}</button>
      </div>
    </Sheet>
  );
}
