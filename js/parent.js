// The grown-ups report: reading time, a rough reading speed, quiz results, words to practise,
// plus a copyable summary and a backup file. Behind the grown-ups PIN. Data never leaves the device.
import { h } from "./dom.js";
import * as store from "./store.js";
import { APP_NAME, LEVELS } from "./config.js";
import { askConfirm } from "./confirm.js";
import { requirePin } from "./rewardsui.js";
import * as I from "./insights.js";
import { icon } from "./icons.js";
import { lookupAny } from "./glossary.js";

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

// On an iPad the share sheet is the reliable way to save a file (Save to Files, AirDrop, Mail). Falls back to a download.
async function saveBackup() {
	const name = `my-library-backup-${I.dayKey(new Date())}.json`;
	const text = JSON.stringify(store.exportAll(), null, 2);
	try {
		const file = new File([text], name, { type: "application/json" });
		if (navigator.canShare && navigator.canShare({ files: [file] })) {
			await navigator.share({ files: [file], title: "My Library backup" });
			return;
		}
	} catch (e) {
		if (e && e.name === "AbortError") return;
	}
	download(name, text);
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

// ---------- printable word cards ----------
// In a normal browser this builds a hidden print-only sheet and opens the print dialog. An installed iPad app
// cannot open that dialog, so there the cards are drawn as A4 page images and handed to the share sheet,
// which has Print (and AirDrop, Save to Files). Cards have dashed edges to cut out and stick on the fridge.
const isInstalled = () =>
	(window.matchMedia && matchMedia("(display-mode: standalone)").matches) ||
	navigator.standalone === true;

function wrapLines(ctx, text, maxW) {
	const out = [];
	let line = "";
	for (const w of text.split(" ")) {
		const t = line ? `${line} ${w}` : w;
		if (ctx.measureText(t).width > maxW && line) {
			out.push(line);
			line = w;
		} else line = t;
	}
	if (line) out.push(line);
	return out;
}

// Returns an array of PNG Files (A4 at 150 dpi), seven rows of two cards per page.
export async function wordSheetImages(words, prof, dict) {
	const FONT = '"Andika", system-ui, sans-serif';
	try {
		await Promise.all([
			document.fonts.load(`700 60px ${FONT}`),
			document.fonts.load(`400 30px ${FONT}`),
		]);
	} catch (e) {
		/* use whatever is loaded */
	}
	const W = 1240,
		H = 1754,
		M = 90,
		GAP = 36,
		CARD_H = 200,
		FOOT = 70;
	const colW = (W - 2 * M - GAP) / 2;
	const date = new Date().toLocaleDateString("en-GB", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});
	const pages = [];
	const newPage = (first) => {
		const c = document.createElement("canvas");
		c.width = W;
		c.height = H;
		const ctx = c.getContext("2d");
		ctx.fillStyle = "#fff";
		ctx.fillRect(0, 0, W, H);
		ctx.fillStyle = "#777";
		ctx.font = `400 22px ${FONT}`;
		ctx.textAlign = "center";
		ctx.textBaseline = "alphabetic";
		ctx.fillText(APP_NAME, W / 2, H - M / 2);
		let y = M;
		if (first) {
			ctx.textAlign = "left";
			ctx.fillStyle = "#000";
			ctx.font = `700 64px ${FONT}`;
			ctx.fillText("Words to practise", M, y + 56);
			ctx.fillStyle = "#444";
			ctx.font = `400 28px ${FONT}`;
			ctx.fillText(`${prof.name} · ${date}`, M, y + 104);
			ctx.fillStyle = "#000";
			ctx.font = `400 26px ${FONT}`;
			const lines = wrapLines(
				ctx,
				"Say the word, tap out the parts, then use it in a sentence. Tick the boxes when it feels easy.",
				W - 2 * M,
			);
			lines.forEach((l, i) => ctx.fillText(l, M, y + 154 + i * 36));
			y += 154 + lines.length * 36 + 30;
		}
		pages.push({ c, ctx });
		return { ctx, y };
	};
	let cur = newPage(true),
		col = 0,
		y = cur.y;
	for (const w of words) {
		if (col === 0 && y + CARD_H > H - M - FOOT) {
			cur = newPage(false);
			y = cur.y;
		}
		const ctx = cur.ctx,
			x = M + col * (colW + GAP);
		ctx.save();
		ctx.strokeStyle = "#666";
		ctx.lineWidth = 3;
		ctx.setLineDash([14, 10]);
		ctx.beginPath();
		if (ctx.roundRect) ctx.roundRect(x, y, colW, CARD_H, 22);
		else ctx.rect(x, y, colW, CARD_H);
		ctx.stroke();
		ctx.restore();
		ctx.textAlign = "center";
		ctx.fillStyle = "#000";
		let size = 72;
		ctx.font = `700 ${size}px ${FONT}`;
		while (ctx.measureText(w).width > colW - 50 && size > 30) {
			size -= 4;
			ctx.font = `700 ${size}px ${FONT}`;
		}
		ctx.fillText(w, x + colW / 2, y + 86);
		const hy =
			dict[w] && dict[w].includes("-") ? dict[w].split("-").join(" · ") : "";
		if (hy) {
			ctx.fillStyle = "#444";
			ctx.font = `400 32px ${FONT}`;
			ctx.fillText(hy, x + colW / 2, y + 134);
		}
		ctx.fillStyle = "#555";
		ctx.font = `400 22px ${FONT}`;
		ctx.fillText("☐ I can read it   ☐ I can use it", x + colW / 2, y + 178);
		col = (col + 1) % 2;
		if (col === 0) y += CARD_H + GAP;
	}
	const day = I.dayKey(new Date()),
		who =
			(prof.name || "reader")
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/^-|-$/g, "") || "reader";
	return Promise.all(
		pages.map(
			({ c }, i) =>
				new Promise((res, rej) =>
					c.toBlob(
						(b) =>
							b
								? res(
										new File(
											[b],
											`word-cards-${who}-${day}${pages.length > 1 ? `-${i + 1}` : ""}.png`,
											{ type: "image/png" },
										),
									)
								: rej(new Error("image")),
						"image/png",
					),
				),
		),
	);
}

