// "Quick check" after each chapter: a few multiple-choice questions to check she understood what she read.
// Wrong answers never lock her out: she can look back at the passage and try again.
import { h } from "./dom.js";
import * as store from "./store.js";
import { compile, plain } from "./personalise.js";
import { toFragment } from "./syllables.js";

function lookBack(article, find, card) {
	const els = [...article.querySelectorAll(".sn")].filter(
		(e) => !card.contains(e),
	);
	const hit =
		els.find((e) => e.textContent.includes(find)) ||
		[...article.querySelectorAll(".para")].find((e) =>
			e.textContent.includes(find),
		);
	if (!hit) return;
	article
		.querySelectorAll(".lookback")
		.forEach((e) => e.classList.remove("lookback"));
	hit.classList.add("lookback");
	hit.scrollIntoView({ behavior: "smooth", block: "center" });
	const bar = h(
		"button",
		{
			type: "button",
			class: "lookback-bar",
			onclick: () => {
				bar.remove();
				hit.classList.remove("lookback");
				card.scrollIntoView({ behavior: "smooth", block: "center" });
			},
		},
		"↓ Back to the question",
	);
	document.querySelector(".lookback-bar")?.remove();
	document.body.append(bar);
	const stop = () => {
		if (!article.isConnected) bar.remove();
	};
	setTimeout(stop, 60000);
}

// Returns a card. `onDone(firstTryCount)` is called once every question is answered correctly.
export function quizCard(book, chapter, article, onDone) {
	const cast = store.getBook(book.id).cast;
	const qs = chapter.questions;
	const card = h("section", { class: "quiz" });
	let qi = 0;
	let firstTry = 0;

	const show = () => {
		const q = qs[qi];
		let wrong = 0;
		const msg = h("p", { class: "quiz-msg", "aria-live": "polite" });
		const nextBtn = h(
			"button",
			{ type: "button", class: "btn primary", hidden: true },
			qi + 1 < qs.length ? "Next question ▸" : "All done ★",
		);
		const buttons = q.options.map((o, i) =>
			h(
				"button",
				{ type: "button", class: "opt", "data-i": String(i) },
				plain(o, cast),
			),
		);
		buttons.forEach((b, i) =>
			b.addEventListener("click", () => {
				if (i === q.answer) {
					b.classList.add("right");
					buttons.forEach((x) => {
						x.disabled = true;
					});
					if (wrong === 0) firstTry += 1;
					msg.textContent =
						wrong === 0
							? "Yes! Spot on."
							: "Yes, that is it. Well done for looking back.";
					nextBtn.hidden = false;
					document.querySelector(".lookback-bar")?.remove();
					article
						.querySelectorAll(".lookback")
						.forEach((e) => e.classList.remove("lookback"));
					nextBtn.focus({ preventScroll: true });
				} else {
					wrong += 1;
					b.classList.add("wrong");
					b.disabled = true;
					msg.replaceChildren(
						`Not quite. ${plain(q.hint || "Have another look.", cast)} `,
						h(
							"button",
							{
								type: "button",
								class: "btn small",
								onclick: () => lookBack(article, q.find, card),
							},
							"👀 Look back",
						),
					);
				}
			}),
		);
		nextBtn.addEventListener("click", () => {
			if (qi + 1 < qs.length) {
				qi += 1;
				show();
			} else {
				card.classList.add("finished");
				onDone(firstTry);
				showDone();
			}
		});
		card.replaceChildren(
			h(
				"div",
				{ class: "quiz-head" },
				h("span", { class: "quiz-tag" }, "Quick check"),
				h("span", { class: "quiz-count" }, `${qi + 1} of ${qs.length}`),
			),
			h(
				"p",
				{ class: "quiz-q" },
				toFragment(compile(q.q, cast), book.syllables || {}),
			),
			h("div", { class: "choice-options" }, buttons),
			msg,
			nextBtn,
		);
	};

	const showDone = () => {
		card.replaceChildren(
			h(
				"div",
				{ class: "quiz-head" },
				h("span", { class: "quiz-tag" }, "Quick check"),
			),
			h(
				"p",
				{ class: "quiz-q" },
				firstTry === qs.length
					? "All correct first time. Brilliant reading! ★"
					: "Finished. Nice work looking back at the story.",
			),
		);
	};

	show();
	return card;
}
