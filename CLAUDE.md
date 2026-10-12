# Jeopardy-Board — notes for Claude

Read this first in every new chat about this repo.

## The owner's standing rules
- Never claim a feature is implemented, tested or deployed unless it really is.
- Be honest about which tests you actually ran, and say what wasn't tested (e.g. real phones, real TVs, iOS Safari).
- No backend or paid services without warning the owner first.
- (Carried over from Khatfa, same owner) No copyrighted music, clips, artwork or characters. No invented facts. Time-sensitive clues are marked `c: 1` with an `asOf` date and never presented as verified. `v:` is set ONLY when a fact was actually checked online that day.
- Optional modifiers are OFF by default.
- Check layouts with screenshots at phone (360px wide) and TV (1920×1080) sizes, in Arabic and English (`npm run shots`).
- Work step by step. Say what you're about to do before big changes. Keep features that already work.

## Not the TV show
Jeopardy-Board is an independent fan-made game in the clue-board genre. Don't use the show's theme music, logo, set design (no blue board with gold dollar values), catchphrases, voice lines or the names of its special squares/rounds. Our names: hidden wager squares are **Risk It! / خاطِر!**; the last round is **Final Wager / الرهان الأخير**. There is deliberately no "thinking music".

## Key facts
- **Name:** shown as "Jeopardy-Board" in both languages. The Arabic name is waiting for the owner's approval (suggested: خانات, "squares"). It lives in one place: `APP_NAME` in `src/05-i18n.js` (`ar: null` until approved; the home logo then shows it).
- **Live site:** https://sad-cpu141.github.io/Jeopardy-Board/ (GitHub Pages, `main` branch, root folder).
- **Repo:** Sad-CPU141/Jeopardy-Board. **Siblings:** Sad-CPU141/khatfa and Sad-CPU141/draft-night — this game copies and adapts their tech; it loads nothing from them at runtime. **Hub:** Sad-CPU141/sad-cpu141.github.io (has a card for this game).
- **Look:** the family's ink/purple palette with gold. This game's own accent is lime `#b6f23d` (Risk It, the active tile, the logo). Khatfa's teal and Draft Night's gold are not used as the accent. Team colours never include lime.
- **Languages:** English and Arabic (RTL). Default follows the device language. UI strings: `src/05-i18n.js` as `[English, Arabic]`. Content is `{ en, ar }`. Use `dir="auto"` for user text and CSS logical properties, never `left`/`right`.
- **Fonts:** self-hosted in `fonts/` (SIL OFL): Anton, Barlow, Barlow Semi Condensed, Cairo.

## Game rules (first version)
- 2–4 teams, one host phone (+ optional TV). Board: 6 categories × 5 rows; values 200/400/600/800/1000 by default (editable in setup; must go up). Round 2 has new categories and doubles the values. 1 or 2 rounds.
- The host reads the clue (a statement). Teams buzz out loud; the host taps who was first. Right = +value and that team picks next. Wrong = −value and the other teams may buzz. Nobody: response shown, same team picks again.
- Responses don't need to be phrased as a question unless the host turns on "Responses must be a question" (OFF by default; the host judges).
- Risk It squares: 1 in round 1, 2 in round 2 (different categories), never in the top row, placed at random when the game is created. Only the picking team plays; wager 0…max(score, round's top value). The clue is hidden (host and TV) until the wager is locked.
- Round 2: the lowest-scoring team picks first.
- Final Wager: one category not used on either board, one of its hardest clues. Category → secret wagers (phone passed round; cover screen between teams; 0…max(score, 0)) → clue + timer → host judges each team, lowest score first → correct response → results.
- Optional modifiers (OFF): no minus points (normal clues only), answer clock, strict no-repeats.
- Fix scores, undo (every step), game log, "This is wrong" (refunds exactly that clue's changes) — like Khatfa.

## How the code is laid out (same as Khatfa / Draft Night)
- A static site. React 18 UMD is vendored in `vendor/`. No bundler. Edit `src/`, then `npm run build`. Never edit `app.js`, `bank.js`, `index.html`, `sw.js` or the root `styles.css` by hand: the build overwrites them and stamps a version.
- `src/00-platform.js`: helpers, storage (IndexedDB → localStorage → memory), the file store for sound recordings, backup format, PWA/update banner.
- `src/05-i18n.js`: all interface text.
- `src/15-select.js`: picks categories (varied groups, avoids recent ones) and clues (no repeats in a game, `f` fact keys, recency weighting, strict mode), the final clue, and replacements.
- `src/20-engine.js`: the rules as pure functions `(game, …) → game` with undo history. Phases `board ⇄ clue → between → … → final → done`. Includes Risk It, the final round, fix scores and "This is wrong" (`invalidateClue`, `invalidRefunds`; idempotent; one undo step; who picks next isn't changed).
- `src/30-ui.jsx` shared UI, home, setup, category picker · `src/31-game.jsx` board, clue, between, results, menu, fix scores · `src/32-final.jsx` final round · `src/33-wrong.jsx` "This is wrong" · `src/34-tv.jsx` TV mode · `src/37-sound.jsx` sound manager · `src/40-settings.jsx` settings · `src/90-app.jsx` app state and mount.
- **TV secrecy:** the TV only ever receives `tvGame(g)`: no responses before the reveal, no Risk It positions, no clue under a Risk It until the wager is in, no final clue before it's shown, and no final wager until that team is judged. "TV on this screen" also renders `tvGame(g)`.
- **Sound:** same design as Khatfa. Source order: your upload (Settings → Sound, IndexedDB) → `sounds/<event>.mp3` (listed by build.js) → built-in Web Audio synth → silence. One device plays (the TV window if open). Events come from `soundEvents(prev, next)`, never from renders or undo.
- **Clue bank:** `src/bank/*.js` → `bank.js`. Format at the top of `src/bank/00-runtime.js`: `['id', 200|400|600|800|1000, clueEn, clueAr, responseEn, responseAr, { s, alt, altAr, n, nAr, r, v, f, c, asOf, ok }]`. The value is the difficulty row. Clues are statements; responses are plain answers. Ids are permanent.
- `npm run audit` (`tools/audit.js`) must report 0 errors before committing. It counts rows per category (goal: 4+ per row), checks refs (required for 800/1000), statements vs questions, responses inside clues, duplicates, and the Arab-related share (same rule as Khatfa's audit; target about 10–12%). `node tools/audit.js --links` lists clues that mention another clue's response, for manual review.
- Tests: `npm test` (jsdom: rules, 300 random games, TV secrecy, click-through, backup, persistence, TV window link). `npm run shots` (Playwright, real Chromium: phone 360×780, laptop 1366×768, TV 1920×1080, EN and AR; fails on sideways scrolling or page errors; screenshots go to `shots/`, not committed). `npm run icons` re-renders the icons.

## Not done yet
- "My clues" pack editor (planned next), picture/sound clues, online rooms (phones as buzzers, TV on another device).
- No clue has been checked online yet (`v:` is set on none). Four clues are marked time-sensitive.
- Real phones, real TVs, iOS Safari, casting, and real audio output have not been tested.
