import { h } from "./dom.js";

// Friendly in-app replacement for window.confirm(). Resolves true or false.
export function askConfirm({
	icon = "📖",
	title,
	message,
	yes = "OK",
	no = "Cancel",
	danger = false,
	single = false,
}) {
	return new Promise((resolve) => {
		const prevFocus = document.activeElement;
		const done = (v) => {
			document.removeEventListener("keydown", onKey);
			back.remove();
			if (prevFocus && prevFocus.focus) prevFocus.focus();
			resolve(v);
		};
		const onKey = (e) => {
			if (e.key === "Escape") done(false);
		};
		const keep = h(
			"button",
			{ type: "button", class: "btn primary", onclick: () => done(!danger) },
			danger ? no : yes,
		);
		const go = single
			? null
			: h(
					"button",
					{
						type: "button",
						class: danger ? "btn danger solid" : "btn ghost",
						onclick: () => done(danger),
					},
					danger ? yes : no,
				);
		const box = h(
			"div",
			{
				class: "dialog",
				role: "alertdialog",
				"aria-modal": "true",
				"aria-labelledby": "dlg-title",
			},
			h("div", { class: "dialog-icon", "aria-hidden": "true" }, icon),
			h("h2", { id: "dlg-title" }, title),
			message ? h("p", {}, message) : null,
			h("div", { class: "dialog-actions" }, keep, go),
		);
		const back = h(
			"div",
			{
				class: "dialog-back",
				onclick: (e) => {
					if (e.target === back) done(false);
				},
			},
			box,
		);
		document.addEventListener("keydown", onKey);
		document.body.append(back);
		keep.focus();
	});
}
