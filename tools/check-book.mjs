#!/usr/bin/env node
// Authoring check for a book.json.
//   node tools/check-book.mjs books/gull-rock/book.json
// Reports: structure problems, syllable entries whose letters don't match the word,
// and longer words (7+ letters) that have no syllable entry yet.
import { readFileSync, existsSync } from 'node:fs';

const file = process.argv[2];
if (!file) { console.error('Usage: node tools/check-book.mjs path/to/book.json'); process.exit(1); }
const book = JSON.parse(readFileSync(file, 'utf8'));
const problems = [];
const sharedPath = new URL('../data/syllables.json', import.meta.url);
const shared = existsSync(sharedPath) ? JSON.parse(readFileSync(sharedPath, 'utf8')) : {};
const dict = { ...shared, ...(book.syllables || {}) };

// Rough syllable estimate, only used to decide which words to ask you to check.
function estimate(word) {
  let w = word.toLowerCase();
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const m = w.match(/[aeiouy]{1,2}/g);
  return m ? m.length : 1;
}

// --- syllable dictionary sanity (shared file and this book) ---
for (const [word, hy] of Object.entries(dict)) {
  if (hy.replace(/-/g, '') !== word) problems.push(`syllables: "${word}" -> "${hy}" does not spell the word`);
  if (word !== word.toLowerCase()) problems.push(`syllables: key "${word}" must be lower case`);
}

// --- collect prose ---
const prose = [];
const slotKeys = new Set((book.cast || []).map((c) => c.key));
const optIds = new Set();
const choiceIds = new Set();
const traits = new Set(book.traits || []);

function walk(blocks, where) {
  for (const b of blocks || []) {
    if (typeof b === 'string') { prose.push(b); continue; }
    if (b.p) prose.push(b.p);
    if (b.when) checkCond(b.when, where);
    if (b.blocks) walk(b.blocks, where);
    if (b.choice) {
      const c = b.choice;
      if (!c.id) problems.push(`${where}: choice without id`);
      if (choiceIds.has(c.id)) problems.push(`${where}: duplicate choice id "${c.id}"`);
      choiceIds.add(c.id);
      prose.push(c.prompt || '');
      const seen = new Set();
      for (const o of c.options || []) {
        if (!o.id) problems.push(`${where}: option without id in "${c.id}"`);
        if (seen.has(o.id)) problems.push(`${where}: duplicate option id "${o.id}" in "${c.id}"`);
        seen.add(o.id);
        optIds.add(`${c.id}:${o.id}`);
        prose.push(o.label || '');
        for (const t of Object.keys(o.score || {})) if (!traits.has(t)) problems.push(`${where}: score uses unknown trait "${t}"`);
        walk(o.blocks || (typeof o.text === 'string' ? [o.text] : o.text), where);
      }
    }
  }
}

const condsToCheck = [];
function checkCond(c, where) { condsToCheck.push([c, where]); }

(book.chapters || []).forEach((ch, i) => walk(ch.blocks, `chapter ${i + 1}`));
(book.endings || []).forEach((e) => { if (e.when) checkCond(e.when, `ending ${e.id}`); walk(e.blocks, `ending ${e.id}`); });

function validateCond(c, where) {
  if (c.all) c.all.forEach((x) => validateCond(x, where));
  if (c.any) c.any.forEach((x) => validateCond(x, where));
  if (c.not) validateCond(c.not, where);
  if (c.pick !== undefined) {
    if (!choiceIds.has(c.pick)) problems.push(`${where}: condition refers to unknown choice "${c.pick}"`);
    for (const k of ['is', 'isNot']) if (c[k] !== undefined && !optIds.has(`${c.pick}:${c[k]}`)) problems.push(`${where}: condition refers to unknown option "${c.pick}:${c[k]}"`);
  }
  for (const k of ['score', 'top']) if (c[k] && !traits.has(c[k])) problems.push(`${where}: condition uses unknown trait "${c[k]}"`);
}
condsToCheck.forEach(([c, w]) => validateCond(c, w));

// --- tokens ---
const text = prose.join('\n');
for (const m of text.matchAll(/\{(\w+)(?:’s|'s)?(?:\.(\w+))?\}/g)) {
  if (!slotKeys.has(m[1])) problems.push(`unknown character slot in token ${m[0]}`);
  if (m[2] && !['he', 'him', 'his', 'hers', 'self', 'is', 'has', 'was', 'does', 's'].includes(m[2].toLowerCase())) problems.push(`unknown pronoun token ${m[0]}`);
}
for (const m of text.matchAll(/\[\[(\w+):/g)) if (!slotKeys.has(m[1])) problems.push(`unknown slot in switch ${m[0]}...`);
if (/[—–]/.test(text)) problems.push('prose contains a dash character (— or –)');

// --- missing syllable entries ---
const clean = text
  .replace(/\[\[\w+:([^\]]+)\]\]/g, (m, o) => o.split('|').map((p) => p.slice(p.indexOf('=') + 1)).join(' '))
  .replace(/\{[^}]+\}/g, ' ');
const words = new Set((clean.match(/[A-Za-z]{4,}/g) || []).map((w) => w.toLowerCase()));
const missing = [...words].filter((w) => !(w in dict) && estimate(w) >= 2).sort();

if (problems.length) { console.log('PROBLEMS:'); problems.forEach((p) => console.log('  - ' + p)); }
else console.log('Structure OK.');
if (missing.length) {
  console.log('\nWords that look like 2+ syllables but have no entry. Add each to data/syllables.json (shared) or the book\'s "syllables".');
  console.log('If one is really a single syllable, add it with no hyphen (e.g. "through": "through") so it is not flagged again:');
  console.log('  ' + missing.join(', '));
} else console.log('All multi-syllable words have entries.');
process.exit(problems.length ? 1 : 0);
