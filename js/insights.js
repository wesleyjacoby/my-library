// Turns a reader's stored data into the numbers shown on the grown-ups report.
// Pure functions (no page access) so they can be tested on their own.
//
// Reading speed is an ESTIMATE: words in the chapter divided by active reading time.
// Only a first, silent, finished read of a chapter counts, and implausible values are dropped.

export const MIN_WORDS = 60;
export const MIN_MS = 15000;
export const MAX_WPM = 400;

export const sessionWpm = (s) => {
	if (!s || !s.done || s.aloud || s.rep || s.w < MIN_WORDS || s.rms < MIN_MS)
		return null;
	const wpm = s.w / (s.rms / 60000);
	return wpm > MAX_WPM ? null : wpm;
};

export function median(list) {
	if (!list.length) return null;
	const a = [...list].sort((x, y) => x - y);
	const m = a.length >> 1;
	return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

// Valid reading-speed points in time order: [{t, b, c, wpm}]
export function wpmPoints(stats, book) {
	return (stats.sessions || [])
		.filter((s) => !book || s.b === book)
		.map((s) => ({ t: s.t, b: s.b, c: s.c, wpm: sessionWpm(s) }))
		.filter((p) => p.wpm !== null);
}

// Recent estimate = median of the last 5 points; trend compares them with the 5 before.
export function wpmSummary(points) {
	if (!points.length) return { now: null, trend: null, count: 0 };
	const vals = points.map((p) => p.wpm);
	const recent = vals.slice(-5);
	const before = vals.slice(-10, -5);
	const now = median(recent);
	let trend = null;
	if (before.length >= 3) {
		const prev = median(before);
		trend = Math.abs(now - prev) < 5 ? 0 : now > prev ? 1 : -1;
	}
	return { now: Math.round(now), trend, count: points.length };
}

export const dayKey = (d) =>
	`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Minutes of active reading for each of the last `n` days (oldest first).
export function dailyMinutes(stats, n = 14, now = new Date()) {
	const days = [];
	for (let i = n - 1; i >= 0; i--) {
		const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
		days.push({ key: dayKey(d), date: d, min: 0 });
	}
	const at = new Map(days.map((d) => [d.key, d]));
	for (const s of stats.sessions || []) {
		const d = at.get(dayKey(new Date(s.t)));
		if (d) d.min += s.ms / 60000;
	}
	return days;
}

export const totalMinutes = (stats, sinceMs = 0) =>
	(stats.sessions || [])
		.filter((s) => s.t >= sinceMs)
		.reduce((n, s) => n + s.ms, 0) / 60000;

// Consecutive reading days up to today (or up to yesterday if she has not read yet today).
export function streak(days, now = new Date()) {
	const have = new Set(days || []);
	let d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	if (!have.has(dayKey(d)))
		d = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
	let n = 0;
	while (have.has(dayKey(d))) {
		n += 1;
		d = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
	}
	return n;
}

export function daysThisWeek(days, now = new Date()) {
	const have = new Set(days || []);
	const dow = (now.getDay() + 6) % 7;
	let n = 0;
	for (let i = 0; i <= dow; i++)
		if (
			have.has(
				dayKey(
					new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow + i),
				),
			)
		)
			n += 1;
	return n;
}

// Quiz: share of questions answered right first time.
export function quizAccuracy(stats, book) {
	const list = (stats.quiz || []).filter((q) => !book || q.b === book);
	if (!list.length) return null;
	const first = list.filter((q) => q.w === 0).length;
	return {
		asked: list.length,
		first,
		pct: Math.round((first / list.length) * 100),
	};
}

// Words she tapped most (hearing the word counts double). Excludes single casual taps.
export function practiceWords(stats, limit = 12) {
	return Object.entries(stats.taps || {})
		.map(([word, e]) => ({ word, n: e.n, said: e.s, score: e.n + 2 * e.s }))
		.filter((w) => w.score >= 2)
		.sort((a, b) => b.score - a.score || a.word.localeCompare(b.word))
		.slice(0, limit);
}

// Questions that took more than one go, worst first: [{b, c, q, tries, count}]
export function trickyQuestions(stats, limit = 5) {
	const m = new Map();
	for (const x of stats.quiz || []) {
		if (!x.w) continue;
		const k = `${x.b}|${x.c}|${x.q}`;
		const e = m.get(k) || { b: x.b, c: x.c, q: x.q, wrong: 0, count: 0 };
		e.wrong += x.w;
		e.count += 1;
		m.set(k, e);
	}
	return [...m.values()].sort((a, b) => b.wrong - a.wrong).slice(0, limit);
}

// Per-book summary for the report.
export function bookSummary(profile, book) {
	const b = (profile.books || {})[book.id];
	const stats = profile.stats || {};
	const sessions = (stats.sessions || []).filter((s) => s.b === book.id);
	const done = new Set(sessions.filter((s) => s.done).map((s) => s.c));
	const pts = wpmPoints(stats, book.id);
	return {
		started: !!(b && (b.started || b.finished)) || sessions.length > 0,
		finished: !!(b && b.finished),
		chaptersRead: done.size,
		chapters: book.chapters.length,
		endings: b ? b.endings.length : 0,
		endingsTotal: book.endings.length,
		minutes: sessions.reduce((n, s) => n + s.ms, 0) / 60000,
		wpm: pts.length ? Math.round(median(pts.map((p) => p.wpm))) : null,
		quiz: quizAccuracy(stats, book.id),
	};
}

export const fmtMinutes = (m) => {
	const r = Math.round(m);
	if (r < 1) return m > 0 ? "under a minute" : "0 min";
	if (r < 60) return `${r} min`;
	return `${Math.floor(r / 60)} h ${String(r % 60).padStart(2, "0")} min`;
};
