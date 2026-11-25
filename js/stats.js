// Records how she reads: active time per chapter, words, tapped words and quiz tries.
// Everything is stored on the device in the current reader's profile.
//
// Reading time only counts while the page is visible and she has touched, scrolled or pressed
// something in the last IDLE_MS. Time spent deciding on a story choice is paused, and a chapter
// heard with read-aloud is flagged so it is left out of the speed estimate.
// Reading counts as finished when she answers the first quick-check question or turns the page
// (the text appears all at once, so there is no earlier sign she reached the end).
import * as store from "./store.js";

const IDLE_MS = 120000;
const SAVE_EVERY = 15; // seconds
const MAX_SESSIONS = 600;
const MAX_QUIZ = 800;
const MAX_TAPS = 500;

let cur = null; // { rec, paused }
let timer = null;
let lastTouch = Date.now();
let lastTick = Date.now();
let ticks = 0;

const touch = () => {
	lastTouch = Date.now();
};

function save() {
	store.saveStats();
}

// Adds `dt` ms of active time to the running chapter. The timer calls this once a second.
export function advance(dt) {
	if (!cur || cur.paused) return;
	cur.rec.ms += dt;
	if (!cur.rec.done) cur.rec.rms += dt;
}

function tick() {
	const now = Date.now();
	const dt = Math.min(now - lastTick, 2000);
	lastTick = now;
	if (!document.hidden && now - lastTouch < IDLE_MS) advance(dt);
	ticks += 1;
	if (ticks % SAVE_EVERY === 0 && cur) save();
}

function boot() {
	if (timer) return;
	for (const ev of ["pointerdown", "keydown", "scroll", "touchstart"])
		window.addEventListener(ev, touch, { passive: true, capture: true });
	timer = setInterval(tick, 1000);
	document.addEventListener("visibilitychange", () => {
		if (document.hidden) {
			if (cur) save();
		} else {
			lastTick = Date.now();
		}
	});
	window.addEventListener("pagehide", () => {
		if (cur) save();
	});
}

// A new chapter has been opened.
export function start(book, idx, wordsFn) {
	boot();
	end();
	const s = store.getStats();
	const rep = s.sessions.some((x) => x.b === book.id && x.c === idx && x.done);
	const rec = {
		t: Date.now(),
		b: book.id,
		c: idx,
		ms: 0,
		rms: 0,
		w: 0,
		done: false,
		aloud: false,
		rep,
	};
	s.sessions.push(rec);
	if (s.sessions.length > MAX_SESSIONS)
		s.sessions.splice(0, s.sessions.length - MAX_SESSIONS);
	cur = { rec, paused: false, wordsFn };
	touch();
	lastTick = Date.now();
	save();
}

export function end() {
	if (cur) {
		save();
		cur = null;
	}
}

export const pause = () => {
	if (cur) cur.paused = true;
};
export const resume = () => {
	if (cur) {
		cur.paused = false;
		touch();
	}
};
export const markAloud = () => {
	if (cur) cur.rec.aloud = true;
};

// She has finished reading the chapter text. Safe to call more than once.
export function readingDone() {
	if (!cur || cur.rec.done) return;
	cur.rec.done = true;
	cur.rec.w = cur.wordsFn ? cur.wordsFn() : 0;
	cur.paused = false;
	save();
}

export function quiz(qid, wrong) {
	if (!cur) return;
	const s = store.getStats();
	s.quiz.push({ t: Date.now(), b: cur.rec.b, c: cur.rec.c, q: qid, w: wrong });
	if (s.quiz.length > MAX_QUIZ) s.quiz.splice(0, s.quiz.length - MAX_QUIZ);
	save();
}

const key = (w) =>
	String(w)
		.toLowerCase()
		.replace(/[^a-z’']/g, "");

// She opened a word's meaning (words in the book's glossary only).
export function meaning(word) {
	const k = key(word);
	if (!k) return;
	const s = store.getStats();
	const e = s.taps[k] || (s.taps[k] = { n: 0, s: 0 });
	e.d = (e.d || 0) + 1;
	save();
}

// She tapped a word to open the helper.
export function tap(word) {
	const k = key(word);
	if (!k) return;
	const s = store.getStats();
	const e = s.taps[k] || (s.taps[k] = { n: 0, s: 0 });
	e.n += 1;
	if (Object.keys(s.taps).length > MAX_TAPS) {
		const list = Object.entries(s.taps).sort(
			(a, b) => a[1].n + 2 * a[1].s - (b[1].n + 2 * b[1].s),
		);
		list.slice(0, 100).forEach(([w]) => {
			if (w !== k) delete s.taps[w];
		});
	}
	save();
}

// She asked to hear the word (Say it or Slowly). A stronger sign the word was hard.
export function help(word) {
	const k = key(word);
	if (!k) return;
	const s = store.getStats();
	const e = s.taps[k] || (s.taps[k] = { n: 0, s: 0 });
	e.s += 1;
	save();
}
