// The grown-ups report: reading time, a rough reading speed, quiz results, words to practise,
// plus a copyable summary and a backup file. Behind the grown-ups PIN. Data never leaves the device.
import { h } from "./dom.js";
import * as store from "./store.js";
import { APP_NAME, LEVELS } from "./config.js";
import { askConfirm } from "./confirm.js";
import { requirePin } from "./rewardsui.js";
import * as I from "./insights.js";

const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
const WEEK_LETTERS = "SMTWTFS";

// ---------- charts (hand-built SVG, colours come from the stylesheet) ----------

function lineChart(points, med) {
	const W = 320;
	const H = 150;
	const L = 36;
	const R = 58;
	const T = 12;
	const B = 24;
	const vals = points.map((p) => p.wpm);
	const lo = Math.max(0, Math.floor((Math.min(...vals, med) - 10) / 10) * 10);
	let hi = Math.ceil((Math.max(...vals, med) + 10) / 10) * 10;
	if (hi - lo < 30) hi = lo + 30;
	const x = (i) =>
		points.length === 1
			? (L + W - R) / 2
			: L + (i * (W - L - R)) / (points.length - 1);
	const y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
	const path = points
		.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.wpm).toFixed(1)}`)
		.join(" ");
	const dots = points
		.map(
			(p, i) =>
				`<circle class="ch-dot" cx="${x(i).toFixed(1)}" cy="${y(p.wpm).toFixed(1)}" r="3.6"><title>${Math.round(p.wpm)} words per minute</title></circle>`,
		)
		.join("");
	return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Reading speed over the last ${points.length} chapters, around ${Math.round(med)} words per minute" class="chart">
    <line class="ch-grid" x1="${L}" x2="${W - R}" y1="${y(lo)}" y2="${y(lo)}"/><line class="ch-grid" x1="${L}" x2="${W - R}" y1="${y(hi)}" y2="${y(hi)}"/>
    <text class="ch-txt" x="${L - 6}" y="${y(lo) + 4}" text-anchor="end">${lo}</text><text class="ch-txt" x="${L - 6}" y="${y(hi) + 4}" text-anchor="end">${hi}</text>
    <line class="ch-med" x1="${L}" x2="${W - R}" y1="${y(med)}" y2="${y(med)}"/>
    <text class="ch-txt" x="${W - R + 6}" y="${y(med) + 4}">typical ${Math.round(med)}</text>
    ${points.length > 1 ? `<path class="ch-line" d="${path}"/>` : ""}${dots}
    <text class="ch-txt" x="${L}" y="${H - 6}">older</text><text class="ch-txt" x="${W - R}" y="${H - 6}" text-anchor="end">latest</text></svg>`;
}

