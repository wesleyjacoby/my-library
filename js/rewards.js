// Stars, reading days, prizes, postcards and the grown-ups PIN. Everything is stored on this device.
import * as store from "./store.js";

const R = () => store.getRewards();
const save = () => store.saveRewards();

export const total = () => Object.values(R().earned).reduce((a, b) => a + b, 0);

// Each reward has a unique key, so replaying a chapter or ending never pays out twice.
export function award(key, stars, label) {
	const r = R();
	if (r.earned[key] !== undefined) return null;
	r.earned[key] = stars;
	r.log.push({ t: Date.now(), label, stars });
	if (r.log.length > 200) r.log.shift();
	save();
	return { label, stars };
}

const dayKey = (d = new Date()) =>
	`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function noteReadingDay() {
	const r = R();
	const k = dayKey();
	if (!r.days.includes(k)) {
		r.days.push(k);
		if (r.days.length > 400) r.days.shift();
		save();
	}
}

// Monday to Sunday of this week
export function weekDays() {
	const now = new Date();
	const dow = (now.getDay() + 6) % 7;
	return Array.from({ length: 7 }, (_, i) => {
		const d = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate() - dow + i,
		);
		return {
			label: "MTWTFSS"[i],
			read: R().days.includes(dayKey(d)),
			today: i === dow,
			future: i > dow,
		};
	});
}

// ---- prizes ----
export const prizes = () => [...R().prizes].sort((a, b) => a.stars - b.stars);
export const pending = () =>
	prizes().filter((p) => !p.given && p.stars <= total());
export const nextPrize = () =>
	prizes().find((p) => !p.given && p.stars > total()) || null;
export function addPrize(name, stars) {
	R().prizes.push({
		id: `p${Date.now()}${Math.floor(Math.random() * 1000)}`,
		name,
		stars,
		given: false,
	});
	save();
}
export function updatePrize(id, patch) {
	Object.assign(R().prizes.find((p) => p.id === id) || {}, patch);
	save();
}
export function removePrize(id) {
	const r = R();
	r.prizes = r.prizes.filter((p) => p.id !== id);
	save();
}
export function dropEmptyPrizes() {
	const r = R();
	r.prizes = r.prizes.filter((p) => p.name.trim());
	save();
}
export const bonusStar = () =>
	award(`parent:${Date.now()}`, 1, "Bonus from a grown-up");

const reachedIds = () =>
	new Set(
		prizes()
			.filter((p) => p.stars <= total())
			.map((p) => p.id),
	);
function withPrizes(fn) {
	const before = reachedIds();
	const items = fn();
	return {
		items,
		newly: prizes().filter(
			(p) => p.stars <= total() && !before.has(p.id) && !p.given,
		),
	};
}

// ---- earning ----
export function chapterDone(book, idx, right, count) {
	return withPrizes(() => {
		const items = [];
		const first = award(`ch:${book.id}:${idx}`, 1, "Chapter finished");
		if (first) {
			items.push(first);
			if (Math.random() < 1 / 6) {
				const s = award(`sur:${book.id}:${idx}`, 1, "Surprise bonus!");
				if (s) items.push(s);
			}
		}
		if (count > 0 && right === count) {
			const b = award(
				`bonus:${book.id}:${idx}`,
				1,
				"All answers right first time",
			);
			if (b) items.push(b);
		}
		return items;
	});
}

export function endingDone(book, ending, hero) {
	let postcard = null;
	const res = withPrizes(() => {
		const items = [];
		const e = award(`end:${book.id}:${ending.id}`, 2, "New ending found");
		if (e) items.push(e);
		const f = award(`fin:${book.id}`, 1, "Book finished");
		if (f) items.push(f);
		const r = R();
		if (!r.postcards.some((p) => p.book === book.id)) {
			postcard = { book: book.id, hero, date: Date.now() };
			r.postcards.push(postcard);
			save();
		}
		return items;
	});
	return { ...res, postcard };
}

export const postcards = () => R().postcards;

// Most stars the library can pay out (chapters, bonuses, book finish, endings)
export function maxStars(books) {
	return [...books]
		.filter((b) => !b.soon)
		.reduce(
			(n, b) =>
				n +
				b.chapters.length +
				b.chapters.filter((c) => (c.questions || []).length).length +
				1 +
				2 * b.endings.length,
			0,
		);
}

// ---- grown-ups PIN (one PIN for the whole device, kept in the store) ----
async function hash(pin) {
	const data = new TextEncoder().encode(`mylib|${pin}`);
	if (globalThis.crypto && crypto.subtle) {
		const buf = await crypto.subtle.digest("SHA-256", data);
		return [...new Uint8Array(buf)]
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");
	}
	return `p:${pin}`;
}
export const hasPin = () => !!store.getPinHash();
export async function setPin(pin) {
	store.setPinHash(await hash(pin));
}
export async function checkPin(pin) {
	return store.getPinHash() === (await hash(pin));
}
