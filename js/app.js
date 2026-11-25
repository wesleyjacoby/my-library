import { h } from "./dom.js";
import { APP_NAME, LEVELS } from "./config.js";
import * as store from "./store.js";
import { sceneHTML } from "./scenes.js";
import { initSyllables, closePopup } from "./syllables.js";
import { cleanName, PRONOUN_LABELS } from "./personalise.js";
import { applySettings, openSettings } from "./settings.js";
import { profileChip } from "./profiles.js";
import { showParent } from "./parent.js";
import * as track from "./stats.js";
import { icon } from "./icons.js";
import { askConfirm } from "./confirm.js";
import { renderReader, renderEnding } from "./reader.js";
import * as tts from "./tts.js";
import { strip, showRewardsPage, setLibrary } from "./rewardsui.js";

const root = document.getElementById("app");
const books = new Map();

const nav = (hash) => {
	location.hash = hash;
};

async function loadBooks() {
	const idx = await (await fetch("books/index.json")).json();
	// Words shared by every book; each book can add to or override them.
	let shared = {};
	try {
		shared = await (await fetch("data/syllables.json")).json();
	} catch (e) {
		/* books still work with their own list */
	}
	const list = await Promise.all(
		idx.books.map(async (id) => {
			const b = await (await fetch(`books/${id}/book.json`)).json();
			b.baseUrl = `books/${id}/`;
			b.syllables = { ...shared, ...(b.syllables || {}) };
			return b;
		}),
	);
	list.forEach((b) => books.set(b.id, b));
	setLibrary(books);
}

// ---------- Library ----------

function showLibrary() {
	document.title = APP_NAME;
	const cards = [...books.values()].map(card);
	root.replaceChildren(
		h(
			"main",
			{ class: "library" },
			h(
				"header",
				{ class: "lib-head" },
				h(
					"div",
					{ class: "lib-title" },
					h("span", { class: "logo", "aria-hidden": "true" }, "🌙"),
					h("h1", {}, APP_NAME),
				),
				h(
					"div",
					{ class: "lib-tools" },
					profileChip(() => {
						applySettings();
						showLibrary();
					}),
					h(
						"button",
						{
							type: "button",
							class: "icon-btn",
							"aria-label": "Grown-ups reading report",
							title: "Reading report (grown-ups)",
							onclick: () => nav("#/parent"),
						},
						icon("chart"),
					),
					h(
						"button",
						{
							type: "button",
							class: "icon-btn",
							"aria-label": "Settings",
							onclick: openSettings,
						},
						icon("gear"),
					),
				),
			),
			h(
				"p",
				{ class: "lib-intro" },
				"Pick a story. In every one of them, you are the hero.",
			),
			strip(nav),
			h("div", { class: "grid" }, cards),
		),
	);
}

function card(book) {
	const b = store.getBook(book.id);
	const n = book.chapters.length;
	let status = "A new story";
	if (b.finished)
		status = `Finished · ${b.endings.length} of ${book.endings.length} endings found`;
	else if (b.started) status = `Chapter ${b.chapter + 1} of ${n}`;

	const cover = h("div", { class: "cover" });
	if (book.cover && book.cover.image)
		cover.append(h("img", { src: book.baseUrl + book.cover.image, alt: "" }));
	else if (book.cover && book.cover.scene)
		cover.innerHTML = sceneHTML(book.cover.scene, { static: true });
	cover.append(h("div", { class: "cover-title" }, h("span", {}, book.title)));
	if (book.draft) cover.append(h("span", { class: "badge" }, "Demo"));
	if (book.soon) cover.append(h("span", { class: "badge" }, "Coming soon"));

	if (book.soon) {
		return h(
			"article",
			{ class: "book-card soon" },
			cover,
			h(
				"div",
				{ class: "card-body" },
				h("p", { class: "tagline" }, book.tagline || ""),
				h("p", { class: "meta" }, `Ages ${book.ages || ""}`),
				h("p", { class: "status" }, "Being written"),
				h(
					"div",
					{ class: "card-btns" },
					h(
						"button",
						{ type: "button", class: "btn primary", disabled: true },
						"Coming soon",
					),
				),
			),
		);
	}

	const inProgress = b.started && !b.finished;
	const primary = inProgress
		? "Continue"
		: b.finished
			? "Read again"
			: "Start reading";
	const buttons = [
		h(
			"button",
			{
				type: "button",
				class: "btn primary",
				onclick: () =>
					nav(
						inProgress
							? `#/b/${book.id}/read/${b.chapter}`
							: `#/b/${book.id}/setup`,
					),
			},
			primary,
		),
	];
	if (inProgress) {
		buttons.push(
			h(
				"button",
				{
					type: "button",
					class: "btn ghost",
					onclick: async () => {
						const yes = await askConfirm({
							icon: "🔦",
							title: "Start this story again?",
							message:
								"You will go back to Chapter 1 and choose new names. Endings you have already found stay saved.",
							yes: "Start over",
							no: "Keep reading",
							danger: true,
						});
						if (yes) nav(`#/b/${book.id}/setup`);
					},
				},
				"Start over",
			),
		);
	}

	return h(
		"article",
		{ class: "book-card" },
		cover,
		h(
			"div",
			{ class: "card-body" },
			h("p", { class: "tagline" }, book.tagline || ""),
			h(
				"p",
				{ class: "meta" },
				`Ages ${book.ages || ""}`,
				book.level
					? [
							" · ",
							h(
								"span",
								{ class: "lvl", title: (LEVELS[book.level] || {}).blurb || "" },
								`Level ${book.level}`,
							),
						]
					: null,
				` · ${n} chapters`,
			),
			h("p", { class: "status" }, status),
			h("div", { class: "card-btns" }, buttons),
		),
	);
}

