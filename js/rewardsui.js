// Everything the reader sees about rewards, plus the PIN-protected grown-ups screen.
import { h } from "./dom.js";
import * as R from "./rewards.js";
import * as store from "./store.js";
import { sceneHTML } from "./scenes.js";
import { askConfirm } from "./confirm.js";
import { APP_NAME } from "./config.js";

let library = new Map();
export const setLibrary = (m) => {
	library = m;
};

const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

// ---------- small pieces ----------

export function toast(items) {
	if (!items.length) return;
	const sum = items.reduce((a, i) => a + i.stars, 0);
	const el = h(
		"div",
		{ class: "reward-toast", role: "status" },
		h("div", { class: "rt-stars" }, `${"⭐".repeat(Math.min(sum, 5))} +${sum}`),
		h(
			"ul",
			{},
			items.map((i) => h("li", {}, `+${i.stars} ${i.label}`)),
		),
	);
	document.body.append(el);
	setTimeout(() => el.classList.add("out"), 3800);
	setTimeout(() => el.remove(), 4300);
}

export async function celebrate(list) {
	for (const p of list) {
		await askConfirm({
			icon: "🏆",
			title: "You earned a prize!",
			message: `${p.name}. Show a grown-up!`,
			yes: "Hooray!",
			single: true,
		});
	}
}

export function postcardEl(book, pc) {
	const when = new Date(pc.date).toLocaleDateString("en-GB", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});
	return h(
		"figure",
		{ class: "postcard" },
		h("div", {
			class: "pc-art",
			html:
				book.cover && book.cover.scene
					? sceneHTML(book.cover.scene, { static: true })
					: "",
		}),
		h("span", { class: "pc-stamp", "aria-hidden": "true" }, "⭐"),
		h(
			"figcaption",
			{},
			h("strong", {}, book.title),
			h(
				"span",
				{},
				`${pc.hero ? `${pc.hero}’s adventure` : "Adventure"} · ${when}`,
			),
		),
	);
}

// The strip on the library screen: stars so far and how far to the next prize
export function strip(nav) {
	const t = R.total();
	const pend = R.pending();
	const next = R.nextPrize();
	let line;
	let pct = 0;
	if (pend.length) {
		line = `🏆 ${pend[0].name} is ready! Show a grown-up`;
		pct = 100;
	} else if (next) {
		line = `${plural(next.stars - t, "star")} to go for ${next.name}`;
		pct = Math.min(100, Math.round((t / next.stars) * 100));
	} else if (R.prizes().length) line = "You have collected every prize!";
	else line = "Ask a grown-up to set a prize";
	return h(
		"button",
		{ type: "button", class: "rewards-strip", onclick: () => nav("#/rewards") },
		h("span", { class: "rs-count" }, `⭐ ${t}`),
		h(
			"span",
			{ class: "rs-mid" },
			h("span", { class: "rs-line" }, line),
			h("span", { class: "rs-bar" }, h("i", { style: `width:${pct}%` })),
		),
		h("span", { class: "rs-go", "aria-hidden": "true" }, "›"),
	);
}

export function endingRewards(res, books) {
	const bits = [];
	if (res.items.length) {
		bits.push(
			h(
				"p",
				{ class: "big-note" },
				`⭐ You earned ${plural(
					res.items.reduce((a, i) => a + i.stars, 0),
					"star",
				)}`,
			),
			h(
				"ul",
				{ class: "earned-list" },
				res.items.map((i) => h("li", {}, `+${i.stars} ${i.label}`)),
			),
		);
	}
	if (res.postcard) {
		const book = books.get(res.postcard.book);
		if (book)
			bits.push(
				h("p", { class: "big-note" }, "🖼️ A new postcard for your collection"),
				postcardEl(book, res.postcard),
			);
	}
	return bits.length
		? h("section", { class: "ending-card earned" }, bits)
		: null;
}

// ---------- PIN dialogs ----------

