/* ============================================================
   MY CLUES: your own clue packs (adapted from Khatfa's "My questions").
   · A pack = { id, name, enabled, categories: [{ id, emoji, name }], clues: [...] }, stored
     under jb_packs_v1. Your pictures and sounds are files in this browser's IndexedDB
     (the file store in 00-platform.js), referenced as 'idb:<id>'.
   · Pack clues join the game: in a built-in category, or in the pack's own categories
     (shown under "Your packs"). A category goes on a board only when it has at least one
     clue in each of the five rows.
   · Export a pack = one .json file with its pictures and sounds inside (base64), so it can
     be shared or moved to another device. Import checks everything first.
   ============================================================ */
const PACK_FORMAT = 1;
const PACK_MAX_IMAGE = 8 * 1024 * 1024, PACK_MAX_AUDIO = 5 * 1024 * 1024, PACK_MAX_FILE = 60 * 1024 * 1024;
const CTYPES = ['text', 'image', 'audio'];
const ROW_VALUES = [200, 400, 600, 800, 1000];

/* ---------- packs → bank ---------- */
function packClue(p, c) {
  return {
    id: 'pk.' + p.id + '.' + c.id, cat: c.cat, tier: ROW_VALUES.indexOf(c.points) + 1, points: c.points,
    q: c.q, a: c.a, alt: (c.alt || []).filter(Boolean), note: c.note || null, ref: c.ref || null, verified: null,
    facts: [], reviewed: 0, check: 0, asOf: null, type: c.type || 'text', media: c.type && c.type !== 'text' ? c.media || null : null, pack: p.id,
  };
}
// The built-in bank plus every switched-on pack. Pack categories go in a "Your packs" group.
function mergePacks(raw, packs) {
  const on = (packs || []).filter((p) => p && p.enabled !== false);
  if (!on.length) return raw;
  const groups = [...raw.groups];
  const cats = raw.cats.map((c) => ({ ...c }));
  const own = [];
  on.forEach((p) => (p.categories || []).forEach((c) => own.push({ id: c.id, group: 'custom', emoji: c.emoji || '📦', name: c.name, count: [0, 0, 0, 0, 0], popular: 0, nicheTopic: 0, pack: p.id })));
  if (own.length) { groups.push({ id: 'custom', emoji: '📦', name: 'Your packs' }); cats.push(...own); }
  const ids = new Set(cats.map((c) => c.id));
  const clues = [...raw.clues];
  on.forEach((p) => (p.clues || []).forEach((c) => { if (ids.has(c.cat) && ROW_VALUES.includes(c.points) && !clueProblems(c).length) clues.push(packClue(p, c)); }));
  return { ...raw, groups, cats, clues };
}

/* ---------- validation ---------- */
// Returns a list of problem keys (empty = OK).
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
const emptyClue = (type, cat) => ({ id: uid(), type, cat: cat || '', points: 200, q: '', a: '', alt: [], note: '', ref: '', media: type === 'text' ? null : { type, src: null } });
// Rows still empty in a category (it needs all five to go on a board).
const missingRows = (clues, catId) => ROW_VALUES.filter((v) => !(clues || []).some((c) => c.cat === catId && c.points === v && !clueProblems(c).length));

