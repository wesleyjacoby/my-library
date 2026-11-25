// Small flat pictures for the word helper. Each is a 120 x 90 scene that carries its own background, so it
// looks the same in the paper and night themes. Pure strings, so tools/check-book.mjs can list the names too.
// Add a picture here, then point a book's glossary entry at it with "art": "<name>".

const C = {
	sky: "#cfe3f5",
	dusk: "#f1c9a5",
	night: "#1b2547",
	sea: "#4a7fc1",
	deep: "#2f5f9e",
	foam: "#e8f2fb",
	gold: "#f2b84b",
	glow: "#ffe9a8",
	red: "#c4572f",
	white: "#fffaf0",
	stone: "#aaa294",
	rock: "#6e675a",
	wood: "#9a6b3c",
	dark: "#5b3b1d",
	green: "#4f8f5a",
	sand: "#e8d7a8",
	grey: "#8a93a8",
	ink: "#2a2118",
};
const bg = (fill) => `<rect width="120" height="90" rx="10" fill="${fill}"/>`;
const sea = (y, fill = C.sea) =>
	`<rect x="0" y="${y}" width="120" height="${90 - y}" fill="${fill}"/>`;
const wave = (y, x0 = 0, x1 = 120, col = C.foam) => {
	let d = `M${x0} ${y}`;
	for (let x = x0; x < x1; x += 16) d += ` q4 -4 8 0 t8 0`;
	return `<path d="${d}" fill="none" stroke="${col}" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>`;
};