function pinDialog({
	icon = "🔒",
	title,
	message,
	submit = "OK",
	validate,
	forgot,
}) {
	return new Promise((resolve) => {
		const prev = document.activeElement;
		const done = (v) => {
			back.remove();
			if (prev && prev.focus) prev.focus();
			resolve(v);
		};
		const err = h("p", { class: "pin-err", "aria-live": "polite" });
		const input = h("input", {
			type: "password",
			inputmode: "numeric",
			pattern: "[0-9]*",
			maxlength: "6",
			autocomplete: "off",
			class: "pin-input",
			"aria-label": "PIN",
			enterkeyhint: "done",
			oninput: (e) => {
				e.target.value = e.target.value.replace(/\D/g, "");
				err.textContent = "";
			},
		});
		const form = h(
			"form",
			{ class: "dialog-actions", novalidate: true },
			input,
			err,
			h("button", { type: "submit", class: "btn primary" }, submit),
			h(
				"button",
				{ type: "button", class: "btn ghost", onclick: () => done(null) },
				"Cancel",
			),
			forgot
				? h(
						"button",
						{
							type: "button",
							class: "linkish",
							onclick: async () => {
								const r = await forgot();
								if (r) done(null);
							},
						},
						"Forgot the PIN?",
					)
				: null,
		);
		form.addEventListener("submit", async (e) => {
			e.preventDefault();
			const msg = await validate(input.value);
			if (msg) {
				err.textContent = msg;
				input.value = "";
				input.focus();
				return;
			}
			done(input.value);
		});
		const box = h(
			"div",
			{ class: "dialog", role: "dialog", "aria-modal": "true" },
			h("div", { class: "dialog-icon", "aria-hidden": "true" }, icon),
			h("h2", {}, title),
			message ? h("p", {}, message) : null,
			form,
		);
		const back = h(
			"div",
			{
				class: "dialog-back",
				onclick: (e) => {
					if (e.target === back) done(null);
				},
			},
			box,
		);
		document.body.append(back);
		input.focus();
	});
}

async function forgotPin() {
	const yes = await askConfirm({
		icon: "🗑️",
		title: "Reset everything?",
		message:
			"The only way back in is to erase all stars, prizes, postcards and reading progress on this device, and the PIN with them.",
		yes: "Erase it all",
		no: "Keep it",
		danger: true,
	});
	if (yes) {
		store.resetAll();
		location.hash = "#/";
		location.reload();
	}
	return yes;
}

async function createPin() {
	const first = await pinDialog({
		icon: "🔑",
		title: "Choose a grown-ups PIN",
		message:
			"Four to six numbers. You will need it to change prizes. It stays on this device.",
		submit: "Next",
		validate: async (v) => (v.length < 4 ? "Use at least 4 numbers" : ""),
	});
	if (!first) return false;
	const again = await pinDialog({
		icon: "🔑",
		title: "Type it once more",
		submit: "Save PIN",
		validate: async (v) => (v === first ? "" : "That did not match. Try again"),
	});
	if (!again) return false;
	await R.setPin(first);
	return true;
}

// Resolves true if the person may continue. With no PIN set: creates one when `create` is true, else lets them through.
export async function requirePin({ create = false } = {}) {
	if (!R.hasPin()) return create ? createPin() : true;
	const pin = await pinDialog({
		title: "Grown-ups only",
		message: "Enter your PIN.",
		submit: "Unlock",
		validate: async (v) => ((await R.checkPin(v)) ? "" : "Not the right PIN"),
		forgot: forgotPin,
	});
	return !!pin;
}

// ---------- grown-ups screen ----------

export async function openGrownups(onClose, books = library) {
	if (!(await requirePin({ create: true }))) return;
	const list = h("div", { class: "gu-list" });
	const totalEl = h("strong", {});

	const renderList = () => {
		totalEl.textContent = plural(R.total(), "star");
		list.replaceChildren(
			...R.prizes().map((p) => {
				const name = h("input", {
					type: "text",
					value: p.name,
					maxlength: "40",
					placeholder: "Prize, e.g. Milktart for dessert",
					"aria-label": "Prize name",
					onchange: (e) => R.updatePrize(p.id, { name: e.target.value.trim() }),
				});
				const stars = h("input", {
					type: "number",
					min: "1",
					max: "999",
					value: String(p.stars),
					"aria-label": "Stars needed",
					class: "gu-stars",
					onchange: (e) => {
						R.updatePrize(p.id, {
							stars: Math.max(1, parseInt(e.target.value, 10) || 1),
						});
						renderList();
					},
				});
				const given = h(
					"label",
					{ class: "gu-given" },
					h("input", {
						type: "checkbox",
						checked: p.given ? true : null,
						onchange: (e) => R.updatePrize(p.id, { given: e.target.checked }),
					}),
					" Given",
				);
				const del = h(
					"button",
					{
						type: "button",
						class: "icon-btn",
						"aria-label": "Delete prize",
						onclick: () => {
							R.removePrize(p.id);
							renderList();
						},
					},
					"✕",
				);
				return h(
					"div",
					{ class: "gu-row" },
					name,
					h(
						"div",
						{ class: "gu-row2" },
						stars,
						h("span", {}, "⭐"),
						given,
						del,
					),
				);
			}),
		);
		if (!R.prizes().length)
			list.append(h("p", { class: "fine" }, "No prizes yet. Add one below."));
	};

	const close = () => {
		R.dropEmptyPrizes();
		back.remove();
		if (onClose) onClose();
	};
	const all = [...books.values()];
	const sheet = h(
		"div",
		{ class: "sheet gu-sheet", role: "dialog", "aria-label": "Grown-ups" },
		h("h2", {}, "🔒 Grown-ups"),
		h(
			"div",
			{ class: "srow" },
			h("span", {}, "Stars so far: ", totalEl),
			h(
				"button",
				{
					type: "button",
					class: "btn small",
					onclick: () => {
						R.bonusStar();
						renderList();
					},
				},
				"+1 bonus star",
			),
		),
		h("h3", {}, "Prizes"),
		h(
			"p",
			{ class: "fine" },
			`Each prize unlocks when the star total reaches its number. The library holds about ${R.maxStars(all)} stars in total, so you could try a small prize at 5, a bigger one at 15 and a grand one at 30 or more over several stories.`,
		),
		list,
		h(
			"button",
			{
				type: "button",
				class: "btn small",
				onclick: () => {
					const last = R.prizes().slice(-1)[0];
					R.addPrize("", last ? last.stars + 10 : 10);
					renderList();
					const rows = list.querySelectorAll(".gu-row input[type=text]");
					rows[rows.length - 1]?.focus();
				},
			},
			"＋ Add a prize",
		),
		h(
			"div",
			{ class: "srow" },
			h("span", {}, "PIN"),
			h(
				"button",
				{
					type: "button",
					class: "btn small",
					onclick: async () => {
						if (await requirePin()) createPin();
					},
				},
				"Change PIN",
			),
		),
		h(
			"button",
			{ type: "button", class: "btn primary", onclick: close },
			"Done",
		),
	);
	const back = h(
		"div",
		{
			class: "sheet-back gu-back",
			onclick: (e) => {
				if (e.target === back) close();
			},
		},
		sheet,
	);
	document.body.append(back);
	renderList();
}

