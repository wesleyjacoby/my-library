# Plotling (formerly My Library): project notes for Claude Code

This file carries over the decisions from the planning chat on claude.ai, so a fresh Claude Code session starts with the same context.

## What this is

A static PWA (hosted on GitHub Pages, no build step) of personalised interactive chapter books. First reader: the owner's eldest daughter, nearly 10, on an iPad. She is reading chapter books with a parent at the moment (large type, short paragraphs, lots of dialogue). The aim is to get her excited about reading.

Repo: `wesleyjacoby/my-library`. Live site: `https://wesleyjacoby.github.io/my-library/`.

## Design decisions (already agreed)

- **Standalone books in different genres**, not a series. The reader is the constant: before each book it asks for her name, a friend, a pet (dog or cat) and a grown-up, with pronouns for each. Names are never syllable-tappable.
- **Chapter length:** about 1,200-1,500 words, 8 chapters per book. Short paragraphs, mostly dialogue, plain words with the occasional long one. **British spelling.** Reading level of the book she is reading now, story slightly older (cosy mystery or adventure with a mild spooky edge, never nightmare-inducing).
- **Every chapter ends on a cliffhanger.** Choices are rare: 3 or 4 per book (not every chapter). They add hidden trait scores (`brave`, `kind`, `clever`) and mostly change a few paragraphs. The last chapter leads to one of about 3 endings chosen from the scores. No dead ends or "game over". The end screen shows "You found N of M endings" to encourage rereads.
- **Pictures:** animated atmospheric SVG scenes (no faces or characters, so they suit any reader). One at the start of each chapter, plus one after each big decision and for each ending. Built from the shared kit in `js/scenes.js`. Covers can be raster images made elsewhere (`"cover": { "image": "cover.jpg" }`).
- **Syllable pop-ups:** every 2+ syllable word is tappable, only 3+ syllable words get the dotted underline. Syllable splits are hand-written (auto-hyphenation gives wrong pronunciation). Shared dictionary in `data/syllables.json`, per-book additions in `book.json`.
- **Read-aloud** uses the browser's built-in voices, so quality depends on the device. Settings has a voice picker and an on/off switch. If it still sounds poor on the iPad, remove the chapter read-aloud and keep only the per-word "Say it".

## Writing style for the stories

The owner wants prose that does not sound AI-written: **no em dashes**, avoid "like the way..." style similes, show don't tell. `tools/check-book.mjs` flags dash characters.

## How to work in this repo

- Plain ES modules, no bundler. Serve with `python3 -m http.server 8000` (or VS Code Live Server). It will not run from `file://`.
- Before committing a book, run `node tools/check-book.mjs books/<id>/book.json`. It validates structure, choice and option ids, tokens, dashes, and lists multi-syllable words that still need entries.
- Book format, text tokens (`{hero}`, `{hero.he}`, `[[pet:dog=...|cat=...]]`) and scene options are documented in `README.md`.
- Offline support is in `sw.js` (cache first, refreshed in the background). When you add files that the app needs, add them to `CORE` there. Bump `CACHE` to force an update.
- Progress, names and settings are stored in `localStorage` on the device only.

## Status and next steps

- Done: reader engine, personalisation, choices and endings, syllable pop-ups, animated scenes, settings, PWA shell, offline cache. A 3-chapter demo book (`gull-rock`) exercises every feature and uses placeholder story text.
- Next: write the real first book (8 chapters, 3-4 choices, about 3 endings). Premise under consideration: the lighthouse mystery from the demo. The owner will pick the setting and genre mix once the daughter shows what she prefers.

## Book status
- `gull-rock` is now the full Goosebumps-style story "The Light on Gull Rock": 8 chapters, 4 choices (`night-plan`, `stairs-voice`, `keeper-face` score brave/clever/kind; `final` = smash/mirror/lantern, unscored) and 4 endings (secret needs brave, clever and kind all at least 1; checked first).
- Prose rules: no em dashes, no "like the way" similes, show don't tell.
- Cache is `my-library-v3`; bump it whenever shipped files change.

## Rewards (js/rewards.js, js/rewardsui.js)
- Stars live in `store.getRewards()` as `earned: {key: stars}`; keys are unique per chapter/bonus/ending/book so replays never pay twice. Rules: chapter 1, all quiz answers right first time 1, surprise 1 (1 in 6), new ending 2, book finished 1. Parents can add bonus stars.
- Prizes are star-total milestones (`{id,name,stars,given}`), set on the PIN-protected grown-ups sheet (Settings > Prizes & PIN, or the lock on the rewards page). PIN is a SHA-256 hash stored on the device; "Forgot the PIN?" erases everything.
- One postcard per finished book (cover scene + hero name + date). Reading days feed the "This week" row.
- Cache is `my-library-v10`.