// ---------- Setup (names) ----------

function showSetup(book) {
	document.title = `${book.title} · ${APP_NAME}`;
	const saved = store.getBook(book.id).cast || {};
	const last = store.getLastCast();
	const fields = [];

	const form = h("form", {
		class: "setup",
		novalidate: true,
		autocomplete: "off",
	});
	const read = {};

	for (const slot of book.cast) {
		const prev = saved[slot.key] || last[slot.key] || {};
		const input = h("input", {
			type: "text",
			name: slot.key,
			maxlength: "20",
			value: prev.name || "",
			placeholder: slot.placeholder || slot.default || "",
			autocapitalize: "words",
			autocomplete: "off",
			autocorrect: "off",
			spellcheck: "false",
			"aria-label": slot.label,
			enterkeyhint: "next",
			oninput: (e) => e.target.classList.remove("bad"),
		});
		const group = h(
			"fieldset",
			{ class: "field" },
			h("legend", {}, slot.label),
			input,
		);
		const pick = {
			pronoun:
				prev.pronoun ||
				slot.pronounDefault ||
				(slot.pronouns && slot.pronouns[0]),
			variant: prev.variant || (slot.variants && slot.variants.options[0].id),
		};

		const radios = (title, name, options, current, onPick) => {
			const wrap = h("div", {
				class: "seg",
				role: "radiogroup",
				"aria-label": title,
			});
			options.forEach(([val, label]) => {
				const btn = h(
					"button",
					{
						type: "button",
						role: "radio",
						"aria-checked": String(val === current),
						class: val === current ? "on" : "",
						onclick: () => {
							onPick(val);
							wrap.querySelectorAll("button").forEach((x) => {
								x.classList.remove("on");
								x.setAttribute("aria-checked", "false");
							});
							btn.classList.add("on");
							btn.setAttribute("aria-checked", "true");
						},
					},
					label,
				);
				wrap.append(btn);
			});
			return h(
				"div",
				{ class: "subfield" },
				h("span", { class: "sublabel" }, title),
				wrap,
			);
		};

		if (slot.pronouns) {
			group.append(
				radios(
					slot.pronounLabel || "Which fits best?",
					slot.key + "-p",
					slot.pronouns.map((p) => [p, PRONOUN_LABELS[p] || p]),
					pick.pronoun,
					(v) => {
						pick.pronoun = v;
					},
				),
			);
		}
		if (slot.variants) {
			group.append(
				radios(
					slot.variants.label,
					slot.key + "-v",
					slot.variants.options.map((o) => [o.id, o.label]),
					pick.variant,
					(v) => {
						pick.variant = v;
					},
				),
			);
		}
		read[slot.key] = () => ({
			slot,
			name: cleanName(input.value),
			pronoun: pick.pronoun || "they",
			variant: pick.variant,
			input,
		});
		fields.push(group);
	}

	form.append(
		...fields,
		h(
			"button",
			{ type: "submit", class: "btn primary big" },
			"Begin the story →",
		),
		h(
			"p",
			{ class: "fine" },
			"Names stay on this device. You can leave any box empty and a name will be chosen for you.",
		),
	);

	form.addEventListener("submit", (e) => {
		e.preventDefault();
		const vals = book.cast.map((s) => read[s.key]());
		const hero = vals.find((v) => v.slot.required);
		if (hero && !hero.name) {
			hero.input.classList.add("bad");
			hero.input.focus();
			return;
		}
		const taken = new Set(
			vals.filter((v) => v.name).map((v) => v.name.toLowerCase()),
		);
		const cast = {};
		for (const v of vals) {
			let name = v.name;
			if (!name) {
				name = v.slot.default;
				if (taken.has(name.toLowerCase()) && v.slot.altDefault)
					name = v.slot.altDefault;
				taken.add(name.toLowerCase());
			}
			cast[v.slot.key] = { name, pronoun: v.pronoun, variant: v.variant };
		}
		store.setLastCast(cast);
		store.restartBook(book.id, cast);
		nav(`#/b/${book.id}/read/0`);
	});

	root.replaceChildren(
		h(
			"main",
			{ class: "setup-page" },
			h(
				"header",
				{ class: "bar flat" },
				h(
					"button",
					{
						type: "button",
						class: "icon-btn",
						"aria-label": "Back",
						onclick: () => nav("#/"),
					},
					icon("back"),
				),
				h("div", { class: "bar-title" }, book.title),
			),
			h(
				"div",
				{ class: "setup-wrap" },
				h("h2", {}, "Who is in this story?"),
				h("p", { class: "blurb" }, book.blurb || ""),
				form,
			),
		),
	);
}

