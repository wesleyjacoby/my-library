import { h } from "./dom.js";
import * as store from "./store.js";
import { APP_NAME } from "./config.js";
import { askConfirm } from "./confirm.js";
import * as tts from "./tts.js";
import { openGrownups, requirePin } from "./rewardsui.js";

export const SIZES = [0.85, 1, 1.15, 1.3, 1.5];

export function applySettings() {
	const s = store.getSettings();
	const root = document.documentElement;
	root.dataset.theme = s.theme;
	root.dataset.anim = s.anim ? "on" : "off";
	root.dataset.font = s.font === "clean" ? "clean" : "book";
	root.dataset.listen = s.readAloud === false ? "off" : "on";
	root.dataset.focus = s.coach && s.coachFocus ? "on" : "off";
	root.dataset.marks = s.coach && s.coachMarks ? "on" : "off";
	root.style.setProperty("--scale", SIZES[s.size] ?? 1);
	const meta = document.querySelector("meta[name=theme-color]");
	if (meta)
		meta.setAttribute("content", s.theme === "night" ? "#10162b" : "#1b2547");
	window.dispatchEvent(new Event("settingschange"));
}

export function bumpSize(delta) {
	const s = store.getSettings();
	const next = Math.max(0, Math.min(SIZES.length - 1, s.size + delta));
	store.setSetting("size", next);
	applySettings();
}

function voiceRow(s) {
	const voices = tts.englishVoices();
	const select = h(
		"select",
		{
			"aria-label": "Voice",
			onchange: (e) => {
				store.setSetting("voice", e.target.value);
				tts.pickVoice();
			},
		},
		[
			h("option", { value: "" }, "Automatic"),
			...voices.map((v) =>
				h(
					"option",
					{ value: v.name, selected: v.name === s.voice ? true : null },
					`${v.name} (${v.lang})`,
				),
			),
		],
	);
	const test = h(
		"button",
		{
			type: "button",
			class: "btn small",
			onclick: () =>
				tts.say("The light on Gull Rock began to blink.", {
					rate: store.getSettings().rate,
				}),
		},
		"▶ Test",
	);
	return h(
		"div",
		{ class: "srow" },
		h("span", {}, "Voice"),
		h("div", { class: "row-ctrl" }, select, test),
	);
}

