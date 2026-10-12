# Your sound files

Put your own sound effects here, named after the game event. Then run `npm run build`.
The game uses them automatically. A recording uploaded in Settings → Sound on a device still wins over these.

| File name (mp3, m4a, wav or ogg) | Plays when |
|---|---|
| `countdown-tick` | each of the last 5 seconds of a clock |
| `clue-open` | a clue is opened |
| `correct` | a right answer |
| `wrong` | a wrong answer |
| `risk-it` | a Risk It square is found |
| `round-end` | a round ends |
| `final-category` | the Final Wager category is shown |
| `final-clue` | the final clue is shown |
| `game-intro` | a new game starts |
| `winner-fanfare` | the winner is shown |

Example: `sounds/correct.mp3`. Keep them short (under 5 seconds; ticks under half a second).
MP3 or M4A play everywhere, including iPhone. Only use sounds you made or are allowed to use —
not the TV show's music or voice lines.
