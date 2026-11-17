// Syllable pop-ups. Longer words are listed in each book's "syllables" dictionary
// (written when the book is written, so they are accurate). Names are never wrapped.
import { h } from "./dom.js";
import * as tts from "./tts.js";
import * as store from "./store.js";

export function pieces(word, hyph) {
	const segs = hyph.split("-");
	if (segs.join("").length !== word.length) return [word];
	const out = [];
	let i = 0;
	for (const s of segs) {
		out.push(word.substr(i, s.length));
		i += s.length;
	}
	return out;
}

// parts come from personalise.compile(); returns a DocumentFragment.
// Punctuation is wrapped (.pn) and speech is tagged (.dlg) so the Reading Coach can style them.
// Keeps every word together with the punctuation and quote marks touching it, so a full stop, comma
// or opening quote can never be left alone at the start or end of a line.
export function glue(root) {
	const out = [];
	let cur = null;
	const take = (node) => {
		if (!cur) {
			cur = document.createElement("span");
			cur.className = "tk";
			out.push(cur);
		}
		cur.append(node);
	};
	for (const n of [...root.childNodes]) {
		if (n.nodeType === 3) {
			for (const t of n.textContent.split(/(\s+)/)) {
				if (!t) continue;
				if (/^\s+$/.test(t)) {
					cur = null;
					out.push(document.createTextNode(t));
				} else take(document.createTextNode(t));
			}
		} else if (n.nodeType === 1 && n.classList.contains("sn")) {
			cur = null;
			out.push(n);
		} else take(n);
	}
	root.replaceChildren(...out);
	return root;
}

export function toFragment(parts, dict) {
	const frag = document.createDocumentFragment();
	let q = false; // inside speech
	const dl = (cls) => (q ? `${cls} dlg` : cls);
	const hyph = (w) => {
		const hy = dict && dict[w.toLowerCase()];
		if (!hy || !hy.includes("-")) return null;
		const ps = pieces(w, hy);
		return ps.length > 1 ? ps : null;
	};
	const sylNode = (w, ps) =>
		frag.append(
			h(
				"button",
				{
					class: dl(ps.length >= 3 ? "syl ul" : "syl"),
					type: "button",
					"data-w": w,
					"data-s": ps.join("-"),
				},
				w,
			),
		);
	const plainWord = (w) =>
		frag.append(h("span", { class: dl("wd"), "data-w": w }, w));

	const word = (bit) => {
		if (/[’']/.test(bit)) {
			// contractions (don’t, it’s) are one tappable word; only possessives of listed words split
			const m = bit.match(/^([A-Za-z]+)[’']s$/);
			const ps = m && hyph(m[1]);
			if (ps) {
				sylNode(m[1], ps);
				frag.append(document.createTextNode(bit.slice(m[1].length)));
				return;
			}
			plainWord(bit);
			return;
		}
		const ps = hyph(bit);
		if (ps) sylNode(bit, ps);
		else plainWord(bit);
	};

	const punct = (bit) => {
		for (const t of bit.split(/([.!?…]+|[,;:]|[“”])/)) {
			if (!t) continue;
			if (/^[.!?…]+$/.test(t))
				frag.append(h("span", { class: dl("pn stop"), "data-end": "1" }, t));
			else if (/^[,;:]$/.test(t))
				frag.append(h("span", { class: dl("pn comma") }, t));
			else if (t === "“") {
				q = true;
				frag.append(h("span", { class: dl("pn oq") }, t));
			} else if (t === "”") {
				frag.append(h("span", { class: dl("pn cq") }, t));
				q = false;
			} else frag.append(document.createTextNode(t));
		}
	};

	for (const part of parts) {
		if (part.name) {
			frag.append(h("span", { class: dl("nm") }, part.text));
			continue;
		}
		let text = part.text;
		const poss = text.match(/^[’']s(?![A-Za-z])/); // the ’s after a name
		if (poss) {
			frag.append(document.createTextNode(poss[0]));
			text = text.slice(poss[0].length);
		}
		for (const bit of text.split(/([A-Za-z]+(?:[’'][A-Za-z]+)*)/)) {
			if (!bit) continue;
			if (/^[A-Za-z]/.test(bit)) word(bit);
			else punct(bit);
		}
	}
	return frag;
}

let pop = null;
let current = null;

function ensure() {
	if (pop) return pop;
	pop = h(
		"div",
		{ id: "popup", role: "dialog", "aria-label": "Word helper", hidden: true },
		h("div", { class: "pop-word" }),
		h(
			"div",
			{ class: "pop-btns" },
			h("button", { type: "button", "data-act": "say" }, "🔊 Say it"),
			h("button", { type: "button", "data-act": "slow" }, "🐢 Slowly"),
		),
	);
	document.body.append(pop);
	pop.addEventListener("click", (e) => {
		const b = e.target.closest("button");
		if (!b || !current) return;
		const word = current.getAttribute("data-w");
		const sy = (current.getAttribute("data-s") || word).split("-");
		const rate = store.getSettings().rate;
		if (b.dataset.act === "say") tts.say(word, { rate });
		else tts.sayParts(sy, word, { rate: Math.min(rate, 0.7) });
	});
	return pop;
}

function place(btn, p) {
	const r = btn.getBoundingClientRect();
	p.style.left = "0px";
	p.style.top = "0px";
	const pr = p.getBoundingClientRect();
	let left = r.left + r.width / 2 - pr.width / 2;
	left = Math.max(8, Math.min(window.innerWidth - pr.width - 8, left));
	let top = r.top - pr.height - 10;
	if (top < 8) top = r.bottom + 10;
	p.style.left = `${left}px`;
	p.style.top = `${top}px`;
}

function open(btn) {
	const p = ensure();
	if (current === btn && !p.hidden) {
		closePopup();
		return;
	}
	current = btn;
	const hasSyl = btn.hasAttribute("data-s");
	const syl = (
		hasSyl ? btn.getAttribute("data-s") : btn.getAttribute("data-w")
	).split("-");
	const kids = [];
	p.querySelector("[data-act=slow]").hidden = !hasSyl;
	if (!hasSyl) kids.push(h("span", { class: "sy sy0" }, syl[0]));
	else
		syl.forEach((s, i) => {
			kids.push(h("span", { class: `sy sy${i % 3}` }, s));
			if (i < syl.length - 1) kids.push(h("i", {}, "·"));
		});
	p.querySelector(".pop-word").replaceChildren(...kids);
	p.hidden = false;
	place(btn, p);
}

export function closePopup() {
	if (pop) pop.hidden = true;
	current = null;
}

export function initSyllables() {
	document.addEventListener("click", (e) => {
		const w = e.target.closest && e.target.closest(".syl, .wd");
		if (w) {
			e.preventDefault();
			open(w);
			return;
		}
		if (pop && !pop.contains(e.target)) closePopup();
	});
	window.addEventListener("scroll", closePopup, { passive: true });
	document.addEventListener("keydown", (e) => {
		if (e.key === "Escape") closePopup();
	});
}
