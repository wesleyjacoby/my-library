// Reading screen and ending screen.
import { h } from "./dom.js";
import * as store from "./store.js";
import { compile, plain, evalCond, computeScores } from "./personalise.js";
import { sceneHTML } from "./scenes.js";
import { toFragment } from "./syllables.js";
import * as tts from "./tts.js";
import { sentencify, initFocus } from "./coach.js";
import { quizCard } from "./quiz.js";
import { bumpSize, openSettings, applySettings } from "./settings.js";

const st = (book) => store.getBook(book.id);
const state = (book) => ({
	picks: st(book).picks,
	scores: computeScores(book, st(book).picks),
});
const frag = (book, str) =>
	toFragment(compile(str, st(book).cast), book.syllables || {});
const para = (book, str) => {
	const p = h("p", { class: "para" }, frag(book, str));
	sentencify(p);
	return p;
};
const scene = (def) => h("div", { class: "scene-wrap", html: sceneHTML(def) });

// Runs a list of blocks into `host`. Stops at an unanswered choice and carries on after the answer.
function run(book, blocks, host, done) {
	let i = 0;
	const step = () => {
		while (i < blocks.length) {
			const b = blocks[i++];
			if (typeof b === "string") {
				host.append(para(book, b));
				continue;
			}
			if (b.when && !evalCond(b.when, state(book))) continue;
			if (b.p !== undefined) {
				host.append(para(book, b.p));
				continue;
			}
			if (b.scene) {
				host.append(scene(b.scene));
				continue;
			}
			if (b.choice) {
				renderChoice(book, b.choice, host, step);
				return;
			}
			if (b.blocks) {
				run(book, b.blocks, host, step);
				return;
			}
		}
		if (done) done();
	};
	step();
}

function renderChoice(book, choice, host, next) {
	const cast = st(book).cast;
	const buttons = choice.options.map((opt) =>
		h(
			"button",
			{ type: "button", class: "opt", "data-id": opt.id },
			plain(opt.label, cast),
		),
	);
	const box = h(
		"section",
		{ class: "choice" },
		h("p", { class: "choice-prompt" }, frag(book, choice.prompt)),
		h("div", { class: "choice-options" }, buttons),
	);
	host.append(box);

	const apply = (opt, animate) => {
		box.classList.add("done");
		buttons.forEach((b) => {
			b.disabled = true;
			if (b.dataset.id === opt.id) b.classList.add("chosen");
		});
		const after = h("div", { class: "after" });
		host.append(after);
		const blocks =
			opt.blocks ||
			(typeof opt.text === "string" ? [opt.text] : opt.text) ||
			[];
		run(book, blocks, after, next);
		if (animate) box.scrollIntoView({ behavior: "smooth", block: "start" });
	};

	const picked = st(book).picks[choice.id];
	if (picked !== undefined) {
		const opt = choice.options.find((o) => o.id === picked);
		if (opt) {
			apply(opt, false);
			return;
		}
	}
	buttons.forEach((b, i) =>
		b.addEventListener("click", () => {
			const opt = choice.options[i];
			const picks = { ...st(book).picks, [choice.id]: opt.id };
			store.patchBook(book.id, { picks });
			apply(opt, true);
		}),
	);
}

function toolbar(book, nav, label, article) {
	let reading = false;
	const listen = h(
		"button",
		{
			type: "button",
			class: "icon-btn listen-btn",
			"aria-label": "Read this chapter aloud",
		},
		"🔊",
	);
	const stop = () => {
		reading = false;
		article.classList.remove("tts-on");
		tts.cancel();
		listen.textContent = "🔊";
		article
			.querySelectorAll(".reading")
			.forEach((e) => e.classList.remove("reading"));
	};
	listen.addEventListener("click", () => {
		if (reading) {
			stop();
			return;
		}
		const els = [...article.querySelectorAll(".para, .choice-prompt")];
		if (!els.length) return;
		reading = true;
		article.classList.add("tts-on");
		listen.textContent = "⏹";
		tts.readAll(
			els.map((e) => e.textContent),
			{
				rate: store.getSettings().rate,
				onItem: (i) => {
					article
						.querySelectorAll(".reading")
						.forEach((e) => e.classList.remove("reading"));
					els[i].classList.add("reading");
					els[i].scrollIntoView({ behavior: "smooth", block: "center" });
				},
				onDone: stop,
			},
		);
	});
	const bar = h(
		"header",
		{ class: "bar" },
		h(
			"button",
			{
				type: "button",
				class: "icon-btn",
				"aria-label": "Back to library",
				onclick: () => nav("#/"),
			},
			"←",
		),
		h("div", { class: "bar-title" }, label),
		h(
			"div",
			{ class: "bar-tools" },
			h(
				"button",
				{
					type: "button",
					class: "icon-btn",
					"aria-label": "Smaller text",
					onclick: () => bumpSize(-1),
				},
				"A−",
			),
			h(
				"button",
				{
					type: "button",
					class: "icon-btn",
					"aria-label": "Bigger text",
					onclick: () => bumpSize(1),
				},
				"A+",
			),
			h(
				"button",
				{
					type: "button",
					class: `icon-btn coach-toggle${store.getSettings().coach ? " on" : ""}`,
					"aria-label": "Reading Coach",
					"aria-pressed": String(!!store.getSettings().coach),
					title: "Reading Coach",
					onclick: (e) => {
						const on = !store.getSettings().coach;
						store.setSetting("coach", on);
						applySettings();
						e.currentTarget.classList.toggle("on", on);
						e.currentTarget.setAttribute("aria-pressed", String(on));
					},
				},
				"🎯",
			),
			tts.available ? listen : null,
			h(
				"button",
				{
					type: "button",
					class: "icon-btn",
					"aria-label": "Settings",
					onclick: openSettings,
				},
				"⚙︎",
			),
		),
	);
	return bar;
}

