# Jeopardy-Board

A clue-board quiz party game for one phone (the host) and a TV, in English. A static site with no backend: everything is saved on the host's device.

Play: https://sad-cpu141.github.io/Jeopardy-Board/

## How it plays
- 2–4 teams. Each round is a board of 6 categories × 5 clues (200–1000 by default; round 2 doubles them).
- The host reads a clue, teams buzz out loud, the host taps who was first and marks it right (+value, they pick next) or wrong (−value, the others can buzz).
- **Risk It!** squares are hidden on the board: the team that finds one wagers before seeing the clue.
- **Final Wager:** one category, secret wagers entered on the phone as it's passed round, one clue, and the host judges each team from the lowest score up.
- Undo, fix scores, a game log, and "This is wrong" for a bad clue.
- Picture and sound clues: flags, country outlines and "Guess the Sound". The host plays the sound; it comes out of the TV if one is open.
- **My clues:** make your own packs (text, picture or sound clues) on the phone. Full categories go on the board alongside the built-in ones. Packs can be exported and shared as a file.
- TV mode: use this screen as the TV, or open a second window in the same browser. The TV never shows a response or a wager before it's revealed.

## Content
660 clues in 33 categories (4 per value per category), written for this game, including 60 picture/sound clues. Clues with facts that can change are marked with the date they were true. Run `npm run audit` for the numbers. Picture and sound credits: `media/CREDITS.md`.

## Developing
```
npm install
npm run build     # src/ → app.js, bank.js, styles.css, index.html, sw.js
npm test          # rules, random games, jsdom click-through
npm run shots     # Playwright screenshots (needs Playwright installed globally)
npm run audit     # clue bank report
npm run media     # rebuild media/ (flags, outlines, sounds)
```
Edit `src/`, never the built files. See `CLAUDE.md` for the layout.

## Not affiliated
Jeopardy-Board is an independent fan-made game. It is not affiliated with or endorsed by the Jeopardy! TV show and uses none of its music, logo, set design, catchphrases or voice lines. Fonts: Anton, Barlow, Barlow Semi Condensed (SIL Open Font License).
