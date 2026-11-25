// Word meanings. Each book can carry a "glossary": { headword: { mean, art?, forms?, sounds? } }.
//   mean   one or two short sentences, written at the book's reading level
//   art    optional picture name from js/wordart.js (concrete things only; abstract words stay text)
//   forms  other spellings that should show the same meaning (plurals, -ed, -ing)
//   sounds optional respelling for the voice, used when the spelling is misleading (quay -> key)
// The index is built once per book and maps every spelling to its entry.

const norm = (w) =>
	String(w)
		.toLowerCase()
		.replace(/[’']s$/, "")
		.replace(/[^a-z]/g, "");

export function buildIndex(glossary) {
	const map = new Map();
	for (const [head, e] of Object.entries(glossary || {})) {
		if (!e || !e.mean) continue;
		const entry = {
			head: head.toLowerCase(),
			mean: e.mean,
			art: e.art || null,
			sounds: e.sounds || null,
		};
		for (const w of [head, ...(e.forms || [])]) map.set(norm(w), entry);
	}
	return map;
}

// Returns the entry for a tapped word, or null.
export function lookup(index, word) {
	if (!index || !word) return null;
	return index.get(norm(word)) || null;
}

// What the voice should say for this spelling: the respelling when the entry has one.
// "quays" keeps its ending: quay -> key, so quays -> keys.
export function spoken(entry, word) {
	const w = String(word)
		.toLowerCase()
		.replace(/[’']s$/, "");
	if (!entry || !entry.sounds) return word;
	return w.startsWith(entry.head)
		? entry.sounds + w.slice(entry.head.length)
		: word;
}

// Across all books (for the grown-ups report): first entry found for a word.
export function lookupAny(books, word) {
	for (const b of books.values()) {
		const e = lookup(b.glossIndex, word);
		if (e) return e;
	}
	return null;
}