export function renderReader(root, book, idx, nav) {
	const last = book.chapters.length - 1;
	idx = Math.max(0, Math.min(last, idx));
	const chapter = book.chapters[idx];
	store.patchBook(book.id, { chapter: idx, started: true });

	const article = h("article", { class: "story" });
	if (chapter.scene) article.append(scene(chapter.scene));
	article.append(
		h(
			"div",
			{ class: "chap-head" },
			h("div", { class: "chap-num" }, `Chapter ${idx + 1}`),
			h("h2", {}, chapter.title),
		),
	);

	const page = h("main", { class: "page" }, article);
	const readerEl = h(
		"div",
		{ class: "reader" },
		toolbar(book, nav, book.title, article),
		page,
	);
	root.replaceChildren(readerEl);
	initFocus(article, readerEl);
	document.title = `${chapter.title} · ${book.title}`;

	run(book, chapter.blocks, article, () => {
		const end = h("nav", { class: "chapter-end" });
		if (idx < last) {
			end.append(
				h("p", { class: "tbc" }, "To be continued…"),
				h(
					"button",
					{
						type: "button",
						class: "btn primary big",
						onclick: () => nav(`#/b/${book.id}/read/${idx + 1}`),
					},
					"Turn the page →",
				),
			);
		} else {
			end.append(
				h("p", { class: "tbc" }, "And now…"),
				h(
					"button",
					{
						type: "button",
						class: "btn primary big",
						onclick: () => nav(`#/b/${book.id}/end`),
					},
					"Find out how it ends →",
				),
			);
		}
		if (idx > 0) {
			end.append(
				h(
					"button",
					{
						type: "button",
						class: "btn ghost",
						onclick: () => nav(`#/b/${book.id}/read/${idx - 1}`),
					},
					"← Previous chapter",
				),
			);
		}
		const qs = chapter.questions || [];
		const doneAlready = (st(book).quiz || {})[idx] !== undefined;
		if (qs.length && !doneAlready) {
			end.hidden = true;
			article.append(
				quizCard(book, chapter, article, (n) => {
					store.patchBook(book.id, {
						quiz: { ...(st(book).quiz || {}), [idx]: n },
					});
					end.hidden = false;
				}),
				end,
			);
		} else {
			article.append(end);
		}
	});
}

export function renderEnding(root, book, nav) {
	const s = state(book);
	const ending =
		book.endings.find((e) => evalCond(e.when, s)) ||
		book.endings[book.endings.length - 1];
	const b = st(book);
	const found = b.endings.includes(ending.id)
		? b.endings
		: [...b.endings, ending.id];
	store.patchBook(book.id, { endings: found, finished: true });

	const article = h("article", { class: "story ending" });
	if (ending.scene) article.append(scene(ending.scene));
	article.append(
		h(
			"div",
			{ class: "chap-head" },
			h("div", { class: "chap-num" }, "The End"),
			h("h2", {}, ending.title),
		),
	);

	const total = book.endings.length;
	const page = h("main", { class: "page" }, article);
	const readerEl = h(
		"div",
		{ class: "reader" },
		toolbar(book, nav, book.title, article),
		page,
	);
	root.replaceChildren(readerEl);
	initFocus(article, readerEl);
	document.title = `${ending.title} · ${book.title}`;

	run(book, ending.blocks, article, () => {
		const list = h(
			"ul",
			{ class: "endings-found" },
			book.endings.map((e) =>
				h(
					"li",
					{ class: found.includes(e.id) ? "got" : "lock" },
					found.includes(e.id) ? `★ ${e.title}` : "☆ A secret ending…",
				),
			),
		);
		article.append(
			h(
				"section",
				{ class: "ending-card" },
				h(
					"p",
					{ class: "big-note" },
					`You found ${found.length} of ${total} ending${total === 1 ? "" : "s"}.`,
				),
				list,
				total > found.length
					? h(
							"p",
							{},
							"Every choice changes how the story ends. Want to try a different path?",
						)
					: h("p", {}, "You found every ending. Brilliant reading!"),
				h(
					"button",
					{
						type: "button",
						class: "btn primary big",
						onclick: () => {
							store.restartBook(book.id);
							nav(`#/b/${book.id}/read/0`);
						},
					},
					"Read it again, choose differently",
				),
				h(
					"button",
					{ type: "button", class: "btn ghost", onclick: () => nav("#/") },
					"Back to the library",
				),
			),
		);
	});
}
