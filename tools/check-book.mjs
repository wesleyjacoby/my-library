#!/usr/bin/env node
// Authoring check for a book.json.
//   node tools/check-book.mjs books/gull-rock/book.json
// Reports: structure problems, syllable entries whose letters don't match the word,
// longer words (7+ letters) that have no syllable entry yet, the glossary (word meanings and pictures),
// and hard-looking words that have no glossary entry yet.
import { readFileSync, existsSync } from "node:fs";
import { ART_NAMES } from "../js/wordart.js";

const file = process.argv[2];
if (!file) {
	console.error("Usage: node tools/check-book.mjs path/to/book.json");
	process.exit(1);
}
const book = JSON.parse(readFileSync(file, "utf8"));
const problems = [];
const sharedPath = new URL("../data/syllables.json", import.meta.url);
const shared = existsSync(sharedPath)
	? JSON.parse(readFileSync(sharedPath, "utf8"))
	: {};
const dict = { ...shared, ...(book.syllables || {}) };

// Rough syllable estimate, only used to decide which words to ask you to check.
function estimate(word) {
	let w = word.toLowerCase();
	if (w.length <= 3) return 1;
	w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
	const m = w.match(/[aeiouy]{1,2}/g);
	return m ? m.length : 1;
}

// --- syllable dictionary sanity (shared file and this book) ---
for (const [word, hy] of Object.entries(dict)) {
	if (hy.replace(/-/g, "") !== word)
		problems.push(`syllables: "${word}" -> "${hy}" does not spell the word`);
	if (word !== word.toLowerCase())
		problems.push(`syllables: key "${word}" must be lower case`);
}

// --- collect prose ---
const prose = [];
const slotKeys = new Set((book.cast || []).map((c) => c.key));
const optIds = new Set();
const choiceIds = new Set();
const traits = new Set(book.traits || []);

function walk(blocks, where) {
	for (const b of blocks || []) {
		if (typeof b === "string") {
			prose.push(b);
			continue;
		}
		if (b.p) prose.push(b.p);
		if (b.when) checkCond(b.when, where);
		if (b.blocks) walk(b.blocks, where);
		if (b.choice) {
			const c = b.choice;
			if (!c.id) problems.push(`${where}: choice without id`);
			if (choiceIds.has(c.id))
				problems.push(`${where}: duplicate choice id "${c.id}"`);
			choiceIds.add(c.id);
			prose.push(c.prompt || "");
			const seen = new Set();
			for (const o of c.options || []) {
				if (!o.id) problems.push(`${where}: option without id in "${c.id}"`);
				if (seen.has(o.id))
					problems.push(`${where}: duplicate option id "${o.id}" in "${c.id}"`);
				seen.add(o.id);
				optIds.add(`${c.id}:${o.id}`);
				prose.push(o.label || "");
				for (const t of Object.keys(o.score || {}))
					if (!traits.has(t))
						problems.push(`${where}: score uses unknown trait "${t}"`);
				walk(
					o.blocks || (typeof o.text === "string" ? [o.text] : o.text),
					where,
				);
			}
		}
	}
}

const condsToCheck = [];
function checkCond(c, where) {
	condsToCheck.push([c, where]);
}

(book.chapters || []).forEach((ch, i) => walk(ch.blocks, `chapter ${i + 1}`));

// --- recaps ("The story so far" sheet): chapter 2 onwards, spoiler-safe, short ---
const choiceChapter = new Map(); // choice id -> chapter index it appears in
const findChoices = (blocks, i) =>
	(blocks || []).forEach((b) => {
		if (!b || typeof b === "string") return;
		if (b.choice) {
			choiceChapter.set(b.choice.id, i);
			b.choice.options.forEach((o) => findChoices(o.blocks, i));
		}
		if (b.blocks) findChoices(b.blocks, i);
	});