/* ---------- files ---------- */
const blobToDataUrl = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
function dataUrlToBlob(d) {
  const m = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(d || ''); if (!m) return null;
  const bin = m[2] ? atob(m[3]) : decodeURIComponent(m[3]); const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return new Blob([u], { type: m[1] });
}
// Big photos are scaled down (max 1600 px) so they fit in browser storage; small files are kept as they are.
async function prepareImage(file) {
  if (!/^image\//.test(file.type)) throw new Error('vNotImage');
  if (file.size > PACK_MAX_IMAGE) throw new Error('vTooBig');
  if (file.type === 'image/svg+xml' || file.type === 'image/gif' || file.size < 450 * 1024) return file;
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('vUnsupported')); i.src = url; });
    const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const cv = document.createElement('canvas'); cv.width = Math.round(img.naturalWidth * scale); cv.height = Math.round(img.naturalHeight * scale);
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    const out = await new Promise((res) => cv.toBlob(res, 'image/webp', 0.86));
    if (out && out.type === 'image/webp' && out.size < file.size) return out;
    const jpg = await new Promise((res) => cv.toBlob(res, 'image/jpeg', 0.86));
    return jpg && jpg.size < file.size ? jpg : file;
  } finally { URL.revokeObjectURL(url); }
}
// Files used by pack clues (to clean up files nothing uses any more).
const packFileIds = (packs) => { const s = new Set(); (packs || []).forEach((p) => (p.clues || []).forEach((c) => { const src = c.media && c.media.src; if (isLocalFile(src)) s.add(src.slice(4)); })); return s; };

