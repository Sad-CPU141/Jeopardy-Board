# Jeopardy-Board — notes for Claude

Read this first in every new chat about this repo.

## The owner's standing rules
- Never claim a feature is implemented, tested or deployed unless it really is.
- Be honest about which tests you actually ran, and say what wasn't tested (e.g. real phones, real TVs, iOS Safari).
- No backend or paid services without warning the owner first.
- (Carried over from Khatfa, same owner) No copyrighted music, clips, artwork or characters. No invented facts. Time-sensitive clues are marked `c: 1` with an `asOf` date and never presented as verified. `v:` is set ONLY when a fact was actually checked online that day.
- Optional modifiers are OFF by default.
- Check layouts with screenshots at phone (360px wide), laptop and TV (1920×1080) sizes (`npm run shots`).
- Work step by step. Say what you're about to do before big changes. Keep features that already work.

## English only
The owner decided this game has nothing to do with Arabic: no language switch, no Arabic UI text, no Arabic clue translations, no Arabic name, no Arab-themed content quota. The bank is international. Don't add Arabic back unless the owner asks. (Khatfa and Draft Night are the bilingual siblings.)

## Not the TV show
Jeopardy-Board is an independent fan-made game in the clue-board genre. Don't use the show's theme music, logo, set design (no blue board with gold dollar values), catchphrases, voice lines or the names of its special squares/rounds. Our names: hidden wager squares are **Risk It!**; the last round is **Final Wager**. There is deliberately no "thinking music".

## Key facts
- **Name:** "Jeopardy-Board", in one place: `APP_NAME` in `src/05-i18n.js`.
- **Live site:** https://sad-cpu141.github.io/Jeopardy-Board/ (GitHub Pages, `main` branch, root folder).
- **Repo:** Sad-CPU141/Jeopardy-Board. **Siblings:** Sad-CPU141/khatfa and Sad-CPU141/draft-night — this game copies and adapts their tech; it loads nothing from them at runtime. **Hub:** Sad-CPU141/sad-cpu141.github.io (has a card for this game).
- **Look:** the family's ink/purple palette with gold. This game's own accent is lime `#b6f23d` (Risk It, the active tile, the logo). Team colours never include lime.
- **Text:** UI strings are plain English strings in `src/05-i18n.js` (`t(key, vars)`). Still use `dir="auto"` on user-typed text (team names, your own clues) and CSS logical properties.
- **Fonts:** self-hosted in `fonts/` (SIL OFL): Anton, Barlow, Barlow Semi Condensed.

