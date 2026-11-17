// All progress lives on the device (localStorage), nothing is sent anywhere.
import { STORAGE_KEY } from "./config.js";

const DEFAULT_SETTINGS = {
	size: 1,
	theme: "paper",
	anim: true,
	rate: 0.9,
	readAloud: true,
	voice: "",
	coach: false,
	coachFocus: true,
	coachMarks: true,
};
const blankRewards = () => ({
	earned: {},
	log: [],
	days: [],
	prizes: [],
	postcards: [],
	pin: null,
});
let mem = null;

function read() {
	if (mem) return mem;
	let saved = null;
	try {
		saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
	} catch (e) {
		/* ignore */
	}
	mem = {
		settings: { ...DEFAULT_SETTINGS, ...((saved && saved.settings) || {}) },
		books: (saved && saved.books) || {},
		lastCast: (saved && saved.lastCast) || {},
		rewards: { ...blankRewards(), ...((saved && saved.rewards) || {}) },
	};
	return mem;
}

function write() {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(read()));
	} catch (e) {
		/* private mode etc: keep in memory */
	}
}

export function getRewards() {
	return read().rewards;
}
export function saveRewards() {
	write();
}

export function getSettings() {
	return read().settings;
}
export function setSetting(key, value) {
	read().settings[key] = value;
	write();
}

const blankBook = () => ({
	cast: null,
	picks: {},
	chapter: 0,
	started: false,
	finished: false,
	endings: [],
	quiz: {},
});

export function getBook(id) {
	const d = read();
	if (!d.books[id]) d.books[id] = blankBook();
	return d.books[id];
}

export function patchBook(id, patch) {
	Object.assign(getBook(id), patch);
	write();
}

// Start a fresh read-through. Endings already found are kept.
export function restartBook(id, cast) {
	const b = getBook(id);
	patchBook(id, {
		cast: cast || b.cast,
		picks: {},
		chapter: 0,
		started: true,
		finished: false,
		quiz: {},
	});
}

export function getLastCast() {
	return read().lastCast;
}
export function setLastCast(cast) {
	read().lastCast = cast;
	write();
}

export function resetAll() {
	const settings = read().settings;
	mem = { settings, books: {}, lastCast: {}, rewards: blankRewards() };
	write();
}