// ---------- rewards page ----------

export function showRewardsPage(root, nav, books) {
	document.title = `My Rewards · ${APP_NAME}`;
	const t = R.total();
	const next = R.nextPrize();
	const pct = next ? Math.min(100, Math.round((t / next.stars) * 100)) : 100;

	const ladder = R.prizes().map((p) => {
		const got = p.stars <= t;
		const state = p.given
			? ["✅", "Given"]
			: got
				? ["🎁", "Ready! Show a grown-up"]
				: ["🔒", plural(p.stars - t, "star") + " to go"];
		return h(
			"li",
			{ class: `prize ${p.given ? "given" : got ? "ready" : ""}` },
			h("span", { class: "p-ico", "aria-hidden": "true" }, state[0]),
			h("span", { class: "p-name" }, p.name, h("small", {}, state[1])),
			h("span", { class: "p-stars" }, `${p.stars} ⭐`),
		);
	});

	const days = R.weekDays();
	const readDays = days.filter((d) => d.read).length;
	const cards = R.postcards().map((pc) => {
		const b = books.get(pc.book);
		return b ? postcardEl(b, pc) : null;
	});

	const card = (title, ...kids) =>
		h("section", { class: "rw-card" }, h("h2", {}, title), ...kids);
	root.replaceChildren(
		h(
			"main",
			{ class: "rewards-page" },
			h(
				"header",
				{ class: "rw-head" },
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
					h("div", { class: "rw-title" }, "My Rewards"),
					h(
						"button",
						{
							type: "button",
							class: "rw-round",
							"aria-label": "Grown-ups",
							title: "Grown-ups",
							onclick: () =>
								openGrownups(() => showRewardsPage(root, nav, books), books),
						},
						"🔒",
					),
				),
				h(
					"div",
					{ class: "rw-hero" },
					h("div", { class: "rw-star", "aria-hidden": "true" }, "⭐"),
					h("div", { class: "rw-big" }, String(t)),
					h(
						"p",
						{ class: "rw-sub" },
						t === 1 ? "star collected" : "stars collected",
					),
					next
						? h(
								"div",
								{ class: "rs-bar big" },
								h("i", { style: `width:${pct}%` }),
							)
						: null,
					next
						? h(
								"p",
								{ class: "rw-next" },
								`${plural(next.stars - t, "star")} until ${next.name}`,
							)
						: null,
				),
			),
			h(
				"div",
				{ class: "rw-wrap" },
				card(
					"🎁 Prizes",
					ladder.length
						? h("ul", { class: "prizes" }, ladder)
						: h(
								"p",
								{ class: "fine" },
								"A grown-up can add prizes using the 🔒 button.",
							),
				),
				card(
					"📅 This week",
					h(
						"div",
						{ class: "week" },
						days.map((d) =>
							h(
								"span",
								{
									class: `day${d.read ? " on" : ""}${d.today ? " today" : ""}${d.future ? " future" : ""}`,
								},
								d.read ? "⭐" : d.label,
							),
						),
					),
					h(
						"p",
						{ class: "fine" },
						readDays
							? `You read on ${plural(readDays, "day")} this week.`
							: "Read today to light up your first star.",
					),
				),
				card(
					"🖼️ My postcards",
					cards.filter(Boolean).length
						? h("div", { class: "postcards" }, cards)
						: h(
								"p",
								{ class: "fine" },
								"Finish a story to collect your first postcard.",
							),
				),
			),
		),
	);
}