// ---------- Router ----------

function route() {
	track.end();
	tts.cancel();
	closePopup();
	window.scrollTo(0, 0);
	const seg = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
	if (seg[0] === "rewards") return showRewardsPage(root, nav, books);
	if (seg[0] === "parent") return showParent(root, nav, books);
	if (seg[0] !== "b") return showLibrary();
	const book = books.get(seg[1]);
	if (!book || book.soon) {
		if (seg[0] === "b") return location.replace("#/");
		return showLibrary();
	}
	const b = store.getBook(book.id);

	if (seg[2] === "setup") return showSetup(book);
	if (!b.cast) return location.replace(`#/b/${book.id}/setup`);
	if (seg[2] === "end") return renderEnding(root, book, nav);
	if (seg[2] === "read")
		return renderReader(root, book, parseInt(seg[3], 10) || 0, nav);
	return renderReader(root, book, b.chapter, nav);
}

async function init() {
	applySettings();
	initSyllables();
	try {
		await loadBooks();
	} catch (e) {
		root.replaceChildren(
			h(
				"main",
				{ class: "library" },
				h(
					"p",
					{ class: "err" },
					"The books could not be loaded. Check the connection and try again.",
				),
			),
		);
		return;
	}
	window.addEventListener("hashchange", route);
	route();
	if ("serviceWorker" in navigator) {
		// A new version takes over in the background. Offer a reload instead of interrupting her mid-story.
		const hadController = !!navigator.serviceWorker.controller;
		let shown = false;
		navigator.serviceWorker.addEventListener("controllerchange", () => {
			if (!hadController || shown) return;
			shown = true;
			document.body.append(
				h(
					"div",
					{ class: "update-bar", role: "status" },
					h("span", {}, "✨ A new version is ready"),
					h(
						"button",
						{
							type: "button",
							class: "update-go",
							onclick: () => location.reload(),
						},
						"Update",
					),
					h(
						"button",
						{
							type: "button",
							class: "update-later",
							"aria-label": "Later",
							onclick: (e) => e.target.closest(".update-bar").remove(),
						},
						"✕",
					),
				),
			);
		});
		const register = () =>
			navigator.serviceWorker
				.register("sw.js")
				.then((reg) => {
					// An installed iPad app is resumed, not reopened, so look for updates whenever she comes back to it.
					document.addEventListener("visibilitychange", () => {
						if (!document.hidden) reg.update().catch(() => {});
					});
				})
				.catch(() => {});
		if (document.readyState === "complete") register();
		else window.addEventListener("load", register);
	}
}

init();
