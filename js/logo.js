// The Plotling mark: a sprout that forks in two (the story choices) growing out of an open book.
// Drawn on the same navy tile as the app icon so it looks right on both the paper and night themes.
const MARK =
	'<path d="M14 64 L48 58 L48 84 L14 90 Z" fill="#fff3d6"/><path d="M52 58 L86 64 L86 90 L52 84 Z" fill="#fff3d6"/><path d="M20 70 L42 66 M20 76 L42 72 M58 66 L80 70 M58 72 L80 76" stroke="#dcc28a" stroke-width="2.2" stroke-linecap="round" fill="none"/><path d="M50 58 L50 84" stroke="#d9bf86" stroke-width="2" fill="none"/><g fill="none" stroke="#8fd18a" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"><path d="M50 58 L50 44"/><path d="M50 44 C50 38 41 36 35 30"/><path d="M50 44 C50 38 59 36 65 30"/></g><g fill="#8fd18a"><path d="M35 30 C25 31 20 23 21 16 C29 15 36 21 35 30 Z"/><path d="M65 30 C75 31 80 23 79 16 C71 15 64 21 65 30 Z"/></g>';

export function logo() {
	const wrap = document.createElement("span");
	wrap.innerHTML =
		'<svg class="logo-mark" viewBox="0 0 100 100" aria-hidden="true" focusable="false">' +
		'<defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2547"/><stop offset="1" stop-color="#34487a"/></linearGradient></defs>' +
		'<rect width="100" height="100" rx="22" fill="url(#lg)"/>' +
		'<circle cx="18" cy="26" r="1.8" fill="#fff"/><circle cx="84" cy="40" r="1.5" fill="#fff"/><circle cx="82" cy="14" r="2" fill="#f6c453"/>' +
		'<g transform="translate(4 6) scale(.92)">' +
		MARK +
		"</g></svg>";
	return wrap.firstChild;
}