(book.chapters || []).forEach((ch, i) => findChoices(ch.blocks, i));
(book.chapters || []).forEach((ch, i) => {
	const where = `chapter ${i + 1} recap`;
	const rc = ch.recap;
	if (i === 0) {
		if (rc)
			problems.push(`${where}: chapter 1 has nothing to recap, remove it`);
		return;
	}
	if (!Array.isArray(rc) || !rc.length) {
		console.log(
			`  Note: chapter ${i + 1} has no "recap" (the Recap button only shows when there is one).`,
		);
		return;
	}
	const byPick = new Map();
	let base = 0;
	for (const b of rc) {
		const text = typeof b === "string" ? b : b && b.p;
		if (typeof text !== "string" || !text.trim()) {
			problems.push(`${where}: each block must be a string or { p, when }`);
			continue;
		}
		if (b && (b.choice || b.blocks || b.scene))
			problems.push(
				`${where}: recaps are plain paragraphs (no choices, scenes or nested blocks)`,
			);
		if (/—|–/.test(text)) problems.push(`${where}: has a dash; no em dashes`);
		if (/like the way/i.test(text))
			problems.push(`${where}: uses "like the way"`);
		const n = text.split(/\s+/).length;
		if (b && b.when) {
			checkCond(b.when, where);
			for (const c of [].concat(b.when.all || b.when.any || b.when)) {
				const id = c && c.pick;
				if (
					id !== undefined &&
					choiceChapter.has(id) &&
					choiceChapter.get(id) >= i
				)
					problems.push(
						`${where}: mentions the choice "${id}" from chapter ${choiceChapter.get(id) + 1}, which she has not made yet (spoiler)`,
					);
				if (id !== undefined) byPick.set(id, Math.max(byPick.get(id) || 0, n));
			}
		} else base += n;
	}
	const longest = base + [...byPick.values()].reduce((a, b) => a + b, 0);
	if (longest > 130)
		problems.push(
			`${where}: ${longest} words on the longest path; keep a recap to about 130 words or fewer`,
		);
});
(book.chapters || []).forEach((ch, i) => {
	const texts = [];
	const collect = (blocks) =>
		(blocks || []).forEach((b) => {
			if (typeof b === "string") texts.push(b);
			else if (b) {
				if (b.p) texts.push(b.p);
				if (b.blocks) collect(b.blocks);
				if (b.choice) b.choice.options.forEach((o) => collect(o.blocks));
			}
		});
	collect(ch.blocks);
	(ch.questions || []).forEach((q, n) => {
		const where = `chapter ${i + 1} question ${n + 1}`;
		if (!Array.isArray(q.options) || q.options.length < 2)
			problems.push(`${where}: needs at least 2 options`);
		else if (
			!Number.isInteger(q.answer) ||
			q.answer < 0 ||
			q.answer >= q.options.length
		)
			problems.push(`${where}: answer index is not an option`);
		if (!q.find || !texts.some((t) => t.includes(q.find)))
			problems.push(`${where}: "find" text is not in the chapter`);
	});
});
(book.endings || []).forEach((e) => {
	if (e.when) checkCond(e.when, `ending ${e.id}`);
	walk(e.blocks, `ending ${e.id}`);
});

function validateCond(c, where) {
	if (c.all) c.all.forEach((x) => validateCond(x, where));
	if (c.any) c.any.forEach((x) => validateCond(x, where));
	if (c.not) validateCond(c.not, where);
	if (c.pick !== undefined) {
		if (!choiceIds.has(c.pick))
			problems.push(`${where}: condition refers to unknown choice "${c.pick}"`);
		for (const k of ["is", "isNot"])
			if (c[k] !== undefined && !optIds.has(`${c.pick}:${c[k]}`))
				problems.push(
					`${where}: condition refers to unknown option "${c.pick}:${c[k]}"`,
				);
	}
	for (const k of ["score", "top"])
		if (c[k] && !traits.has(c[k]))
			problems.push(`${where}: condition uses unknown trait "${c[k]}"`);
}
condsToCheck.forEach(([c, w]) => validateCond(c, w));