export function openSettings() {
	if (document.querySelector(".sheet-back")) return;
	const s = store.getSettings();

	const close = () => {
		back.remove();
	};

	const seg = (name, options, value, onPick) =>
		h(
			"div",
			{ class: "seg", role: "radiogroup" },
			options.map(([val, label]) =>
				h(
					"button",
					{
						type: "button",
						role: "radio",
						"aria-checked": String(val === value),
						class: val === value ? "on" : "",
						onclick: (e) => {
							onPick(val);
							e.currentTarget.parentElement
								.querySelectorAll("button")
								.forEach((b) => {
									b.classList.remove("on");
									b.setAttribute("aria-checked", "false");
								});
							e.currentTarget.classList.add("on");
							e.currentTarget.setAttribute("aria-checked", "true");
						},
					},
					label,
				),
			),
		);

	const sizeBtns = h(
		"div",
		{ class: "row-ctrl" },
		h(
			"button",
			{ type: "button", class: "btn small", onclick: () => bumpSize(-1) },
			"A−",
		),
		h(
			"button",
			{ type: "button", class: "btn small", onclick: () => bumpSize(1) },
			"A+",
		),
	);

	const rate = h("input", {
		type: "range",
		min: "0.6",
		max: "1.2",
		step: "0.05",
		value: String(s.rate),
		"aria-label": "Read-aloud speed",
		oninput: (e) => store.setSetting("rate", Number(e.target.value)),
	});

	const onoff = (key) => (v) => {
		store.setSetting(key, v === "on");
		applySettings();
	};
	const coachRows = h(
		"div",
		{ class: "coach-rows", hidden: s.coach ? null : true },
		h(
			"div",
			{ class: "srow sub" },
			h("span", {}, "One sentence at a time"),
			seg(
				"focus",
				[
					["on", "On"],
					["off", "Off"],
				],
				s.coachFocus ? "on" : "off",
				onoff("coachFocus"),
			),
		),
		h(
			"div",
			{ class: "srow sub" },
			h("span", {}, "Show punctuation"),
			seg(
				"marks",
				[
					["on", "On"],
					["off", "Off"],
				],
				s.coachMarks ? "on" : "off",
				onoff("coachMarks"),
			),
		),
	);

	const sheet = h(
		"div",
		{ class: "sheet", role: "dialog", "aria-label": "Settings" },
		h("h2", {}, "Settings"),
		h("div", { class: "srow" }, h("span", {}, "Text size"), sizeBtns),
		h(
			"div",
			{ class: "srow" },
			h("span", {}, "Look"),
			seg(
				"theme",
				[
					["paper", "Paper"],
					["night", "Night"],
				],
				s.theme,
				(v) => {
					store.setSetting("theme", v);
					applySettings();
				},
			),
		),
		h(
			"div",
			{ class: "srow" },
			h("span", {}, "Text style"),
			seg(
				"font",
				[
					["book", "Book"],
					["clean", "Clean"],
				],
				s.font === "clean" ? "clean" : "book",
				(v) => {
					store.setSetting("font", v);
					applySettings();
				},
			),
		),
		h(
			"div",
			{ class: "srow" },
			h("span", {}, "Moving pictures"),
			seg(
				"anim",
				[
					["on", "On"],
					["off", "Off"],
				],
				s.anim ? "on" : "off",
				(v) => {
					store.setSetting("anim", v === "on");
					applySettings();
				},
			),
		),
		h(
			"div",
			{ class: "srow" },
			h("span", {}, "Read-aloud button"),
			seg(
				"listen",
				[
					["on", "On"],
					["off", "Off"],
				],
				s.readAloud === false ? "off" : "on",
				(v) => {
					store.setSetting("readAloud", v === "on");
					applySettings();
				},
			),
		),
		h(
			"div",
			{ class: "srow" },
			h("span", {}, "Reading Coach"),
			seg(
				"coach",
				[
					["on", "On"],
					["off", "Off"],
				],
				s.coach ? "on" : "off",
				(v) => {
					onoff("coach")(v);
					coachRows.hidden = v !== "on";
				},
			),
		),
		coachRows,
		tts.available ? voiceRow(s) : null,
		h("div", { class: "srow" }, h("span", {}, "Voice speed"), rate),
		h(
			"div",
			{ class: "srow" },
			h("span", {}, "Grown-ups"),
			h(
				"div",
				{ class: "row-ctrl" },
				h(
					"button",
					{
						type: "button",
						class: "btn small",
						onclick: () => {
							close();
							location.hash = "#/parent";
						},
					},
					"Report",
				),
				h(
					"button",
					{ type: "button", class: "btn small", onclick: () => openGrownups() },
					"Prizes & PIN",
				),
			),
		),
		h(
			"div",
			{ class: "srow" },
			h("span", {}, "Everything"),
			h(
				"button",
				{
					type: "button",
					class: "btn small danger",
					onclick: async () => {
						if (!(await requirePin())) return;
						const yes = await askConfirm({
							icon: "🗑️",
							title: "Erase everything?",
							message:
								"This removes every reader, with all their reading progress, stars, prizes, postcards, saved names and reading stats on this device.",
							yes: "Erase it all",
							no: "Keep it",
							danger: true,
						});
						if (yes) {
							store.resetAll();
							close();
							location.hash = "#/";
							location.reload();
						}
					},
				},
				"Erase all readers",
			),
		),
		h(
			"button",
			{ type: "button", class: "btn primary", onclick: close },
			"Done",
		),
		h(
			"p",
			{ class: "fine" },
			`${APP_NAME} keeps everything on this device. Nothing is sent anywhere.`,
		),
	);

	const back = h(
		"div",
		{
			class: "sheet-back",
			onclick: (e) => {
				if (e.target === back) close();
			},
		},
		sheet,
	);
	document.body.append(back);
}