async function printWords(words, prof, books) {
	const dict = {};
	for (const b of books.values()) Object.assign(dict, b.syllables || {});
	if (isInstalled() && navigator.canShare) {
		try {
			const files = await wordSheetImages(words, prof, dict);
			if (navigator.canShare({ files })) {
				await navigator.share({ files, title: "Words to practise" });
				return;
			}
		} catch (e) {
			if (e && e.name === "AbortError") return;
		}
	}
	document.getElementById("print-sheet")?.remove();
	const cards = words.map((w) => {
		const hy =
			dict[w] && dict[w].includes("-") ? dict[w].split("-").join(" · ") : "";
		return h(
			"div",
			{ class: "ps-card" },
			h("div", { class: "ps-word" }, w),
			hy ? h("div", { class: "ps-syl" }, hy) : null,
			h("div", { class: "ps-tick" }, "☐ I can read it   ☐ I can use it"),
		);
	});
	const sheet = h(
		"div",
		{ id: "print-sheet" },
		h("h1", {}, "Words to practise"),
		h(
			"p",
			{ class: "ps-sub" },
			`${prof.name} · ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`,
		),
		h(
			"p",
			{ class: "ps-tip" },
			"Say the word, tap out the parts, then use it in a sentence. Tick the boxes when it feels easy.",
		),
		h("div", { class: "ps-grid" }, cards),
		h("p", { class: "ps-foot" }, APP_NAME),
	);
	document.body.append(sheet);
	window.print();
}

// ---------- the page ----------

export async function showParent(root, nav, books) {
	if (!(await requirePin({ create: true }))) {
		nav("#/");
		return;
	}
	document.title = `Reading report · ${APP_NAME}`;
	let viewId = store.currentId();
	const off = new Set(); // practice words left off the printed list

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
										off.clear();
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

		const words = I.practiceWords(s, 16);
		const printBtn = h("button", { type: "button", class: "btn small" });
		const chosen = () => words.map((w) => w.word).filter((w) => !off.has(w));
		const syncPrint = () => {
			const n = chosen().length;
			printBtn.textContent = `🖨 Print word cards (${n})`;
			printBtn.disabled = !n;
		};
		printBtn.addEventListener("click", () => printWords(chosen(), prof, books));
		syncPrint();
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
								h(
									"button",
									{
										type: "button",
										class: `pv-word${off.has(w.word) ? " off" : ""}`,
										"aria-pressed": String(!off.has(w.word)),
										title: "Tap to leave this word off the printed list",
										onclick: (e) => {
											const on = off.has(w.word);
											if (on) off.delete(w.word);
											else off.add(w.word);
											e.currentTarget.classList.toggle("off", !on);
											e.currentTarget.setAttribute("aria-pressed", String(on));
											syncPrint();
										},
									},
									h("strong", {}, w.word),
									h(
										"small",
										{},
										`${w.n} tap${w.n === 1 ? "" : "s"}${w.said ? ` · heard ${w.said}×` : ""}`,
									),
								),
							),
						),
					)
				: h(
						"p",
						{ class: "fine" },
						"Words she taps for help will collect here.",
					),
			words.length ? h("div", { class: "pv-actions" }, printBtn) : null,
			h(
				"p",
				{ class: "fine" },
				"The words tapped most, with hearing a word counted extra. Tap a word to leave it off the printed cards, which are made to cut out and stick on the fridge.",
			),
		);

		const looked = I.meaningWords(s, 10)
			.map((m) => ({ ...m, e: lookupAny(books, m.word) }))
			.filter((m) => m.e);
		const meaningsCard = card(
			"Meanings she looked up",
			looked.length
				? h(
						"ul",
						{ class: "pv-meanings" },
						looked.map((m) =>
							h(
								"li",
								{},
								h("strong", {}, m.word),
								h("span", {}, m.e.mean),
								h("small", {}, `opened ${m.d}×`),
							),
						),
					)
				: h(
						"p",
						{ class: "fine" },
						"Words from the stories that she taps to find out what they mean will collect here.",
					),
			h(
				"p",
				{ class: "fine" },
				"Underlined words in a story have a short meaning and sometimes a picture. These are the ones she opened most.",
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
					{ type: "button", class: "btn small", onclick: saveBackup },
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
							icon("back"),
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
					meaningsCard,
					trickyCard,
					share,
				),
			),
		);
		window.scrollTo(0, 0);
		document.getElementById("app")?.scrollTo(0, 0);
	};

	render();
}