const ART = {
	lantern: () =>
		bg(C.night) +
		`<circle cx="60" cy="46" r="32" fill="${C.gold}" opacity=".16"/>
    <path d="M50 22 Q60 6 70 22" fill="none" stroke="${C.gold}" stroke-width="3" stroke-linecap="round"/>
    <path d="M44 32 L76 32 L68 22 L52 22 Z" fill="#5a4a3a"/>
    <rect x="48" y="32" width="24" height="34" rx="4" fill="${C.glow}" opacity=".4" stroke="#d9b45a" stroke-width="2"/>
    <path d="M60 60 C52 54 56 46 60 38 C64 46 68 54 60 60 Z" fill="${C.gold}"/><path d="M60 59 C57 56 58 52 60 49 C62 52 63 56 60 59 Z" fill="#fff3c4"/>
    <rect x="44" y="66" width="32" height="7" rx="2" fill="#5a4a3a"/>`,

	lighthouse: () =>
		bg(C.sky) +
		sea(68) +
		wave(74, 0, 60) +
		wave(82, 40, 120) +
		`<path d="M62 70 Q80 56 110 60 L120 70 L120 90 L50 90 Z" fill="${C.rock}"/>
    <defs><clipPath id="lh"><path d="M54 66 L66 66 L63 24 L57 24 Z"/></clipPath></defs>
    <g clip-path="url(#lh)"><rect x="50" y="20" width="20" height="50" fill="${C.white}"/><rect x="50" y="30" width="20" height="9" fill="${C.red}"/><rect x="50" y="48" width="20" height="9" fill="${C.red}"/></g>
    <rect x="52" y="19" width="16" height="5" fill="${C.ink}"/><rect x="55" y="12" width="10" height="8" fill="${C.glow}" stroke="${C.ink}" stroke-width="1.5"/>
    <path d="M54 12 L60 5 L66 12 Z" fill="${C.red}"/>
    <path d="M70 15 L98 8 L98 22 Z" fill="${C.gold}" opacity=".5"/>`,

	lens: () =>
		bg(C.night) +
		`<circle cx="60" cy="45" r="34" fill="${C.gold}" opacity=".18"/>
    ${[34, 27, 20, 13].map((r) => `<circle cx="60" cy="45" r="${r}" fill="none" stroke="${C.glow}" stroke-width="2.4"/>`).join("")}
    <circle cx="60" cy="45" r="6" fill="${C.gold}"/><circle cx="60" cy="45" r="2.5" fill="#fff"/>
    ${[0, 45, 90, 135].map((a) => `<line x1="60" y1="8" x2="60" y2="82" stroke="${C.glow}" stroke-width=".9" opacity=".6" transform="rotate(${a} 60 45)"/>`).join("")}`,

	beam: () =>
		bg(C.night) +
		[
			[14, 12],
			[30, 24],
			[96, 14],
			[106, 30],
			[22, 52],
		]
			.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4" fill="#fff"/>`)
			.join("") +
		sea(72, C.deep) +
		wave(78) +
		`<path d="M90 36 L2 20 L2 56 Z" fill="${C.gold}" opacity=".5"/>
    <path d="M94 72 L100 72 L99 40 L95 40 Z" fill="${C.white}"/><rect x="92" y="34" width="10" height="7" fill="${C.glow}"/><path d="M92 34 L97 28 L102 34 Z" fill="${C.red}"/>
    <path d="M86 72 Q98 64 114 72 L114 76 L86 76 Z" fill="${C.rock}"/>`,

	causeway: () =>
		bg(C.sky) +
		sea(40) +
		wave(50, 0, 40) +
		wave(60, 80, 120) +
		wave(72, 0, 36) +
		`<path d="M26 90 L94 90 L66 40 L54 40 Z" fill="${C.stone}"/>
    <path d="M30 82 L90 82 M38 70 L82 70 M45 58 L75 58 M51 48 L69 48" stroke="${C.rock}" stroke-width="1.6" opacity=".7"/>
    <path d="M46 42 Q60 22 74 42 Z" fill="${C.rock}"/><rect x="58" y="26" width="4" height="12" fill="${C.white}"/><rect x="58" y="26" width="4" height="3" fill="${C.red}"/>`,

	tide: () => `<rect width="120" height="90" rx="10" fill="${C.sky}"/>
    <rect x="0" y="30" width="60" height="60" fill="${C.sea}"/><path d="M0 30 q7 -5 15 0 t15 0 t15 0 t15 0" fill="none" stroke="${C.foam}" stroke-width="2"/>
    <rect x="60" y="62" width="60" height="28" fill="${C.sand}"/><rect x="60" y="76" width="60" height="14" fill="${C.sea}"/><path d="M60 76 q7 -4 15 0 t15 0 t15 0 t15 0" fill="none" stroke="${C.foam}" stroke-width="2"/>
    <rect x="28" y="14" width="5" height="70" fill="${C.wood}"/><rect x="88" y="14" width="5" height="62" fill="${C.wood}"/>
    <path d="M46 40 L46 22 M41 28 L46 22 L51 28" stroke="${C.ink}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".8"/>
    <path d="M106 40 L106 58 M101 52 L106 58 L111 52" stroke="${C.ink}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".8"/>
    <line x1="60" y1="0" x2="60" y2="90" stroke="#fff" stroke-width="2" opacity=".8"/>`,

	harbour: () =>
		bg(C.sky) +
		sea(46) +
		wave(56, 0, 80) +
		wave(70, 30, 120) +
		`<path d="M0 46 L120 46 L120 56 L0 56 Z" fill="${C.stone}"/><path d="M0 46 L120 46" stroke="${C.rock}" stroke-width="2"/>
    <g><path d="M16 66 L50 66 L44 76 L22 76 Z" fill="${C.red}"/><rect x="26" y="56" width="12" height="10" fill="${C.white}"/><rect x="31" y="46" width="2" height="10" fill="${C.ink}"/><path d="M33 46 L42 52 L33 54 Z" fill="${C.gold}"/></g>
    <g><path d="M72 74 L104 74 L99 83 L78 83 Z" fill="${C.deep}"/><rect x="82" y="65" width="11" height="9" fill="${C.white}"/><rect x="87" y="56" width="2" height="9" fill="${C.ink}"/></g>
    <circle cx="100" cy="22" r="8" fill="${C.glow}"/>`,

	spiral: () =>
		bg(C.night) +
		`<rect x="55" y="6" width="10" height="80" fill="${C.rock}"/>
    ${[0, 1, 2, 3, 4, 5, 6, 7]
			.map((i) => {
				const y = 78 - i * 9,
					d = i % 2 ? -1 : 1;
				return `<path d="M60 ${y} L${60 + d * 32} ${y - 3} L${60 + d * 32} ${y + 1} L60 ${y + 5} Z" fill="${i % 2 ? "#c9b48a" : "#e0cfa5"}" stroke="${C.ink}" stroke-width="1.2" stroke-linejoin="round"/>`;
			})
			.join("")}
    <path d="M28 70 C36 62 84 62 92 54 C84 46 36 46 28 38 C36 30 84 30 92 22" fill="none" stroke="${C.gold}" stroke-width="2" stroke-linecap="round" opacity=".9"/>`,

	trapdoor: () =>
		bg("#3a3040") +
		`<rect x="0" y="40" width="120" height="50" fill="${C.wood}"/>
    ${[0, 1, 2, 3, 4, 5].map((i) => `<line x1="0" y1="${46 + i * 8}" x2="120" y2="${46 + i * 8}" stroke="${C.dark}" stroke-width="1.5" opacity=".6"/>`).join("")}
    <path d="M38 40 L82 40 L96 84 L24 84 Z" fill="#1b1a24"/>
    <path d="M40 44 L80 44 L90 80 L30 80 Z" fill="${C.gold}" opacity=".55"/>
    ${[52, 60, 68, 76].map((y) => `<line x1="${47 - (y - 44) * 0.1}" y1="${y}" x2="${73 + (y - 44) * 0.1}" y2="${y}" stroke="${C.dark}" stroke-width="2.4"/>`).join("")}
    <path d="M38 40 L82 40 L76 12 L44 12 Z" fill="${C.wood}" stroke="${C.dark}" stroke-width="2"/><circle cx="60" cy="24" r="3" fill="${C.gold}" stroke="${C.dark}" stroke-width="1"/>`,

	wellington: () =>
		bg(C.sky) +
		`<rect x="0" y="74" width="120" height="16" fill="${C.sand}"/>
    <path d="M46 14 L74 14 L72 54 Q72 62 84 64 Q98 68 98 78 L98 80 L44 80 L44 66 Q44 62 46 56 Z" fill="${C.green}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/>
    <rect x="44" y="12" width="32" height="8" rx="3" fill="#3f7348" stroke="${C.ink}" stroke-width="2"/>
    <path d="M44 76 L98 76 L98 82 L44 82 Z" fill="${C.ink}" opacity=".85"/>
    <path d="M52 24 L52 50" stroke="#fff" stroke-width="3" opacity=".35" stroke-linecap="round"/>
    <ellipse cx="22" cy="78" rx="8" ry="2.5" fill="${C.sea}" opacity=".5"/><path d="M20 60 q-2 -6 0 -9 q3 3 0 9" fill="${C.sea}" opacity=".8"/>`,

	seaweed: () =>
		bg(C.deep) +
		[
			[20, 62, "#3f7a4a"],
			[38, 74, "#5a8a3a"],
			[60, 58, "#3f7a4a"],
			[82, 70, "#6a9a3a"],
			[100, 54, "#3f7a4a"],
		]
			.map(
				([x, h, c]) =>
					`<path d="M${x} 90 C${x - 12} ${90 - h * 0.35}, ${x + 12} ${90 - h * 0.65}, ${x} ${90 - h}" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"/>
     <path d="M${x} 80 q10 -2 12 -10 M${x} 66 q-10 -2 -12 -10" stroke="${c}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
			)
			.join("") +
		[
			[30, 30],
			[72, 20],
			[92, 40],
			[12, 40],
		]
			.map(
				([x, y]) =>
					`<circle cx="${x}" cy="${y}" r="3" fill="none" stroke="${C.foam}" stroke-width="1.4"/>`,
			)
			.join(""),

	lobster: () =>
		bg(C.sand) +
		`<g stroke="${C.ink}" stroke-width="1.8" stroke-linejoin="round" fill="${C.red}">
    <path d="M60 52 L52 82 L68 82 Z"/><path d="M54 70 L66 70 M56 76 L64 76" fill="none"/>
    <ellipse cx="60" cy="44" rx="14" ry="20"/>
    <path d="M48 36 Q28 30 24 14 Q42 12 50 28 Z"/><path d="M72 36 Q92 30 96 14 Q78 12 70 28 Z"/>
    <path d="M24 14 Q20 6 30 4 Q34 10 34 16 Z"/><path d="M96 14 Q100 6 90 4 Q86 10 86 16 Z"/></g>
    <path d="M50 28 Q40 6 36 2 M70 28 Q80 6 84 2" fill="none" stroke="${C.ink}" stroke-width="1.5"/>
    <path d="M46 46 L34 52 M46 54 L36 62 M74 46 L86 52 M74 54 L84 62" stroke="${C.ink}" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="54" cy="28" r="2.6" fill="${C.ink}"/><circle cx="66" cy="28" r="2.6" fill="${C.ink}"/>`,

	quay: () =>
		bg(C.sky) +
		sea(44) +
		wave(58, 0, 70) +
		wave(74, 40, 120) +
		`<path d="M60 38 L120 38 L120 90 L60 90 Z" fill="${C.stone}"/><path d="M60 38 L120 38 L120 48 L60 48 Z" fill="#c4bdae"/>
    <path d="M60 58 H120 M60 72 H120 M76 48 V58 M100 48 V58 M68 58 V72 M92 58 V72 M112 58 V72" stroke="${C.rock}" stroke-width="1.4" opacity=".7"/>
    <rect x="84" y="26" width="8" height="14" rx="2" fill="${C.ink}"/><rect x="82" y="24" width="12" height="4" rx="2" fill="${C.ink}"/>
    <path d="M86 28 Q70 34 52 60" fill="none" stroke="${C.wood}" stroke-width="2.4"/>
    <path d="M10 66 L52 66 L46 78 L16 78 Z" fill="${C.red}"/><rect x="20" y="56" width="14" height="10" fill="${C.white}"/><rect x="26" y="46" width="2" height="10" fill="${C.ink}"/>`,

	ledger: () =>
		bg("#d9c9a5") +
		`<path d="M12 22 L60 28 L108 22 L108 76 L60 82 L12 76 Z" fill="${C.white}" stroke="${C.dark}" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M60 28 V82" stroke="${C.dark}" stroke-width="2.4"/>
    ${[0, 1, 2, 3, 4].map((i) => `<path d="M18 ${34 + i * 9} L56 ${37 + i * 9} M64 ${37 + i * 9} L102 ${34 + i * 9}" stroke="${C.grey}" stroke-width="1.4"/>`).join("")}
    <path d="M42 30 V80 M84 30 V80" stroke="#d9a0a0" stroke-width="1.2" opacity=".7"/>
    ${[0, 1, 2].map((i) => `<path d="M20 ${33 + i * 9} l8 1 M66 ${36 + i * 9} l10 0 M88 ${36 + i * 9} l6 -1" stroke="${C.ink}" stroke-width="1.8" stroke-linecap="round"/>`).join("")}
    <path d="M96 78 L112 56 L116 59 L100 81 Z" fill="${C.gold}" stroke="${C.dark}" stroke-width="1.4"/>`,

	dinghy: () =>
		bg(C.sky) +
		sea(50) +
		wave(58, 0, 120) +
		wave(76, 20, 120) +
		`<path d="M10 52 Q10 42 24 44 L96 44 Q110 42 110 52 Q110 68 94 68 L26 68 Q10 68 10 52 Z" fill="#e9843a" stroke="${C.ink}" stroke-width="2.4"/>
    <path d="M20 50 Q60 56 100 50" fill="none" stroke="${C.ink}" stroke-width="1.6" opacity=".6"/>
    <path d="M70 46 L98 22" stroke="${C.dark}" stroke-width="3" stroke-linecap="round"/><path d="M46 56 L28 78" stroke="${C.dark}" stroke-width="3" stroke-linecap="round"/>`,

	bell: () =>
		bg(C.night) +
		`<path d="M40 54 Q40 24 60 22 Q80 24 80 54 L88 62 L32 62 Z" fill="${C.gold}" stroke="#a97d1f" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M60 22 V16" stroke="#a97d1f" stroke-width="4" stroke-linecap="round"/><rect x="52" y="10" width="16" height="5" rx="2" fill="${C.wood}"/>
    <ellipse cx="60" cy="62" rx="28" ry="4" fill="#7a5a14"/>
    <path d="M60 60 V70" stroke="${C.grey}" stroke-width="3"/><circle cx="60" cy="74" r="6" fill="${C.grey}" stroke="#fff" stroke-width="1.6"/>
    <path d="M30 46 q-6 6 0 12 M24 42 q-10 10 0 20 M90 46 q6 6 0 12 M96 42 q10 10 0 20" fill="none" stroke="${C.glow}" stroke-width="1.8" stroke-linecap="round" opacity=".8"/>`,

	oilskin: () =>
		bg(C.sky) +
		`<path d="M40 20 Q60 6 80 20 L84 34 L98 70 L88 76 L78 50 L78 84 L42 84 L42 50 L32 76 L22 70 L36 34 Z" fill="#f2c230" stroke="${C.ink}" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M40 20 Q60 40 80 20 Q60 8 40 20 Z" fill="#d9a41c" stroke="${C.ink}" stroke-width="2"/>
    <path d="M60 38 V84" stroke="${C.ink}" stroke-width="1.8"/>
    ${[48, 60, 72].map((y) => `<circle cx="64" cy="${y}" r="2.2" fill="${C.ink}"/>`).join("")}
    ${[
			[12, 14],
			[24, 34],
			[104, 18],
			[96, 40],
			[108, 58],
			[10, 52],
		]
			.map(
				([x, y]) =>
					`<path d="M${x} ${y} q-3 6 0 8 q3 -2 0 -8" fill="${C.sea}"/>`,
			)
			.join("")}`,

	compass: () =>
		bg(C.sand) +
		`<circle cx="60" cy="46" r="34" fill="${C.wood}" stroke="${C.dark}" stroke-width="3"/><circle cx="60" cy="46" r="28" fill="${C.white}" stroke="${C.dark}" stroke-width="1.6"/>
    ${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<line x1="60" y1="20" x2="60" y2="${a % 90 ? 24 : 27}" stroke="${C.ink}" stroke-width="${a % 90 ? 1.2 : 2}" transform="rotate(${a} 60 46)"/>`).join("")}
    <text x="60" y="38" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="800" font-size="10" fill="${C.red}">N</text>
    <path d="M60 24 L66 46 L54 46 Z" fill="${C.red}"/><path d="M60 68 L66 46 L54 46 Z" fill="${C.grey}"/><circle cx="60" cy="46" r="2.6" fill="${C.ink}"/>`,

	buoy: () =>
		bg(C.sky) +
		sea(52, C.deep) +
		wave(58) +
		wave(72, 30, 120) +
		`<path d="M44 58 L48 34 L72 34 L76 58 Q60 64 44 58 Z" fill="${C.red}" stroke="${C.ink}" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M46 48 L74 48 L75 54 Q60 59 45 54 Z" fill="${C.white}"/>
    <rect x="57" y="18" width="6" height="16" fill="${C.ink}"/><circle cx="60" cy="14" r="6" fill="${C.glow}" stroke="${C.ink}" stroke-width="2"/>
    <path d="M60 62 Q52 72 60 80 Q68 86 60 90" fill="none" stroke="${C.grey}" stroke-width="2.4" stroke-dasharray="4 3"/>`,

	boathouse: () =>
		bg(C.sky) +
		sea(62) +
		wave(70, 0, 120) +
		`<rect x="18" y="28" width="84" height="40" fill="${C.wood}" stroke="${C.dark}" stroke-width="2.2"/>
    ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => `<line x1="${24 + i * 7}" y1="28" x2="${24 + i * 7}" y2="68" stroke="${C.dark}" stroke-width="1" opacity=".5"/>`).join("")}
    <path d="M12 30 L60 8 L108 30 Z" fill="${C.rock}" stroke="${C.ink}" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M40 68 L40 46 Q60 32 80 46 L80 68 Z" fill="#1b1a24"/>
    <path d="M46 66 L74 66 L70 72 L50 72 Z" fill="${C.red}"/><rect x="59" y="52" width="2" height="14" fill="${C.glow}"/>
    <rect x="10" y="66" width="100" height="6" fill="${C.dark}"/>`,

	crate: () =>
		bg("#d9c9a5") +
		`<path d="M24 36 L40 22 L100 22 L84 36 Z" fill="#b98a52" stroke="${C.dark}" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M84 36 L100 22 L100 68 L84 80 Z" fill="#8a5f31" stroke="${C.dark}" stroke-width="2.2" stroke-linejoin="round"/>
    <rect x="24" y="36" width="60" height="44" fill="${C.wood}" stroke="${C.dark}" stroke-width="2.2"/>
    ${[46, 58, 70].map((y) => `<line x1="24" y1="${y}" x2="84" y2="${y}" stroke="${C.dark}" stroke-width="1.8"/>`).join("")}
    <path d="M26 38 L82 78" stroke="${C.dark}" stroke-width="3"/>
    ${[
			[30, 42],
			[78, 42],
			[30, 74],
			[78, 74],
		]
			.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8" fill="${C.ink}"/>`)
			.join("")}`,

	tunnel: () =>
		bg(C.green) +
		`<path d="M0 60 Q60 -4 120 60 L120 90 L0 90 Z" fill="#6aa86f"/>
    <path d="M18 90 L18 50 Q60 4 102 50 L102 90 Z" fill="${C.stone}" stroke="${C.rock}" stroke-width="2.2"/>
    <path d="M30 90 L30 54 Q60 20 90 54 L90 90 Z" fill="#14121c"/>
    <path d="M24 56 L32 52 M34 40 L42 36 M50 28 L56 26 M70 26 L76 28 M82 36 L88 40 M88 52 L96 56" stroke="${C.rock}" stroke-width="2" opacity=".8"/>
    <circle cx="60" cy="72" r="14" fill="${C.gold}" opacity=".2"/><rect x="56" y="66" width="8" height="12" rx="2" fill="${C.glow}" stroke="#a97d1f" stroke-width="1.6"/>
    <path d="M30 90 L90 90" stroke="${C.rock}" stroke-width="2"/>`,
};

export const ART_NAMES = Object.keys(ART);

// Returns an SVG string for a picture name, or null when there is no such picture.
export function artSvg(name) {
	const f = ART[name];
	if (!f) return null;
	return `<svg class="wordart" viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true" focusable="false"><clipPath id="wa-r"><rect width="120" height="90" rx="10"/></clipPath><g clip-path="url(#wa-r)">${f()}</g></svg>`;
}
