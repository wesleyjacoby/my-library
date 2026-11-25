// All progress lives on the device (localStorage), nothing is sent anywhere.
// Layout (mylib.v2): one record per reader profile (settings, book progress, rewards, reading stats),
// plus app-wide data that is shared by everyone on the device (the grown-ups PIN).
import { STORAGE_KEY, LEGACY_KEY } from "./config.js";

export const AVATARS = [
	"🦊",
	"🐱",
	"🐶",
	"🦉",
	"🐢",
	"🦄",
	"🐙",
	"🚀",
	"🌟",
	"🐼",
	"🦖",
	"🐸",
];
export const MAX_PROFILES = 6;

const DEFAULT_SETTINGS = {
	size: 1,
	theme: "paper",
	anim: true,
	rate: 0.9,
	readAloud: true,
	voice: "",
	font: "book",
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
});
const blankStats = () => ({
	sessions: [],
	taps: {},
	quiz: [],
	since: Date.now(),
});
const blankProfile = (id, name, avatar, settings) => ({
	id,
	name,
	avatar,
	created: Date.now(),
	settings: { ...DEFAULT_SETTINGS, ...(settings || {}) },
	books: {},
	lastCast: {},
	rewards: blankRewards(),
	stats: blankStats(),
});

let mem = null;

// Fills in anything missing so older saves keep working when new fields are added.
function fixProfile(p, id) {
	const base = blankProfile(id, "Reader", AVATARS[0]);
	return {
		...base,
		...p,
		id,
		name: String(p.name || base.name).slice(0, 20),
		avatar: p.avatar || base.avatar,
		settings: { ...DEFAULT_SETTINGS, ...(p.settings || {}) },
		books: p.books || {},
		lastCast: p.lastCast || {},
		rewards: { ...blankRewards(), ...(p.rewards || {}) },
		stats: { ...blankStats(), ...(p.stats || {}) },
	};
}

function fromV2(saved) {
	const profiles = {};
	const order = (saved.order || Object.keys(saved.profiles)).filter(
		(id) => saved.profiles[id],
	);
	order.forEach((id) => {
		profiles[id] = fixProfile(saved.profiles[id], id);
	});
	if (!order.length) return null;
	return {
		v: 2,
		current: profiles[saved.current] ? saved.current : order[0],
		order,
		profiles,
		pin: saved.pin || null,
	};
}

// The old single-reader save becomes the first profile. The old key is left in place as a backup.
function fromV1(v1) {
	const p = blankProfile("p1", "Reader", AVATARS[0], v1.settings);
	p.books = v1.books || {};
	p.lastCast = v1.lastCast || {};
	const r = { ...blankRewards(), ...(v1.rewards || {}) };
	const pin = r.pin || null;
	delete r.pin;
	p.rewards = r;
	return { v: 2, current: "p1", order: ["p1"], profiles: { p1: p }, pin };
}

function fresh() {
	return {
		v: 2,
		current: "p1",
		order: ["p1"],
		profiles: { p1: blankProfile("p1", "Reader", AVATARS[0]) },
		pin: null,
	};
}

function read() {
	if (mem) return mem;
	let saved = null;
	try {
		saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
	} catch (e) {
		/* ignore */
	}
	if (saved && saved.profiles) mem = fromV2(saved);
	if (!mem) {
		let old = null;
		try {
			old = JSON.parse(localStorage.getItem(LEGACY_KEY));
		} catch (e) {
			/* ignore */
		}
		mem = old && typeof old === "object" ? fromV1(old) : fresh();
		write();
	}
	return mem;
}

function write() {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(read()));
	} catch (e) {
		/* private mode etc: keep in memory */
	}
}

const cur = () => read().profiles[read().current];

// ---- profiles ----
export const profiles = () => read().order.map((id) => read().profiles[id]);
export const currentId = () => read().current;
export const currentProfile = () => cur();
export const getProfile = (id) => read().profiles[id] || null;

export function switchProfile(id) {
	const d = read();
	if (!d.profiles[id]) return false;
	d.current = id;
	write();
	return true;
}

export function addProfile(name, avatar) {
	const d = read();
	if (d.order.length >= MAX_PROFILES) return null;
	let n = d.order.length + 1;
	while (d.profiles[`p${n}`]) n += 1;
	const id = `p${n}`;
	d.profiles[id] = blankProfile(
		id,
		String(name || "Reader")
			.trim()
			.slice(0, 20) || "Reader",
		avatar || AVATARS[d.order.length % AVATARS.length],
	);
	d.order.push(id);
	write();
	return id;
}

export function updateProfile(id, patch) {
	const p = read().profiles[id];
	if (!p) return;
	if (patch.name !== undefined)
		p.name = String(patch.name).trim().slice(0, 20) || p.name;
	if (patch.avatar) p.avatar = patch.avatar;
	write();
}

// Never removes the last profile. Returns true if one was removed.
export function removeProfile(id) {
	const d = read();
	if (d.order.length < 2 || !d.profiles[id]) return false;
	delete d.profiles[id];
	d.order = d.order.filter((x) => x !== id);
	if (d.current === id) d.current = d.order[0];
	write();
	return true;
}

// ---- data of the current reader ----
export function getRewards() {
	return cur().rewards;
}
export function saveRewards() {
	write();
}

export function getStats() {
	return cur().stats;
}
export function saveStats() {
	write();
}
export function clearStats(id) {
	const p = read().profiles[id];
	if (p) {
		p.stats = blankStats();
		write();
	}
}

export function getSettings() {
	return cur().settings;
}
export function setSetting(key, value) {
	cur().settings[key] = value;
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
	const p = cur();
	if (!p.books[id]) p.books[id] = blankBook();
	return p.books[id];
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
	return cur().lastCast;
}
export function setLastCast(cast) {
	cur().lastCast = cast;
	write();
}

// ---- grown-ups PIN (shared by every reader on this device) ----
export function getPinHash() {
	return read().pin;
}
export function setPinHash(hash) {
	read().pin = hash;
	write();
}

// ---- backup ----
export function exportAll() {
	const d = read();
	return JSON.parse(
		JSON.stringify({
			app: "my-library",
			v: 2,
			exported: Date.now(),
			current: d.current,
			order: d.order,
			profiles: d.profiles,
		}),
	);
}

// Replaces every profile with the backup. The PIN on this device is kept.
export function importAll(obj) {
	if (
		!obj ||
		obj.app !== "my-library" ||
		!obj.profiles ||
		typeof obj.profiles !== "object"
	)
		return false;
	const next = fromV2({ ...obj, pin: read().pin });
	if (!next) return false;
	mem = next;
	write();
	return true;
}

// Wipes every profile and the PIN. Keeps only the look-and-feel settings of the current reader.
export function resetAll() {
	const settings = cur().settings;
	mem = fresh();
	mem.profiles.p1.settings = { ...DEFAULT_SETTINGS, ...settings };
	write();
	try {
		localStorage.removeItem(LEGACY_KEY);
	} catch (e) {
		/* ignore */
	}
}