// --- tokens ---
const text = prose.join("\n");
for (const m of text.matchAll(/\{(\w+)(?:’s|'s)?(?:\.(\w+))?\}/g)) {
	if (!slotKeys.has(m[1]))
		problems.push(`unknown character slot in token ${m[0]}`);
	if (
		m[2] &&
		![
			"he",
			"him",
			"his",
			"hers",
			"self",
			"is",
			"has",
			"was",
			"does",
			"s",
		].includes(m[2].toLowerCase())
	)
		problems.push(`unknown pronoun token ${m[0]}`);
}
for (const m of text.matchAll(/\[\[(\w+):/g))
	if (!slotKeys.has(m[1])) problems.push(`unknown slot in switch ${m[0]}...`);
if (/[—–]/.test(text))
	problems.push("prose contains a dash character (— or –)");

// --- missing syllable entries ---
const clean = text
	.replace(/\[\[\w+:([^\]]+)\]\]/g, (m, o) =>
		o
			.split("|")
			.map((p) => p.slice(p.indexOf("=") + 1))
			.join(" "),
	)
	.replace(/\{[^}]+\}/g, " ");
const words = new Set(
	(clean.match(/[A-Za-z]{4,}/g) || []).map((w) => w.toLowerCase()),
);
const missing = [...words]
	.filter((w) => !(w in dict) && estimate(w) >= 2)
	.sort();

// --- readability (Flesch-Kincaid grade, a rough guide only) ---
// Level thresholds: 1 = grade up to 1.3, 2 = up to 3.0, 3 = above (calibrated so the two 8+ books are level 2). Dialogue-heavy chapter books score low
// because the sentences are short, so judge the level by the grade AND by reading the text aloud.
const plainText = prose
	.join(" ")
	.replace(/\[\[\w+:([^\]|]+)[^\]]*\]\]/g, (m, o) =>
		o.slice(o.indexOf("=") + 1),
	)
	.replace(/\{\w+(?:’s|'s)?\.(?:he|she|they)\}/g, "he")
	.replace(/\{\w+(?:’s|'s)?\.[a-z]+\}/g, "him")
	.replace(/\{[^}]+\}/g, "Sam");
const sentences = plainText
	.split(/(?<=[.!?])["”’']*\s+/)
	.filter((s) => /[A-Za-z]/.test(s));
const rwords = plainText.match(/[A-Za-z]+(?:[’'][A-Za-z]+)*/g) || [];
const sylOf = (w) => {
	const k = w.toLowerCase();
	return k in dict && dict[k].includes("-")
		? dict[k].split("-").length
		: estimate(k.replace(/[’'].*$/, ""));
};
const syls = rwords.map(sylOf);
const wps = rwords.length / Math.max(1, sentences.length);
const spw = syls.reduce((a, b) => a + b, 0) / Math.max(1, rwords.length);
const long = syls.filter((s) => s >= 3).length / Math.max(1, rwords.length);
const grade = 0.39 * wps + 11.8 * spw - 15.59;
const suggested = grade <= 1.3 ? 1 : grade <= 3.0 ? 2 : 3;
console.log(
	`Readability: grade ${grade.toFixed(1)} (${wps.toFixed(1)} words per sentence, ${spw.toFixed(2)} syllables per word, ${(long * 100).toFixed(0)}% words with 3+ syllables). Suggested level ${suggested}.`,
);
if (book.level === undefined)
	console.log(
		`  No "level" in the book yet. Add  "level": ${suggested}  to book.json.`,
	);
else if (book.level !== suggested)
	console.log(
		`  Note: the book says level ${book.level} but the text scores like level ${suggested}. Check the text, or change "level".`,
	);
else console.log(`  Matches the book's level (${book.level}).`);
console.log("");

// --- glossary (word meanings) ---
const gl = book.glossary || {};
const glSpellings = new Map();
const quizText = (book.chapters || [])
	.flatMap((c) => (c.questions || []).map((q) => q.q || ""))
	.join(" ");
const proseLower =
	" " +
	(plainText + " " + quizText).toLowerCase().replace(/[^a-z’' ]+/g, " ") +
	" ";
let withArt = 0;
for (const [head, e] of Object.entries(gl)) {
	if (head !== head.toLowerCase())
		problems.push(`glossary: key "${head}" must be lower case`);
	if (!e || typeof e.mean !== "string" || !e.mean.trim()) {
		problems.push(`glossary: "${head}" has no "mean"`);
		continue;
	}
	if (e.mean.length > 150)
		problems.push(
			`glossary: "${head}" meaning is ${e.mean.length} characters; keep it to one or two short sentences (150 max)`,
		);
	if (/—|–/.test(e.mean))
		problems.push(`glossary: "${head}" meaning has a dash; no em dashes`);
	if (/like the way/i.test(e.mean))
		problems.push(`glossary: "${head}" meaning uses "like the way"`);
	if (e.art) {
		withArt++;
		if (!ART_NAMES.includes(e.art))
			problems.push(
				`glossary: "${head}" art "${e.art}" is not in js/wordart.js (${ART_NAMES.join(", ")})`,
			);
	}
	if (
		e.forms !== undefined &&
		!(Array.isArray(e.forms) && e.forms.every((f) => typeof f === "string"))
	)
		problems.push(`glossary: "${head}" forms must be a list of words`);
	const spellings = [head, ...(Array.isArray(e.forms) ? e.forms : [])].map(
		(x) => x.toLowerCase(),
	);
	for (const w of spellings) {
		if (glSpellings.has(w))
			problems.push(
				`glossary: "${w}" is listed under both "${glSpellings.get(w)}" and "${head}"`,
			);
		glSpellings.set(w, head);
	}
	if (
		!spellings.some(
			(w) => proseLower.includes(` ${w} `) || proseLower.includes(` ${w}’s `),
		)
	)
		console.log(
			`  Note: glossary word "${head}" never appears in the story text.`,
		);
}
if (Object.keys(gl).length) {
	const mw = Object.values(gl)
		.map((e) => e.mean || "")
		.join(" ");
	const ms = mw.split(/(?<=[.!?])\s+/).filter(Boolean).length || 1;
	const mwords = mw.match(/[A-Za-z]+/g) || [];
	const mg =
		0.39 * (mwords.length / ms) +
		11.8 *
			(mwords.map((w) => sylOf(w)).reduce((a, b) => a + b, 0) /
				Math.max(1, mwords.length)) -
		15.59;
	console.log(
		`Glossary: ${Object.keys(gl).length} words, ${withArt} with pictures. The meanings read at about grade ${mg.toFixed(1)} (aim for no higher than the story).`,
	);
} else
	console.log(
		'Glossary: none yet. Add a "glossary" so hard words can show a meaning (see CLAUDE.md).',
	);
const unexplained = [...words]
	.filter(
		(w) =>
			w.length >= 7 &&
			estimate(w) >= 3 &&
			!glSpellings.has(w) &&
			!/(?:ing|ed|ly|ness|ful|less|ers?|ies|s)$/.test(w),
	)
	.sort();
if (unexplained.length)
	console.log(
		"  Hard-looking words with no glossary entry (explain any a child might not know):\n    " +
			unexplained.join(", "),
	);
console.log("");

if (problems.length) {
	console.log("PROBLEMS:");
	problems.forEach((p) => console.log("  - " + p));
} else console.log("Structure OK.");
if (missing.length) {
	console.log(
		'\nWords that look like 2+ syllables but have no entry. Add each to data/syllables.json (shared) or the book\'s "syllables".',
	);
	console.log(
		'If one is really a single syllable, add it with no hyphen (e.g. "through": "through") so it is not flagged again:',
	);
	console.log("  " + missing.join(", "));
} else console.log("All multi-syllable words have entries.");
process.exit(problems.length ? 1 : 0);