function barChart(days) {
	const W = 320;
	const H = 130;
	const L = 8;
	const R = 8;
	const T = 18;
	const B = 20;
	const max = Math.max(10, ...days.map((d) => d.min));
	const bw = (W - L - R) / days.length;
	const bars = days
		.map((d, i) => {
			const hgt = Math.max(d.min > 0 ? 3 : 0, (d.min / max) * (H - T - B));
			const bx = L + i * bw + bw * 0.18;
			const label =
				d.min >= 1
					? `<text class="ch-txt" x="${(bx + bw * 0.32).toFixed(1)}" y="${(H - B - hgt - 4).toFixed(1)}" text-anchor="middle">${Math.round(d.min)}</text>`
					: "";
			return `<rect class="ch-bar${i === days.length - 1 ? " today" : ""}" x="${bx.toFixed(1)}" y="${(H - B - hgt).toFixed(1)}" width="${(bw * 0.64).toFixed(1)}" height="${hgt.toFixed(1)}" rx="3"><title>${d.date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })}: ${Math.round(d.min)} min</title></rect>${label}
      <text class="ch-txt" x="${(bx + bw * 0.32).toFixed(1)}" y="${H - 6}" text-anchor="middle">${WEEK_LETTERS[d.date.getDay()]}</text>`;
		})
		.join("");
	return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Minutes read per day over the last ${days.length} days" class="chart"><line class="ch-grid" x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}"/>${bars}</svg>`;
}

// ---------- the report text for a tutor ----------

function summaryText(prof, books) {
	const s = prof.stats;
	const week = new Date();
	week.setDate(week.getDate() - ((week.getDay() + 6) % 7));
	week.setHours(0, 0, 0, 0);
	const sum = I.wpmSummary(I.wpmPoints(s));
	const lines = [
		`${APP_NAME} reading report: ${prof.name}`,
		new Date().toLocaleDateString("en-GB", {
			day: "numeric",
			month: "long",
			year: "numeric",
		}),
		"",
		`This week: ${I.fmtMinutes(I.totalMinutes(s, week.getTime()))}, read on ${I.daysThisWeek(prof.rewards.days)} of 7 days. Current streak ${plural(I.streak(prof.rewards.days), "day")}.`,
		sum.now
			? `Reading speed (estimate): about ${sum.now} words per minute, from the last ${Math.min(5, sum.count)} chapters read silently.`
			: "Reading speed: not enough chapters read yet.",
	];
	const q = I.quizAccuracy(s);
	if (q)
		lines.push(
			`Quick checks: ${q.pct}% of ${q.asked} questions answered right first time.`,
		);
	lines.push("");
	for (const book of books.values()) {
		const b = I.bookSummary(prof, book);
		if (!b.started) continue;
		lines.push(
			`${book.title}${book.level ? ` (level ${book.level})` : ""}: ${b.chaptersRead} of ${b.chapters} chapters, ${b.endings} of ${b.endingsTotal} endings${b.wpm ? `, about ${b.wpm} wpm` : ""}${b.quiz ? `, ${b.quiz.pct}% right first time` : ""}.`,
		);
	}
	const words = I.practiceWords(s, 15);
	if (words.length)
		lines.push("", `Words to practise: ${words.map((w) => w.word).join(", ")}`);
	return lines.join("\n");
}

async function copyText(text) {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch (e) {
		/* fall through */
	}
	const ta = h("textarea", { style: "position:fixed;opacity:0" }, text);
	document.body.append(ta);
	ta.select();
	let ok = false;
	try {
		ok = document.execCommand("copy");
	} catch (e) {
		/* ignore */
	}
	ta.remove();
	return ok;
}

function download(name, text) {
	const url = URL.createObjectURL(
		new Blob([text], { type: "application/json" }),
	);
	const a = h("a", { href: url, download: name });
	document.body.append(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ---------- the page ----------

export async function showParent(root, nav, books) {
	if (!(await requirePin({ create: true }))) {
		nav("#/");
		return;
	}
	document.title = `Reading report · ${APP_NAME}`;
	let viewId = store.currentId();

	const card = (title, ...kids) =>
		h("section", { class: "rw-card pv-card" }, h("h2", {}, title), ...kids);
	const tile = (label, value, sub) =>
		h(
			"div",
			{ class: "pv-tile" },
			h("span", { class: "pv-label" }, label),
			h("strong", {}, value),
			sub ? h("small", {}, sub) : null,
		);

	const render = () => {
		const prof = store.getProfile(viewId) || store.currentProfile();
		const s = prof.stats;
		const week = new Date();
		week.setDate(week.getDate() - ((week.getDay() + 6) % 7));
		week.setHours(0, 0, 0, 0);
		const pts = I.wpmPoints(s);
		const sum = I.wpmSummary(pts);
		const q = I.quizAccuracy(s);
		const days = prof.rewards.days;
		const streak = I.streak(days);

		const tabs =
			store.profiles().length > 1
				? h(
						"div",
						{
							class: "seg pv-tabs",
							role: "radiogroup",
							"aria-label": "Reader",
						},
						store.profiles().map((p) =>
							h(
								"button",
								{
									type: "button",
									role: "radio",
									class: p.id === prof.id ? "on" : "",
									"aria-checked": String(p.id === prof.id),
									onclick: () => {
										viewId = p.id;
										render();
									},
								},
								`${p.avatar} ${p.name}`,
							),
						),
					)
				: null;

		const trendTxt =
			sum.trend === 1
				? "Going up ↗"
				: sum.trend === -1
					? "A little slower ↘"
					: sum.trend === 0
						? "Steady →"
						: "";
		const tiles = h(
			"div",
			{ class: "pv-tiles" },
			tile(
				"Read this week",
				I.fmtMinutes(I.totalMinutes(s, week.getTime())),
				`${I.daysThisWeek(days)} of 7 days`,
			),
			tile(
				"Reading streak",
				plural(streak, "day"),
				streak ? "in a row" : "Read today to start one",
			),
			tile(
				"Speed (estimate)",
				sum.now ? `~${sum.now} wpm` : "–",
				sum.now
					? trendTxt || `from ${plural(Math.min(5, sum.count), "chapter")}`
					: "Needs a few chapters",
			),
			tile(
				"Quick checks",
				q ? `${q.pct}%` : "–",
				q ? `right first time (${q.asked} questions)` : "No answers yet",
			),
		);

		const speed = card(
			"Reading speed",
			pts.length
				? h("div", {
						class: "chart-wrap",
						html: lineChart(
							pts.slice(-20),
							I.median(pts.slice(-20).map((p) => p.wpm)),
						),
					})
				: h(
						"p",
						{ class: "fine" },
						"Read a few chapters silently and a trend will appear here.",
					),
			h(
				"p",
				{ class: "fine" },
				"This is an estimate: the words in each chapter divided by the time actually spent reading. Time spent choosing, resting or away is left out, and so are chapters heard read-aloud, read again, or flicked through. Look at the trend over weeks rather than any single number, and treat it as a guide, not a test.",
			),
		);

		const perDay = card(
			"Time per day",
			h("div", { class: "chart-wrap", html: barChart(I.dailyMinutes(s, 14)) }),
			h(
				"p",
				{ class: "fine" },
				"Minutes spent actively reading over the last 14 days.",
			),
		);

		const bookRows = [...books.values()]
			.filter((b) => !b.soon)
			.map((book) => {
				const b = I.bookSummary(prof, book);
				if (!b.started) return null;
				const pct = Math.round((b.chaptersRead / b.chapters) * 100);
				const lv = book.level && LEVELS[book.level];
				return h(
					"div",
					{ class: "pv-book" },
					h(
						"div",
						{ class: "pv-book-head" },
						h("strong", {}, book.title),
						lv ? h("span", { class: "lvl" }, `Level ${book.level}`) : null,
					),
					h(
						"div",
						{ class: "rs-bar pv-bar" },
						h("i", { style: `width:${pct}%` }),
					),
					h(
						"p",
						{ class: "pv-book-meta" },
						`${b.chaptersRead} of ${b.chapters} chapters`,
						` · ${b.endings} of ${b.endingsTotal} endings`,
						b.quiz ? ` · ${b.quiz.pct}% right first time` : "",
						b.wpm ? ` · ~${b.wpm} wpm` : "",
						` · ${I.fmtMinutes(b.minutes)}`,
					),
				);
			})
			.filter(Boolean);
		const booksCard = card(
			"Books",
			bookRows.length
				? bookRows
				: h(
						"p",
						{ class: "fine" },
						`${prof.name} has not started a story yet.`,
					),
		);

		const words = I.practiceWords(s, 14);
		const wordsCard = card(
			"Words to practise",
			words.length
				? h(
						"ul",
						{ class: "pv-words" },
						words.map((w) =>
							h(
								"li",
								{},
								h("strong", {}, w.word),
								h(
									"small",
									{},
									`${w.n} tap${w.n === 1 ? "" : "s"}${w.said ? ` · heard ${w.said}×` : ""}`,
								),
							),
						),
					)
				: h(
						"p",
						{ class: "fine" },
						"Words she taps for help will collect here.",
					),
			h(
				"p",
				{ class: "fine" },
				"The words tapped most, with hearing a word counted extra. Good ones to say together or put on a card.",
			),
		);

		const tricky = I.trickyQuestions(s, 5)
			.map((t) => {
				const book = books.get(t.b);
				const qn =
					book &&
					book.chapters[t.c] &&
					(book.chapters[t.c].questions || []).find((x) => x.id === t.q);
				if (!qn) return null;
				const cast = (prof.books[t.b] && prof.books[t.b].cast) || {};
				const text = qn.q
					.replace(/\{(\w+)\}/g, (m, k) => (cast[k] && cast[k].name) || m)
					.replace(/\{[^}]*\}/g, "")
					.replace(/\[\[[^\]]*\]\]/g, "the pet");
				return h(
					"li",
					{},
					h("span", {}, text),
					h(
						"small",
						{},
						`${book.title}, chapter ${t.c + 1} · ${plural(t.wrong, "wrong try")}`,
					),
				);
			})
			.filter(Boolean);
		const trickyCard = tricky.length
			? card(
					"Questions that took several tries",
					h("ul", { class: "pv-tricky" }, tricky),
					h(
						"p",
						{ class: "fine" },
						"A good chance to talk about what happened in that part of the story.",
					),
				)
			: null;

		const copyBtn = h(
			"button",
			{
				type: "button",
				class: "btn small",
				onclick: async (e) => {
					const ok = await copyText(summaryText(prof, books));
					e.target.textContent = ok ? "✓ Copied" : "Could not copy";
					setTimeout(() => {
						e.target.textContent = "Copy summary for a tutor";
					}, 2200);
				},
			},
			"Copy summary for a tutor",
		);
		const file = h("input", {
			type: "file",
			accept: "application/json,.json",
			hidden: true,
			onchange: async (e) => {
				const f = e.target.files[0];
				e.target.value = "";
				if (!f) return;
				let obj = null;
				try {
					obj = JSON.parse(await f.text());
				} catch (err) {
					/* handled below */
				}
				if (!obj || obj.app !== "my-library") {
					await askConfirm({
						icon: "⚠️",
						title: "That is not a backup",
						message: "Choose a file saved with “Save backup”.",
						yes: "OK",
						single: true,
					});
					return;
				}
				const n = Object.keys(obj.profiles || {}).length;
				const yes = await askConfirm({
					icon: "♻️",
					title: "Restore this backup?",
					message: `This replaces everything on this device with ${plural(n, "reader")} from the file. The grown-ups PIN stays the same.`,
					yes: "Restore",
					no: "Cancel",
					danger: true,
				});
				if (yes && store.importAll(obj)) {
					location.hash = "#/";
					location.reload();
				}
			},
		});
		const share = card(
			"Share and backup",
			h(
				"div",
				{ class: "pv-actions" },
				copyBtn,
				h(
					"button",
					{
						type: "button",
						class: "btn small",
						onclick: () =>
							download(
								`my-library-backup-${I.dayKey(new Date())}.json`,
								JSON.stringify(store.exportAll(), null, 2),
							),
					},
					"Save backup",
				),
				h(
					"button",
					{ type: "button", class: "btn small", onclick: () => file.click() },
					"Restore backup",
				),
				file,
			),
			h(
				"p",
				{ class: "fine" },
				"Everything is stored only on this device. A backup file keeps all readers’ progress safe, and lets you move to a new iPad.",
			),
			h(
				"div",
				{ class: "pv-actions" },
				h(
					"button",
					{
						type: "button",
						class: "btn small danger",
						onclick: async () => {
							const yes = await askConfirm({
								icon: "🗑️",
								title: `Clear ${prof.name}’s reading stats?`,
								message:
									"Reading speed, time, tapped words and quiz results are erased. Stories, stars and prizes stay.",
								yes: "Clear stats",
								no: "Keep",
								danger: true,
							});
							if (yes) {
								store.clearStats(prof.id);
								render();
							}
						},
					},
					"Clear reading stats",
				),
			),
		);

		root.replaceChildren(
			h(
				"main",
				{ class: "rewards-page pv-page" },
				h(
					"header",
					{ class: "pv-head" },
					h(
						"div",
						{ class: "rw-top" },
						h(
							"button",
							{
								type: "button",
								class: "rw-round",
								"aria-label": "Back to library",
								onclick: () => nav("#/"),
							},
							"←",
						),
						h("div", { class: "rw-title" }, "Reading report"),
					),
					h(
						"div",
						{ class: "pv-who" },
						h("span", { class: "pv-av", "aria-hidden": "true" }, prof.avatar),
						h("h1", {}, prof.name),
					),
					tabs,
				),
				h(
					"div",
					{ class: "rw-wrap" },
					tiles,
					speed,
					perDay,
					booksCard,
					wordsCard,
					trickyCard,
					share,
				),
			),
		);
		window.scrollTo(0, 0);
	};

	render();
}
