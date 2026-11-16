# My Library: project notes for Claude Code

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