## Game rules (first version)
- 2–4 teams, one host phone (+ optional TV). Board: 6 categories × 5 rows; values 200/400/600/800/1000 by default (editable in setup; must go up). Round 2 has new categories and doubles the values. 1 or 2 rounds.
- The host reads the clue (a statement). Teams buzz out loud; the host taps who was first. Right = +value and that team picks next. Wrong = −value and the other teams may buzz. Nobody: response shown, same team picks again.
- Responses don't need to be phrased as a question unless the host turns on "Responses must be a question" (OFF by default; the host judges).
- Risk It squares: 1 in round 1, 2 in round 2 (different categories), never in the top row, placed at random when the game is created. Only the picking team plays; wager 0…max(score, round's top value). The clue (and its picture/sound) is hidden (host and TV) until the wager is locked.
- Round 2: the lowest-scoring team picks first.
- Final Wager: one category not used on either board, one of its hardest clues, **text clues only**. Category → secret wagers (phone passed round; cover screen between teams; 0…max(score, 0)) → clue + timer → host judges each team, lowest score first → correct response → results.
- Optional modifiers (OFF): no minus points (normal clues only), answer clock, strict no-repeats.
- Fix scores, undo (every step), game log, "This is wrong" (refunds exactly that clue's changes) — like Khatfa.

## Picture and sound clues
- A clue can have `m: { type: 'image'|'audio', src, alt, credit, frame? }`. `src` is `@key` (resolved through `JB_BANK.media`, generated in `src/bank/02-media.js`) or, for your own clues, `idb:<id>` (a file in IndexedDB).
- Built-in media comes from `tools/media.js` (`npm run media`): flags (flag-icons, MIT), country outlines (Natural Earth via world-atlas), sounds copied from Khatfa's media (Kenney / Ben Burnes CC0 + generated tones). Output: `media/i/*.svg`, `media/a/*.mp3` with hash names (the response is never in a file name). Credits: `media/CREDITS.md`, licences in `media/licenses/`.
- Playback state lives in the game (`current.play` / `final.play`, changed by `mediaCmd`; `quietMedia` stops it on load/restore). Sound plays on ONE device: the TV window if open, otherwise this device. The TV reports status back (`media-status`); a browser that blocks autoplay shows a "tap to allow sound" button.
- The service worker precaches `media/` and answers audio byte-range requests.

## My clues (packs)
- Home → ✏️ My clues (`src/36-editor.jsx`). Packs are saved under `K.packs` (`jb_packs_v1`); their pictures/sounds go in the file store. Pack shape: `{ id, name, enabled, categories: [{ id, emoji, name }], clues: [{ id, type, cat, points, q, a, alt[], note, ref, media }] }`.
- Enabled packs are merged into the bank (`mergePacks`) as the group "Your packs". A category only goes on a board once all 5 rows have a clue (the editor shows what's missing).
- Packs export/import as JSON (`exportPack`/`importPack`, with embedded files) and are included in the full backup. `cleanFiles` keeps files used by settings or packs.

## How the code is laid out (same as Khatfa / Draft Night)
- A static site. React 18 UMD is vendored in `vendor/`. No bundler. Edit `src/`, then `npm run build`. Never edit `app.js`, `bank.js`, `index.html`, `sw.js` or the root `styles.css` by hand: the build overwrites them and stamps a version.
- `src/00-platform.js`: helpers, storage (IndexedDB → localStorage → memory), the file store (sound recordings and pack media), backup format, PWA/update banner.
- `src/05-i18n.js`: all interface text.
- `src/15-select.js`: picks categories (varied groups, avoids recent ones) and clues (no repeats in a game, `f` fact keys, recency weighting, strict mode), the final clue (text only), and replacements.
- `src/20-engine.js`: the rules as pure functions `(game, …) → game` with undo history. Phases `board ⇄ clue → between → … → final → done`. Includes Risk It, the final round, media playback commands, fix scores and "This is wrong" (`invalidateClue`, `invalidRefunds`; idempotent; one undo step; who picks next isn't changed).
- `src/30-ui.jsx` shared UI, home, setup, category picker · `src/31-game.jsx` board, clue, between, results, menu, fix scores · `src/32-final.jsx` final round · `src/33-wrong.jsx` "This is wrong" · `src/34-tv.jsx` TV mode · `src/35-media.jsx` picture/sound players and host controls · `src/36-editor.jsx` My clues · `src/37-sound.jsx` sound manager · `src/40-settings.jsx` settings · `src/90-app.jsx` app state and mount.
- **TV secrecy:** the TV only ever receives `tvGame(g)`: no responses before the reveal, no Risk It positions, no clue (or media) under a Risk It until the wager is in, no final clue before it's shown, and no final wager until that team is judged. "TV on this screen" also renders `tvGame(g)`.
- **Sound effects:** same design as Khatfa. Source order: your upload (Settings → Sound, IndexedDB) → `sounds/<event>.mp3` (listed by build.js) → built-in Web Audio synth → silence. One device plays (the TV window if open). Events come from `soundEvents(prev, next)`, never from renders or undo.
- **Clue bank:** `src/bank/*.js` → `bank.js`. Format at the top of `src/bank/00-runtime.js`: `JB_BANK.cat(id, { g, e, name, pop? }, rows)` with rows `['id', 200|400|600|800|1000, 'Clue', 'Response', { alt, n, r, v, f, c, asOf, ok, m }]`. The value is the difficulty row. Clues are statements; responses are plain answers. Ids are permanent (the old Arab-themed clues were removed; their ids are not reused).
- `npm run audit` (`tools/audit.js`) must report 0 errors before committing. It counts rows per category (goal: 4+ per row), checks refs (required for 800/1000), English-only text, statements vs questions, responses inside clues, duplicates, and media (file exists, neutral file name, alt text, credit). `node tools/audit.js --links` lists clues that mention another clue's response, for manual review.
- Tests: `npm test` (jsdom, 150 checks: rules, 300 random games, TV secrecy, click-through, backup, persistence, TV window link, picture/sound clues, packs). `npm run shots` (Playwright, real Chromium: phone 360×780, laptop 1366×768, TV 1920×1080; fails on sideways scrolling or page errors; also plays a sound clue, saves a picture clue to IndexedDB, and checks a picture clue + response fits on the TV; screenshots go to `shots/`, not committed). `npm run icons` re-renders the icons.

## Not done yet
- Online rooms (phones as buzzers, TV on another device).
- No clue has been checked online yet (`v:` is set on none). Seven clues are marked time-sensitive.
- Real phones, real TVs, iOS Safari, casting, and real audio output have not been tested. The TV-window media path is tested only with jsdom message passing; real-browser sound is tested only on "this screen".