## Book 2, profiles and the grown-ups report
- Books: `gull-rock` and `smugglers-tunnel` ("The Smugglers' Tunnel", Saltwick, 8 chapters). Both have `"level": 2`. Each book uses its own scene elements; keep new books visually distinct from earlier ones. Scene kit order lives in `js/scenes.js`.
- Prose rules for new books: no em dashes, no "like the way" similes, and keep similes simple, concrete and realistic (things a 10-year-old can picture straight away, e.g. "as black as coal", never abstract or poetic ones).
- Storage is `mylib.v2`: `{ profiles, order, current, pin }`. `js/store.js` keeps the same function names (`getBook`, `getSettings`, ...) but they act on the current reader. Never read `localStorage` directly in new code.
- Reading stats (`js/stats.js`, per profile): sessions per chapter, tapped words, quiz tries. `js/insights.js` holds the pure maths (tested by `node` directly). `js/parent.js` is the report page, `js/profiles.js` the reader switcher.
- Text wrapping: `glue()` in `js/syllables.js` keeps punctuation attached to its word.
- `tools/check-book.mjs` now also prints a readability score (Flesch-Kincaid) and a suggested level.
- Cache is `my-library-v38`.
- iOS/iPadOS 26.1+ paints a system blur ("scroll edge" / Liquid Glass) over the top of an installed web app that uses `apple-mobile-web-app-status-bar-style: black-translucent`, and the page cannot switch it off. So `index.html` uses `default` (opaque status bar, the page starts below it; `black` was tried first and still blurred on iPad). iOS reads this when the app is added to the Home Screen, so changing it needs the app to be removed and re-added. Back up first with the report's "Save backup" (installed web apps have their own storage that is erased with the app). The top `.bar` is opaque, full width and `position: fixed`, and the document (not an inner container) scrolls; keep it that way.
- The reader/setup top bar (`.bar`) is `position: fixed` (not sticky) with `--bar-h` padding on `.reader` and `.setup-page`. iPadOS 26 skips its blur over the top edge only when it finds a solid fixed bar there.

- Installed-app scrolling (v35): in `@media (display-mode: standalone)` the page scrolls inside `#app` (position fixed, overflow-y auto) instead of the document, so text is clipped below the iPad status strip and cannot show behind it. Use `document.getElementById('app').scrollTo` for scroll resets; `scrollIntoView` needs no change. In normal browsers the document still scrolls.
- Printing word cards (v36): an installed iPad app cannot open the print dialog (window.print does nothing), so there the cards are drawn to A4 PNG pages (`wordSheetImages` in js/parent.js) and passed to the share sheet, which has Print. Normal browsers still use the hidden #print-sheet and window.print.

## Word meanings (glossary), v37
- Each book.json can have a `"glossary"`: `{ "quay": { "mean": "...", "art": "quay", "forms": ["quays"], "sounds": "key" } }`. Words in it are underlined (solid, in the accent colour) in the story and quiz questions, and tapping one opens the word helper with the meaning, a picture if there is one, and a "Read it to me" button. Code: js/glossary.js (lookup), js/syllables.js (pop-up), js/wordart.js (pictures), report card "Meanings she looked up" in js/parent.js, `meaning()` in js/stats.js (`taps[word].d`).
- Writing entries: about 15 to 25 words per book. One or two short sentences, at or below the book's reading level, concrete (things she can picture), British spelling, no em dashes, 150 characters at most. Explain what the word means in the story. Skip words a 9 year old already knows.
- `art` is only for concrete things (quay, lantern, boot). Abstract words (relieved, hesitate) stay text only. Pictures live in js/wordart.js as small 120 x 90 scenes with their own background, so they look the same in both themes. To add one, add a function there and use its name in `art`. Shared names across books are fine (lantern, harbour, lighthouse).
- `forms` lists other spellings of the same word (plurals, -ed, -ing). `sounds` is a respelling for the voice when the spelling misleads (quay says "key"); it also fixes endings (quays says "keys").
- Only words that appear in the story text or quiz questions belong in the glossary (words that appear only in scene descriptions are never tappable).
- `node tools/check-book.mjs books/<id>/book.json` validates the glossary and lists hard-looking words that have no entry yet.

## Recap ("The story so far"), v38
- Chapters 2 and up show a "Recap" button at the right of the chapter heading. It opens a sheet with the chapter's `"recap"` array (same block format as `blocks`, so `{when:{pick,is}, p}` and `{hero}` tokens work). Chapter 1 has none. Code: `openRecap` in js/reader.js. Words in it are tappable; reading time pauses while it is open (only if it was running); "Read it to me" reads it aloud; Escape, backdrop tap or "Back to the story" close it.
- Writing rules: at most 130 words on any path, past tense, no em dashes, no hints at what comes next. Only branch on picks made in EARLIER chapters (a pick from the current chapter would spoil it). Cover who, where, what they are trying to do, and what changed since the last chapter.
- `node tools/check-book.mjs` validates all of this and fails on a recap in chapter 1, a spoiler pick, a dash or an over-long path.

## Name and icon (v39)
- The app is called **Plotling** (`APP_NAME` in js/config.js, plus index.html title, manifest name and short name). Trademark and store checks for the name were clear at the time of choosing; planned domains are plotlingstories.com and plotling.co.za.
- Do NOT rename these internals, because that would erase saved progress or break old backups: the storage keys `mylib.v2` / `mylib.v1`, the backup file's `app: 'my-library'` id (js/store.js, js/parent.js), the repo name `my-library` and the GitHub Pages URL, and the `my-library-vNN` cache prefix in sw.js. The installed iPad app is tied to the page URL, so moving to a new address later needs a backup and restore first (Grown-ups > Save backup, then Restore on the new address).
- Icon: a green sprout that forks in two (the story choices) growing out of an open book, on the navy night gradient. Files: icons/icon-192.png, icon-512.png, icon-maskable-512.png (mark at 66% for the safe zone) and apple-touch-icon.png (180). The same mark is drawn in js/logo.js for the library header. iOS reads the Home Screen icon and title when the app is added, so the iPad needs the app removed and re-added to show the new icon and name (back up first).
- Cache is `my-library-v39`.