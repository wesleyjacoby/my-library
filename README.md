# Plotling

(Formerly "My Library". The repo folder, storage key and backup id keep the old name on purpose, see CLAUDE.md.)

Interactive chapter books where the reader is the hero. A static PWA: no build step, no server, works offline on an iPad.

## Put it on GitHub Pages

1. Create a repo and push everything in this folder to the `main` branch.
2. Repo **Settings > Pages > Build and deployment**: Source "Deploy from a branch", branch `main`, folder `/ (root)`.
3. Open `https://<you>.github.io/<repo>/` in Safari on the iPad, then **Share > Add to Home Screen**.

All paths are relative, so it works from a repo sub-folder. After you push changes, the app picks them up the next time it is opened (it may take two opens). To force old files out straight away, change `CACHE` in `sw.js` (for example `my-library-v2`).

To rename the app: `js/config.js` (inside the app), `index.html` and `manifest.webmanifest` (home screen).

## Adding a book

1. Make `books/<id>/book.json` and add `<id>` to `books/index.json`.
2. Optional cover: put `cover.jpg` in the book folder and set `"cover": { "image": "cover.jpg" }`. Without it, the cover is drawn from a scene.
3. Run the checker and fix anything it reports:

       node tools/check-book.mjs books/<id>/book.json

   It checks the structure, choice and option ids, character tokens, dash characters, and lists every word that looks like 2+ syllables but has no entry yet.

Test locally with `python3 -m http.server` and open `http://localhost:8000`.

## Book format (see `books/gull-rock/book.json`)

- `level`: reading level 1, 2 or 3 (see `LEVELS` in `js/config.js`), shown on the book card and in the grown-ups report. `node tools/check-book.mjs` prints a readability score and a suggested level. Both current books are level 2. Level is about reading difficulty; `ages` is about interest.
- `glossary`: short meanings (and optional pictures) for the hard words in a story. Underlined words open the meaning when tapped. See "Word meanings" in `CLAUDE.md` for how to write entries.
- `recap` (chapters 2 and up): a short "story so far" for the Recap button. It can branch on earlier picks. See "Recap" in `CLAUDE.md`.
- `cast`: the characters the reader fills in. Each has a `key`, `label`, `default`, optional `altDefault` (used if the default clashes with another name), `pronouns` options, and optional `variants` (e.g. dog or cat).
- `traits`: hidden scores, e.g. `["brave", "kind", "clever"]`.
- `syllables`: `"lighthouse": "light-house"`. Only listed words get a tap-for-syllables pop-up, and names never do. Common words live in `data/syllables.json` (shared by every book); a book's own list adds to or overrides it. Every 2+ syllable word is tappable and only 3+ syllable words get the dotted underline. List one-syllable words without a hyphen (`"through": "through"`) so the checker stops flagging them.
- `chapters[]`: `title`, `scene`, `blocks`. A block is a string (one paragraph), `{ "scene": {...} }`, `{ "choice": {...} }`, or `{ "when": {...}, "blocks": [...] }`.
- `choice`: `id`, `prompt`, `options[]` each with `id`, `label`, `score` (e.g. `{ "brave": 1 }`) and `blocks` that appear after it is picked. The chapter does not finish until the choice is made.
- `endings[]`: the first one whose `when` matches is shown, so put a catch-all last.
- Conditions: `{ "pick": "choiceId", "is": "optionId" }`, `{ "score": "brave", "atLeast": 2 }`, `{ "top": "brave" }`, plus `all`, `any`, `not`.

### Text tokens

| Write                                                             | Shows                                                                  |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `{hero}` / `{hero’s}`                                             | the name / possessive (James’)                                         |
| `{hero.he}` `{hero.him}` `{hero.his}` `{hero.hers}` `{hero.self}` | he/she/they, him/her/them, his/her/their ... (`{hero.He}` capitalises) |
| `{hero.is}` `{hero.has}` `{hero.was}` `{hero.does}`               | verbs that agree (is/are, has/have ...)                                |
| `{hero.s}`                                                        | "s" for he/she/it, nothing for they (`walk{hero.s}`)                   |
| `[[pet:dog=barked\|cat=miaowed]]`                                 | text that depends on the dog/cat choice                                |

## Scenes

A scene is `{ "mood": "night", "elements": [...], "alt": "..." }`.

- Moods: `day`, `dawn`, `dusk`, `night`, `storm`, `cave`.
- Elements: `stars`, `moon`, `clouds`, `gulls`, `hills`, `sea`, `causeway`, `village`, `cliff`, `lighthouse`, `beam`, `boat`, `house`, `trees`, `tunnel`, `stairs`, `lens`, `keeper`, `glow`, `fog`, `rain`.
- Optional `align` (e.g. `xMaxYMid`) controls which part shows when a scene is cropped, such as on covers.

New elements go in `js/scenes.js` (a draw function) and `css/styles.css` (an animation). Animation switches off with the Settings toggle or the iPad's Reduce Motion setting.

## Notes

- Progress, names and settings are stored in the browser on that device only (`localStorage` key `mylib.v2`). Clearing Safari website data erases them. The grown-ups report has "Save backup" and "Restore backup" for this.
- **Readers (profiles):** each reader has their own progress, stars, prizes, names, settings and reading stats. The grown-ups PIN is shared by the device. Adding, editing and deleting readers needs the PIN. The old single-reader save (`mylib.v1`) is migrated into the first profile ("Reader") automatically and left in place as a backup.
- **Grown-ups report** (`#/parent`, the 📊 button, behind the PIN): time read, streak, a reading speed estimate, quick-check accuracy, words to practise, and a copyable summary. Reading speed is words divided by active reading time. Time is paused while a story choice is waiting and while she is idle (2 minutes), and chapters that were heard read-aloud, re-read, or flicked through are left out. Reading ends when she answers the first quick-check question or turns the page.
- Read-aloud and the pop-up's "Say it" use the device's built-in voices, so they work offline. Quality varies a lot: on an iPad, download an Enhanced or Premium English voice under Settings > Accessibility > Spoken Content > Voices, then pick it in the app's Settings.