/* ---------- pack export / import ---------- */
async function exportPack(p) {
  const media = {};
  for (const c of p.clues || []) {
    const src = c.media && c.media.src;
    if (isLocalFile(src)) { const rec = await fileStore.get(src.slice(4)); if (rec && rec.blob) media[src.slice(4)] = { type: rec.blob.type, data: await blobToDataUrl(rec.blob) }; }
  }
  return { app: BACKUP_APP, kind: 'pack', format: PACK_FORMAT, exportedAt: new Date().toISOString(), pack: p, media };
}
// Returns { ok, error, pack, media, summary } — nothing is saved until importPack().
function validatePack(obj) {
  if (!obj || obj.app !== BACKUP_APP || obj.kind !== 'pack') return { ok: false, error: 'pkNotPack' };
  if (typeof obj.format !== 'number' || obj.format > PACK_FORMAT) return { ok: false, error: 'bkNewer' };
  const p = obj.pack;
  if (!p || typeof p.name !== 'string' || !Array.isArray(p.clues) || !Array.isArray(p.categories)) return { ok: false, error: 'bkDamaged' };
  const media = obj.media && typeof obj.media === 'object' ? obj.media : {};
  if (p.categories.some((c) => !c || typeof c.id !== 'string' || typeof c.name !== 'string')) return { ok: false, error: 'bkDamaged' };
  const catIds = new Set(p.categories.map((c) => c.id));
  let bad = 0;
  for (const c of p.clues) {
    if (!c || typeof c !== 'object' || typeof c.q !== 'string' || typeof c.a !== 'string' || !CTYPES.includes(c.type || 'text')) return { ok: false, error: 'bkDamaged' };
    if (!ROW_VALUES.includes(c.points)) return { ok: false, error: 'pkBadPoints' };
    if (clueProblems(c).length) bad++;
    const src = c.media && c.media.src;
    if (isLocalFile(src) && !media[src.slice(4)]) bad++;
    if (src && !isLocalFile(src) && !/^media\//.test(src)) return { ok: false, error: 'bkDamaged' }; // no outside links
  }
  for (const k of Object.keys(media)) { const m = media[k]; if (!m || typeof m.data !== 'string' || !/^data:(image|audio)\//.test(m.data)) return { ok: false, error: 'bkDamaged' }; }
  return { ok: true, pack: p, media, summary: { name: p.name, clues: p.clues.length, cats: p.categories.length, media: Object.keys(media).length, bad, unknownCats: p.clues.filter((c) => !catIds.has(c.cat)).length } };
}
// Saves an imported pack as a NEW pack (fresh ids), with its files.
async function importPack(v, packs) {
  const p = v.pack; const remap = {};
  for (const [oldId, m] of Object.entries(v.media)) { const blob = dataUrlToBlob(m.data); if (blob) remap[oldId] = await fileStore.put({ blob, size: blob.size, at: Date.now() }); }
  const pid = uid(); const catMap = {};
  const categories = p.categories.map((c) => { const id = 'pk-' + pid + '-' + uid().slice(0, 5); catMap[c.id] = id; return { id, emoji: c.emoji || '📦', name: String(c.name).slice(0, 40) }; });
  const clues = p.clues.map((c) => {
    const media = c.media ? { ...c.media } : null;
    if (media && isLocalFile(media.src)) media.src = remap[media.src.slice(4)] ? 'idb:' + remap[media.src.slice(4)] : null;
    return { ...c, id: uid(), cat: catMap[c.cat] || c.cat, media };
  });
  let name = p.name || 'Pack'; const names = new Set((packs || []).map((x) => x.name));
  if (names.has(name)) { let k = 2; while (names.has(name + ' (' + k + ')')) k++; name = name + ' (' + k + ')'; }
  return { id: pid, name, enabled: true, createdAt: Date.now(), updatedAt: Date.now(), categories, clues };
}

/* ============================================================
   SCREENS
   ============================================================ */
function CluesScreen({ packs, setPacks, bank, onBack, tvOpen, setPreview, cleanUp }) {
  const [openId, setOpenId] = useState(null);
  const [msg, setMsg] = useState(null);
  const [ask, setAsk] = useState(null);
  const fileRef = useRef(null);
  useEffect(() => () => setPreview(null), []);
  const pack = packs.find((p) => p.id === openId);
  const savePack = (p) => setPacks(packs.map((x) => (x.id === p.id ? { ...p, updatedAt: Date.now() } : x)));
  const newPack = () => { const p = { id: uid(), name: t('newPackName', { n: packs.length + 1 }), enabled: true, createdAt: Date.now(), updatedAt: Date.now(), categories: [], clues: [] }; setPacks([...packs, p]); setOpenId(p.id); };
  const readFile = (file) => {
    if (!file) return;
    if (file.size > PACK_MAX_FILE) { setMsg({ text: t('vTooBigPack') }); return; }
    const r = new FileReader();
    r.onerror = () => setMsg({ text: t('bkUnreadable') });
    r.onload = () => { let obj; try { obj = JSON.parse(r.result); } catch (e) { setMsg({ text: t('bkUnreadable') }); return; } const v = validatePack(obj); if (!v.ok) { setMsg({ text: t(v.error) }); return; } setAsk({ kind: 'import', v }); };
    r.readAsText(file);
  };
  if (pack) return <PackScreen pack={pack} savePack={savePack} bank={bank} tvOpen={tvOpen} setPreview={setPreview} cleanUp={cleanUp}
    onBack={() => { setOpenId(null); setPreview(null); }}
    onDelete={() => setAsk({ kind: 'delete', p: pack })}
    onExport={async () => { const data = await exportPack(pack); downloadBlob(new Blob([JSON.stringify(data)], { type: 'application/json' }), 'jeopardy-board-pack-' + pack.name.replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 40) + '.json'); }}
    extra={ask && ask.kind === 'delete' && <Confirm title={t('deletePackQ')} body={t('deletePackBody', { n: ask.p.clues.length })} yes={t('deleteIt')} danger
      onYes={() => { const rest = packs.filter((x) => x.id !== ask.p.id); setPacks(rest); setOpenId(null); cleanUp(rest); }} onClose={() => setAsk(null)} />} />;
  return (
    <div className="app">
      <TopBar onBack={onBack} title={t('myClues')} />
      <p className="hint">{t('myCluesSub')}</p>
      {packs.map((p) => (
        <div key={p.id} className="card packrow">
          <button className="pr-main" onClick={() => setOpenId(p.id)}>
            <b className="grow" dir="auto">📦 {p.name}</b>
            <span className="small muted">{t('cluesN', { n: p.clues.length })} · {p.categories.length ? t('packCatsN', { n: p.categories.length }) : t('packNoCats')}</span>
          </button>
          <Toggle on={p.enabled !== false} onChange={(v) => setPacks(packs.map((x) => (x.id === p.id ? { ...x, enabled: v } : x)))} title={t('packInGames')} />
        </div>
      ))}
      {!packs.length && <p className="hint center">{t('noPacks')}</p>}
      <button className="btn btn-gold" onClick={newPack}>＋ {t('newPack')}</button>
      <button className="btn" onClick={() => fileRef.current && fileRef.current.click()}>⬆ {t('importPack')}</button>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { readFile(e.target.files[0]); e.target.value = ''; }} />
      <p className="hint">{t('packStorageNote')}</p>
      {ask && ask.kind === 'import' && <Confirm title={t('importPackQ', { name: ask.v.summary.name })} body={t('importPackBody', ask.v.summary) + (ask.v.summary.bad ? ' ' + t('importPackBad', { n: ask.v.summary.bad }) : '')} yes={t('importPack')}
        onYes={async () => { try { const p = await importPack(ask.v, packs); setPacks([...packs, p]); setMsg({ text: t('packImported', { name: p.name }), ok: true }); } catch (e) { setMsg({ text: t(/quota/i.test(e.message) ? 'storeFull' : 'storeFail') }); } }} onClose={() => setAsk(null)} />}
      {msg && <Toast msg={msg.text} ok={msg.ok} onClose={() => setMsg(null)} />}
    </div>
  );
}

function PackScreen({ pack, savePack, bank, onBack, onDelete, onExport, extra, tvOpen, setPreview, cleanUp }) {
  const [edit, setEdit] = useState(null); // a clue draft
  const [newType, setNewType] = useState(false);
  const [catForm, setCatForm] = useState(null);
  const [filter, setFilter] = useState('all');
  const [delC, setDelC] = useState(null);
  if (edit) return <ClueForm initial={edit} pack={pack} bank={bank} tvOpen={tvOpen} setPreview={setPreview}
    onCancel={() => { setEdit(null); setPreview(null); }}
    onSave={(c) => { const exists = pack.clues.some((x) => x.id === c.id); const next = { ...pack, clues: exists ? pack.clues.map((x) => (x.id === c.id ? c : x)) : [...pack.clues, c] }; savePack(next); setEdit(null); setPreview(null); cleanUp(); }} />;
  const catName = (id) => { const c = pack.categories.find((x) => x.id === id) || bank.cats.find((x) => x.id === id); return c ? (c.emoji || '') + ' ' + pick(c.name) : '—'; };
  const list = pack.clues.filter((c) => filter === 'all' || (c.type || 'text') === filter).sort((a, b) => (a.cat === b.cat ? a.points - b.points : String(a.cat).localeCompare(String(b.cat))));
  return (
    <div className="app">
      <TopBar onBack={onBack} title={pack.name} />
      <div className="card stack-sm">
        <label className="field"><span className="label">{t('packName')}</span><input className="input" dir="auto" maxLength={60} value={pack.name} onChange={(e) => savePack({ ...pack, name: e.target.value })} /></label>
        <span className="label">{t('packCategories')}</span>
        <p className="hint" style={{ margin: 0 }}>{t('packCategoriesSub')}</p>
        <div className="stack-sm">
          {pack.categories.map((c) => {
            const miss = missingRows(pack.clues, c.id);
            return (
              <button key={c.id} className="optrow" onClick={() => setCatForm(c)}>
                <span className="cr-em">{c.emoji}</span>
                <span className="grow"><b dir="auto">{c.name}</b><span className="small muted" style={{ display: 'block' }}>{miss.length ? '⚠ ' + t('rowsMissing', { list: miss.join(', ') }) : '✓ ' + t('readyForBoard')}</span></span>
                <span className="small muted">{t('cluesN', { n: pack.clues.filter((x) => x.cat === c.id).length })}</span>
              </button>
            );
          })}
          <button className="btn btn-sm btn-ghost" onClick={() => setCatForm({ id: 'pk-' + pack.id + '-' + uid().slice(0, 5), emoji: '📦', name: '', isNew: true })}>＋ {t('addCategory')}</button>
        </div>
      </div>
      <div className="fchips">{['all', ...CTYPES].map((k) => <button key={k} className={'fchip' + (filter === k ? ' on' : '')} onClick={() => setFilter(k)}>{k === 'all' ? t('all') : (MEDIA_ICON[k] || '📝') + ' ' + t('type_' + k)}</button>)}</div>
      {list.map((c) => {
        const probs = clueProblems(c);
        return (
          <div key={c.id} className="card qrow">
            <button className="qr-main" onClick={() => setEdit(JSON.parse(JSON.stringify(c)))}>
              <span className="qr-v num">{c.points}</span>
              <span className="grow"><span className="small muted">{MEDIA_ICON[c.type] || '📝'} {catName(c.cat)}{probs.length ? ' · ⚠ ' + t('incomplete') : ''}</span><span className="qr-q" dir="auto">{c.q || '—'}</span><span className="small muted" dir="auto">→ {c.a}</span></span>
            </button>
            <button className="iconbtn" aria-label={t('deleteClue')} onClick={() => setDelC(c)}>🗑</button>
          </div>
        );
      })}
      {!pack.clues.length && <p className="hint center">{t('noCluesYet')}</p>}
      {newType ? (
        <div className="card stack-sm">
          <span className="label">{t('chooseType')}</span>
          <div className="typegrid">{CTYPES.map((k) => <button key={k} className="btn" onClick={() => { setNewType(false); setEdit(emptyClue(k, pack.categories[0] ? pack.categories[0].id : '')); }}>{MEDIA_ICON[k] || '📝'} {t('type_' + k)}</button>)}</div>
          <button className="btn btn-ghost btn-sm" onClick={() => setNewType(false)}>{t('cancel')}</button>
        </div>
      ) : <button className="btn btn-gold" onClick={() => setNewType(true)}>＋ {t('addClue')}</button>}
      <div className="row">
        <button className="btn grow" onClick={onExport} disabled={!pack.clues.length}>⬇ {t('exportPack')}</button>
        <button className="btn btn-danger grow" onClick={onDelete}>{t('deletePack')}</button>
      </div>
      {catForm && <CategoryForm c={catForm} onClose={() => setCatForm(null)} inUse={pack.clues.filter((x) => x.cat === catForm.id).length}
        onSave={(c) => { const { isNew, ...cc } = c; savePack({ ...pack, categories: isNew ? [...pack.categories, cc] : pack.categories.map((x) => (x.id === cc.id ? cc : x)) }); setCatForm(null); }}
        onDelete={() => { savePack({ ...pack, categories: pack.categories.filter((x) => x.id !== catForm.id) }); setCatForm(null); }} />}
      {delC && <Confirm title={t('deleteClueQ')} body={delC.q || delC.a} yes={t('deleteIt')} danger onYes={() => { const next = { ...pack, clues: pack.clues.filter((x) => x.id !== delC.id) }; savePack(next); cleanUp(); }} onClose={() => setDelC(null)} />}
      {extra}
    </div>
  );
}

function CategoryForm({ c, onSave, onDelete, onClose, inUse }) {
  const [d, setD] = useState(c);
  return (
    <Sheet onClose={onClose}>
      <div className="stack-sm">
        <h2 className="display" style={{ fontSize: 26 }}>{c.isNew ? t('addCategory') : t('editCategory')}</h2>
        <label className="field"><span className="label">{t('emoji')}</span><input className="input" style={{ maxWidth: 90, fontSize: 26 }} maxLength={4} value={d.emoji} onChange={(e) => setD({ ...d, emoji: e.target.value })} /></label>
        <label className="field"><span className="label">{t('categoryName')}</span><input className="input" dir="auto" maxLength={40} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></label>
        <button className="btn btn-gold" disabled={!d.name.trim()} onClick={() => onSave({ ...d, name: d.name.trim() })}>{t('save')}</button>
        {!c.isNew && <button className="btn btn-danger" disabled={inUse > 0} onClick={onDelete}>{t('deleteCategory')}</button>}
        {!c.isNew && inUse > 0 && <p className="hint" style={{ margin: 0 }}>{t('categoryInUse', { n: inUse })}</p>}
        <button className="btn btn-ghost" onClick={onClose}>{t('cancel')}</button>
      </div>
    </Sheet>
  );
}

function ClueForm({ initial, pack, bank, onSave, onCancel, tvOpen, setPreview }) {
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
  const set = (patch) => setC({ ...c, ...patch });
  useEffect(() => { const s = c.media && c.media.src; if (isLocalFile(s)) fileStore.get(s.slice(4)).then((r) => setMediaMissing(!r)); else setMediaMissing(false); }, [c.media && c.media.src]);
  useEffect(() => { setStatus(null); setPlay(freshPlay()); }, [c.media && c.media.src]);
  const probs = clueProblems(c, { mediaMissing });
  const pickFile = async (file) => {
    if (!file) return;
    setErr(null); setBusy(true);
    try {
      let blob = file;
      if (c.type === 'image') blob = await prepareImage(file);
      else {
        if (file.size > PACK_MAX_AUDIO) throw new Error('vTooBigAudio');
        const len = await checkAudio(file); setAudioLen(len);
        if (len > 30) setErr('vLongSound');
      }
      // The original file name isn't kept (it could give the response away).
      const id = await fileStore.put({ blob, size: blob.size, at: Date.now() });
      setC((x) => ({ ...x, media: { type: x.type, src: 'idb:' + id } }));
    } catch (e) { setErr(/quota/i.test(e.message) ? 'storeFull' : e.message && S[e.message] ? e.message : 'vUnsupported'); }
    setBusy(false);
  };
  const previewQ = { ...packClue(pack, c), q: c.q || '…' };
  // "Preview on TV": the TV gets the clue (never the response) and plays the sound.
  useEffect(() => { if (tvOpen && onTv) setPreview({ q: { ...previewQ, a: null, alt: null, note: null, ref: null }, play }); else setPreview(null); }, [onTv, tvOpen, play, c.q, c.media && c.media.src]);
  const cmd = (k) => { const g = mediaCmd({ phase: 'clue', current: { play } }, k); setPlay(g.current.play); };
  const save = () => {
    setTried(true);
    if (probs.length) return;
    onSave({ ...c, q: c.q.trim(), a: c.a.trim(), note: (c.note || '').trim(), ref: (c.ref || '').trim(), alt: altText.split(',').map((s) => s.trim()).filter(Boolean) });
  };
  return (
    <div className="app qform">
      <TopBar onBack={onCancel} title={(MEDIA_ICON[c.type] || '📝') + ' ' + t('type_' + c.type)} />
      <div className="field"><span className="label">{t('category')}</span>
        <select className="input" value={c.cat} onChange={(e) => set({ cat: e.target.value })}>
          <option value="">{t('chooseCategory')}</option>
          {pack.categories.length > 0 && <optgroup label={t('thisPack')}>{pack.categories.map((x) => <option key={x.id} value={x.id}>{x.emoji} {x.name}</option>)}</optgroup>}
          {bank.groups.filter((g) => g.id !== 'custom').map((g) => <optgroup key={g.id} label={g.emoji + ' ' + pick(g.name)}>{bank.cats.filter((x) => x.group === g.id).map((x) => <option key={x.id} value={x.id}>{x.emoji} {pick(x.name)}</option>)}</optgroup>)}
        </select></div>
      <div className="field"><span className="label">{t('rowLabel')}</span><Seg value={c.points} options={ROW_VALUES.map((v) => [v, String(v)])} onChange={(v) => set({ points: v })} label={t('rowLabel')} />
        <p className="hint">{t('rowSub')}</p></div>

      {c.type === 'image' && <div className="card stack-sm">
        <span className="label">{t('picture')}</span>
        <button className="btn" disabled={busy} onClick={() => fileRef.current.click()}>🖼️ {c.media && c.media.src ? t('replacePicture') : t('choosePicture')}</button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { pickFile(e.target.files[0]); e.target.value = ''; }} />
        <p className="hint" style={{ margin: 0 }}>{t('pictureRights')}</p>
      </div>}
      {c.type === 'audio' && <div className="card stack-sm">
        <span className="label">{t('sound')}</span>
        <button className="btn" disabled={busy} onClick={() => fileRef.current.click()}>🔊 {c.media && c.media.src ? t('replaceSound') : t('chooseSound')}</button>
        <input ref={fileRef} type="file" accept="audio/*,.mp3,.m4a,.wav,.ogg" hidden onChange={(e) => { pickFile(e.target.files[0]); e.target.value = ''; }} />
        {audioLen != null && <p className="hint" style={{ margin: 0 }}>{t('soundLength', { s: Math.round(audioLen) })}</p>}
        <p className="hint" style={{ margin: 0 }}>{t('soundRights')}</p>
      </div>}

      <label className="field"><span className="label">{t('clueText')}{c.type === 'text' ? ' *' : ''}</span><textarea className="input" dir="auto" rows={3} maxLength={300} placeholder={t('clueTextPh')} value={c.q} onChange={(e) => set({ q: e.target.value })} /></label>
      <label className="field"><span className="label">{t('responseText')} *</span><input className="input" dir="auto" maxLength={120} placeholder={t('responseTextPh')} value={c.a} onChange={(e) => set({ a: e.target.value })} /></label>
      <label className="field"><span className="label">{t('alsoAcceptField')}</span><input className="input" dir="auto" maxLength={300} placeholder={t('alsoAcceptPh')} value={altText} onChange={(e) => setAltText(e.target.value)} /></label>
      <label className="field"><span className="label">{t('noteField')}</span><input className="input" dir="auto" maxLength={200} value={c.note || ''} onChange={(e) => set({ note: e.target.value })} /></label>
      <label className="field"><span className="label">{t('sourceField')}</span><input className="input" dir="auto" maxLength={300} placeholder={t('sourcePh')} value={c.ref || ''} onChange={(e) => set({ ref: e.target.value })} /></label>

      <div className="card stack-sm preview">
        <span className="label">{t('previewLabel')}</span>
        <ClueCard q={previewQ} host showAnswer media={{ play, output: !(tvOpen && onTv), onStatus: setStatus, status }} />
        {c.type === 'audio' && c.media && c.media.src && <div className="row mbtns">
          <button className="btn btn-sm btn-gold grow" onClick={() => cmd(play.state === 'playing' ? 'pause' : 'play')}>{play.state === 'playing' ? '⏸ ' + t('mPause') : '▶ ' + t('mPlay')}</button>
          <button className="btn btn-sm" onClick={() => cmd('replay')}>↺ {t('mReplay')}</button>
        </div>}
        {status && status.s && <p className={'mstatus' + (status.s === 'error' ? ' bad' : '')}>{t(STATUS_TXT[status.s] || 'mReady')}{status.msg ? ' ' + t(status.msg) : ''}</p>}
        {tvOpen
          ? <button className="btn btn-sm" aria-pressed={onTv} onClick={() => { setOnTv(!onTv); setPlay(freshPlay()); }}>📺 {onTv ? t('stopTvPreview') : t('previewOnTvBtn')}</button>
          : <p className="hint" style={{ margin: 0 }}>{t('previewTvHint')}</p>}
      </div>

      {tried && probs.length > 0 && <ul className="verrors">{probs.map((k) => <li key={k}>{t(k)}</li>)}</ul>}
      {err && <p className="warn">{t(err)}</p>}
      {busy && <p className="hint">{t('working')}</p>}
      <button className="btn btn-gold" disabled={busy} onClick={save}>{t('save')}</button>
      <button className="btn btn-ghost" onClick={onCancel}>{t('cancel')}</button>
    </div>
  );
}
