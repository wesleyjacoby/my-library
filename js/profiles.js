// Reader profiles: who is reading right now. Each reader keeps their own progress, stars,
// names, settings and reading stats. Switching is free; adding, editing and deleting need the grown-ups PIN.
import { h } from "./dom.js";
import * as store from "./store.js";
import { askConfirm } from "./confirm.js";
import { requirePin } from "./rewardsui.js";
import { icon } from "./icons.js";

// The small button in the library header showing who is reading.
export function profileChip(onChange) {
	const p = store.currentProfile();
	return h(
		"button",
		{
			type: "button",
			class: "profile-chip",
			"aria-label": `Reader: ${p.name}. Change reader`,
			onclick: () => openProfiles(onChange),
		},
		h("span", { class: "pc-av", "aria-hidden": "true" }, p.avatar),
		h("span", { class: "pc-name" }, p.name),
	);
}

export function openProfiles(onChange) {
	if (document.querySelector(".sheet-back")) return;
	const box = h("div", {
		class: "sheet profiles-sheet",
		role: "dialog",
		"aria-label": "Readers",
	});
	const back = h(
		"div",
		{
			class: "sheet-back",
			onclick: (e) => {
				if (e.target === back) close();
			},
		},
		box,
	);
	const close = () => back.remove();

	const listView = () => {
		const rows = store.profiles().map((p) => {
			const now = p.id === store.currentId();
			return h(
				"div",
				{ class: `pf-row${now ? " now" : ""}` },
				h(
					"button",
					{
						type: "button",
						class: "pf-pick",
						"aria-label": now
							? `${p.name}, reading now`
							: `Switch to ${p.name}`,
						onclick: () => {
							if (!now) {
								store.switchProfile(p.id);
								onChange();
							}
							close();
						},
					},
					h("span", { class: "pf-av", "aria-hidden": "true" }, p.avatar),
					h("span", { class: "pf-name" }, p.name),
					now ? h("span", { class: "pf-now" }, "✓ reading now") : null,
				),
				h(
					"button",
					{
						type: "button",
						class: "icon-btn pf-edit",
						"aria-label": `Edit ${p.name}`,
						onclick: async () => {
							if (await requirePin()) editView(p);
						},
					},
					icon("edit"),
				),
			);
		});
		const full = store.profiles().length >= store.MAX_PROFILES;
		box.replaceChildren(
			h("h2", {}, "Who is reading?"),
			h("div", { class: "pf-list" }, rows),
			full
				? h(
						"p",
						{ class: "fine" },
						`Up to ${store.MAX_PROFILES} readers on one device.`,
					)
				: h(
						"button",
						{
							type: "button",
							class: "btn small",
							onclick: async () => {
								if (await requirePin()) editView(null);
							},
						},
						"＋ Add a reader",
					),
			h(
				"p",
				{ class: "fine" },
				"Each reader keeps their own stories, stars, names and settings.",
			),
			h(
				"button",
				{ type: "button", class: "btn primary", onclick: close },
				"Done",
			),
		);
	};

	const editView = (p) => {
		let avatar = p
			? p.avatar
			: store.AVATARS[store.profiles().length % store.AVATARS.length];
		const input = h("input", {
			type: "text",
			maxlength: "20",
			value: p ? p.name : "",
			placeholder: "Name",
			"aria-label": "Reader name",
			autocapitalize: "words",
			autocomplete: "off",
			autocorrect: "off",
			spellcheck: "false",
			class: "pf-input",
		});
		const grid = h(
			"div",
			{ class: "pf-avatars", role: "radiogroup", "aria-label": "Picture" },
			store.AVATARS.map((a) => {
				const b = h(
					"button",
					{
						type: "button",
						role: "radio",
						class: a === avatar ? "on" : "",
						"aria-checked": String(a === avatar),
						"aria-label": a,
						onclick: () => {
							avatar = a;
							grid.querySelectorAll("button").forEach((x) => {
								x.classList.remove("on");
								x.setAttribute("aria-checked", "false");
							});
							b.classList.add("on");
							b.setAttribute("aria-checked", "true");
						},
					},
					a,
				);
				return b;
			}),
		);
		const save = () => {
			const name = input.value.trim();
			if (!name) {
				input.classList.add("bad");
				input.focus();
				return;
			}
			if (p) {
				store.updateProfile(p.id, { name, avatar });
			} else {
				const id = store.addProfile(name, avatar);
				if (id) store.switchProfile(id);
			}
			onChange();
			close();
		};
		input.addEventListener("input", () => input.classList.remove("bad"));
		input.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				e.preventDefault();
				save();
			}
		});
		const canDelete = p && store.profiles().length > 1;
		// native replaceChildren turns null into the text "null", so empty slots are filtered out
		box.replaceChildren(
			...[
				h("h2", {}, p ? "Edit reader" : "New reader"),
				input,
				grid,
				h(
					"button",
					{ type: "button", class: "btn primary", onclick: save },
					p ? "Save" : "Add reader",
				),
				h(
					"button",
					{ type: "button", class: "btn ghost", onclick: listView },
					"Cancel",
				),
				canDelete
					? h(
							"button",
							{
								type: "button",
								class: "btn small danger",
								onclick: async () => {
									const yes = await askConfirm({
										icon: "🗑️",
										title: `Delete ${p.name}?`,
										message: `All of ${p.name}’s progress, stars, prizes, postcards and reading stats on this device will be erased.`,
										yes: "Delete",
										no: "Keep",
										danger: true,
									});
									if (!yes) return;
									store.removeProfile(p.id);
									onChange();
									close();
								},
							},
							`Delete ${p.name}`,
						)
					: null,
			].filter(Boolean),
		);
		input.focus();
	};

	document.body.append(back);
	listView();
}
