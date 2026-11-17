// Animated atmospheric SVG scene kit.
// A scene is described in JSON: { mood, elements: [...], alt, align? }
// Elements are drawn in a fixed back-to-front order, so authors only list what they want.
// Animation is done in CSS (see styles.css) so it can be switched off globally.

const MOODS = {
	day: {
		sky: ["#5aa9e6", "#d6f0ff"],
		far: "#7fae9b",
		land: "#2f4a3d",
		sea: "#2e7fb8",
		cloud: "#ffffff",
		tower: "#ffffff",
		wave: "#ffffff",
		gull: "#3d4b5c",
	},
	dawn: {
		sky: ["#3b4a7a", "#f6a96b"],
		far: "#4d4a6e",
		land: "#1f2036",
		sea: "#44527f",
		cloud: "#ffd9b0",
		tower: "#f5e6d6",
		wave: "#ffe1c0",
	},
	dusk: {
		sky: ["#2a2358", "#e27d60"],
		far: "#3a2f57",
		land: "#1b1630",
		sea: "#30315f",
		cloud: "#f0a58a",
		tower: "#f1d7c9",
		wave: "#ffc9a8",
	},
	night: {
		sky: ["#060b20", "#26376f"],
		far: "#0f1a3c",
		land: "#050913",
		sea: "#0b1736",
		cloud: "#51649c",
		tower: "#b9c4e2",
		wave: "#8fb2ff",
	},
	storm: {
		sky: ["#161b26", "#4a5568"],
		far: "#2a3140",
		land: "#0b0e14",
		sea: "#1d2636",
		cloud: "#6b7689",
		tower: "#aab3c4",
		wave: "#c5d4ea",
	},
	cave: {
		sky: ["#07070d", "#1c1a2a"],
		far: "#14131d",
		land: "#0a0a10",
		sea: "#0b1020",
		cloud: "#2a2a3a",
		tower: "#999999",
		wave: "#8fb2ff",
	},
};

const ORDER = [
	"stars",
	"moon",
	"clouds",
	"gulls",
	"hills",
	"sea",
	"causeway",
	"village",
	"cliff",
	"lighthouse",
	"beam",
	"boat",
	"house",
	"trees",
	"map",
	"tunnel",
	"stairs",
	"lens",
	"keeper",
	"glow",
	"fog",
	"rain",
];

let uid = 0;

function hash(str) {
	let h = 2166136261;
	for (let i = 0; i < str.length; i++) {
		h ^= str.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

function rng(seed) {
	return function () {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const n0 = (v) => Math.round(v);
const esc = (s) =>
	String(s).replace(
		/[&<>"]/g,
		(c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
	);

const DRAW = {
	stars: ({ r }) => {
		let s = "<g>";
		for (let i = 0; i < 48; i++) {
			s += `<circle class="tw" style="--d:${(r() * 4).toFixed(1)}s" cx="${n0(r() * 800)}" cy="${n0(r() * 200)}" r="${(0.6 + r() * 1.5).toFixed(1)}" fill="#fff"/>`;
		}
		return s + "</g>";
	},

	moon: ({ id }) =>
		`<g><circle cx="480" cy="72" r="64" fill="url(#mg${id})"/><circle cx="480" cy="72" r="30" fill="#f7f1d0"/>` +
		`<circle cx="470" cy="64" r="5" fill="#e6dcae" opacity=".7"/><circle cx="491" cy="80" r="3.5" fill="#e6dcae" opacity=".7"/></g>`,

	clouds: ({ m }) => {
		const c = (x, y, s, t) =>
			`<g class="drift" style="--t:${t}s" opacity=".55"><ellipse cx="${x}" cy="${y}" rx="${70 * s}" ry="${16 * s}" fill="${m.cloud}"/>` +
			`<ellipse cx="${x + 40 * s}" cy="${y - 10 * s}" rx="${46 * s}" ry="${14 * s}" fill="${m.cloud}"/>` +
			`<ellipse cx="${x - 44 * s}" cy="${y - 6 * s}" rx="${40 * s}" ry="${12 * s}" fill="${m.cloud}"/></g>`;
		return c(160, 70, 1, 60) + c(470, 130, 0.8, 75) + c(700, 50, 0.7, 90);
	},

	gulls: ({ m }) => {
		const col = m.gull || m.land;
		let s = `<g fill="none" stroke="${col}" stroke-width="2.2" stroke-linecap="round">`;
		[
			[70, 60, 0, 26],
			[130, 92, -8, 32],
			[40, 112, -15, 30],
		].forEach(([x, y, d, t]) => {
			s += `<path class="gull" style="--d:${d}s;--t:${t}s" d="M${x} ${y} q9 -10 18 0 q9 -10 18 0"/>`;
		});
		return s + "</g>";
	},

	hills: ({ m }) =>
		`<path d="M0 250 Q110 185 250 232 T520 222 T800 236 L800 360 L0 360Z" fill="${m.far}"/>`,

	sea: ({ m }) => {
		let s = `<rect y="255" width="800" height="105" fill="${m.sea}"/>`;
		for (let i = 0; i < 5; i++) {
			const y = 272 + i * 18;
			let d = `M-100 ${y} q25 -7 50 0`;
			for (let k = 1; k < 20; k++) d += " t50 0";
			s += `<path class="wave" style="--t:${6 + i * 1.5}s" d="${d}" fill="none" stroke="${m.wave}" stroke-opacity="${(0.12 + i * 0.03).toFixed(2)}" stroke-width="2"/>`;
		}
		return s;
	},

	// A wet strip of sand across the water, with two rows of small bare footprints.
	causeway: ({ m }) => {
		let s = `<g><path d="M-20 360 L40 302 Q300 278 520 262 L560 266 Q330 298 150 360Z" fill="${m.wave}" opacity=".16"/>`;
		[
			[96, 332],
			[176, 319],
			[256, 307],
			[336, 296],
			[416, 286],
		].forEach(([x, y], i) => {
			s += `<g class="flk" style="--d:${(i * 0.5).toFixed(1)}s"><ellipse cx="${x}" cy="${y}" rx="3.2" ry="1.7" fill="${m.land}"/><ellipse cx="${x + 9}" cy="${y - 2}" rx="3.2" ry="1.7" fill="${m.land}"/></g>`;
		});
		return s + "</g>";
	},

	village: ({ m, r }) => {
		let s = "<g>";
		let x = 20;
		while (x < 330) {
			const w = 34 + r() * 22;
			const h = 24 + r() * 20;
			const top = 270 - h;
			s +=
				`<rect x="${n0(x)}" y="${n0(top)}" width="${n0(w)}" height="${n0(h)}" fill="${m.land}"/>` +
				`<polygon points="${n0(x - 4)},${n0(top)} ${n0(x + w / 2)},${n0(top - 18)} ${n0(x + w + 4)},${n0(top)}" fill="${m.land}"/>`;
			if (r() > 0.35) {
				s += `<rect class="flk" style="--d:${(r() * 3).toFixed(1)}s" x="${n0(x + w / 2 - 4)}" y="${n0(top + 7)}" width="8" height="9" fill="#ffcf70"/>`;
			}
			x += w + 8 + r() * 14;
		}
		return (
			s +
			`<path d="M0 268 L345 268 L395 305 L395 360 L0 360Z" fill="${m.land}"/></g>`
		);
	},

	cliff: ({ m }) =>
		`<path d="M505 360 L548 268 Q588 210 640 203 Q720 198 800 190 L800 360Z" fill="${m.land}"/>`,

	lighthouse: ({ m }) => {
		const L = (y) => (632 + ((202 - y) * 8) / 107).toFixed(1);
		const R = (y) => (668 - ((202 - y) * 8) / 107).toFixed(1);
		const band = (a, b) =>
			`<polygon points="${L(a)},${a} ${R(a)},${a} ${R(b)},${b} ${L(b)},${b}" fill="#c0392b" opacity=".92"/>`;
		return (
			`<g><polygon points="632,202 668,202 660,95 640,95" fill="${m.tower}"/>${band(172, 150)}${band(130, 110)}` +
			`<rect x="634" y="88" width="32" height="7" fill="${m.land}"/>` +
			`<rect class="flk" x="643" y="68" width="14" height="20" fill="#ffd97a"/>` +
			`<polygon points="639,68 661,68 650,52" fill="#8e2b21"/><rect x="649" y="40" width="2" height="12" fill="${m.land}"/></g>`
		);
	},

	beam: ({ id }) =>
		`<polygon class="beamA" points="650,78 -60,20 -60,150" fill="url(#bl${id})"/>` +
		`<polygon class="beamB" points="650,78 860,40 860,120" fill="url(#br${id})"/>`,

	boat: ({ m }) =>
		`<g class="bob"><path d="M215 292 L305 292 L292 310 L228 310Z" fill="${m.land}"/>` +
		`<rect x="258" y="255" width="3" height="37" fill="${m.land}"/><path d="M263 258 L293 288 L263 288Z" fill="#e7dfc9"/>` +
		`<circle class="flk" cx="259" cy="253" r="3.5" fill="#ffd97a"/></g>`,

	house: ({ m, r }) => {
		const win = (x, y, lit) =>
			`<rect ${lit ? `class="flk" style="--d:${(r() * 3).toFixed(1)}s"` : ""} x="${x}" y="${y}" width="22" height="30" fill="${lit ? "#ffcf70" : "#10131f"}"/>`;
		return (
			`<g><rect y="288" width="800" height="72" fill="${m.land}"/>` +
			`<rect x="150" y="170" width="200" height="120" fill="${m.land}"/><polygon points="135,172 250,105 365,172" fill="${m.land}"/>` +
			`<rect x="305" y="122" width="18" height="42" fill="${m.land}"/>` +
			`<circle class="flk" cx="250" cy="144" r="9" fill="#ffcf70"/>` +
			win(175, 192, true) +
			win(225, 192, true) +
			win(285, 192, false) +
			win(175, 238, true) +
			win(285, 238, false) +
			`<rect x="232" y="240" width="36" height="50" fill="#10131f"/><circle cx="262" cy="266" r="2" fill="#ffcf70"/></g>`
		);
	},

	trees: ({ m, r }) => {
		const pine = (x, y, s, d) =>
			`<g class="sway" style="--d:${d}s"><rect x="${x - 3 * s}" y="${y}" width="${6 * s}" height="${22 * s}" fill="${m.land}"/>` +
			`<polygon points="${x},${y - 110 * s} ${x - 26 * s},${y - 60 * s} ${x + 26 * s},${y - 60 * s}" fill="${m.land}"/>` +
			`<polygon points="${x},${y - 80 * s} ${x - 34 * s},${y - 26 * s} ${x + 34 * s},${y - 26 * s}" fill="${m.land}"/>` +
			`<polygon points="${x},${y - 48 * s} ${x - 42 * s},${y + 2 * s} ${x + 42 * s},${y + 2 * s}" fill="${m.land}"/></g>`;
		let s = `<path d="M0 322 Q200 292 400 316 T800 306 L800 360 L0 360Z" fill="${m.land}"/>`;
		[
			[34, 1.1],
			[98, 0.8],
			[690, 0.75],
			[742, 1.05],
			[790, 0.85],
		].forEach(([x, sc]) => {
			s += pine(x, 300, sc, -(r() * 3).toFixed(1));
		});
		return s;
	},

	// The torn treasure map on a dark wooden table, lit from the side, with its missing corner lying apart.
	map: ({ id }) => {
		const ink = "#5a3f24";
		const tear = [
			[492, 52],
			[485, 74],
			[494, 96],
			[483, 122],
			[493, 146],
			[484, 174],
			[494, 200],
			[485, 228],
			[492, 262],
		];
		const edge = tear.map(([x, y]) => `L${x} ${y}`).join(" ");
		let planks = "";
		for (let y = 30; y < 380; y += 46)
			planks += `<path d="M0 ${y} L800 ${y + 2}" stroke="#0b0705" stroke-width="3" opacity=".7"/>`;
		return (
			`<g>` +
			`<rect width="800" height="360" fill="#1a110c"/>` +
			planks +
			`<ellipse class="flk" cx="380" cy="150" rx="300" ry="210" fill="url(#warm${id})"/>` +
			`<g transform="translate(54,22) scale(.85)">` +
			`<path d="M268 58 L492 58 ${edge.replace("L492 52 ", "")} L262 270Z" fill="#000" opacity=".45" transform="translate(7,9)"/>` +
			`<path d="M262 52 ${edge} L262 268Z" fill="#d8bd8a"/>` +
			`<path d="M262 52 ${edge} L262 268Z" fill="none" stroke="#b08d58" stroke-width="3" opacity=".7"/>` +
			`<path d="M262 52 L492 52 L492 70 L262 90Z" fill="#fff" opacity=".07"/>` +
			`<g fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round">` +
			`<path d="M276 96 q10 -6 20 0 t20 0 M300 114 q10 -6 20 0 t20 0 M338 84 q10 -6 20 0 t20 0 M290 132 q10 -6 20 0 t20 0" opacity=".7"/>` +
			`<path d="M262 160 Q300 138 336 156 T398 148 Q432 130 460 166 T492 158" stroke-width="2.6"/>` +
			`<path d="M338 156 Q372 122 410 142" stroke-width="3.4"/>` +
			`<path d="M388 150 L388 134 L418 134 L418 150Z" fill="#c9a96e" stroke-width="2.4"/>` +
			`<path d="M272 196 l8 -8 l8 8 v10 h-16z M296 200 l8 -8 l8 8 v10 h-16z M322 190 l8 -8 l8 8 v10 h-16z" stroke-width="1.8"/>` +
			`<path d="M452 196 v-18 M446 184 h12" stroke-width="2.4"/>` +
			`<path d="M276 238 h60 M276 248 h86 M276 258 h44" opacity=".55" stroke-width="2"/>` +
			`<circle cx="296" cy="72" r="13" stroke-width="1.6"/><path d="M296 56 v32 M280 72 h32" stroke-width="1.6"/><path d="M296 58 l-4 10 h8z" fill="${ink}" stroke="none"/>` +
			`</g>` +
			`<path d="M403 154 Q424 190 452 204 T492 214" fill="none" stroke="#9c2f22" stroke-width="2.6" stroke-dasharray="2 6" stroke-linecap="round"/>` +
			`<g transform="translate(14,10) rotate(7 520 210)">` +
			`<path d="M500 168 L514 184 L503 204 L517 226 L507 248 L540 256 L552 196 L538 172Z" fill="#000" opacity=".4" transform="translate(5,7)"/>` +
			`<path d="M500 168 L514 184 L503 204 L517 226 L507 248 L540 256 L552 196 L538 172Z" fill="#d8bd8a" stroke="#b08d58" stroke-width="2.4"/>` +
			`<path d="M522 204 l16 16 M538 204 l-16 16" stroke="#9c2f22" stroke-width="4.2" stroke-linecap="round"/>` +
			`</g>` +
			`</g></g>`
		);
	},

	tunnel: ({ id, r }) => {
		let tex = "";
		for (let i = 0; i < 26; i++) {
			const left = r() > 0.5;
			const x = left ? r() * 150 : 650 + r() * 150;
			const y = r() * 340;
			tex += `<path d="M${n0(x)} ${n0(y)} q${n0(10 + r() * 20)} ${n0(-6 + r() * 12)} ${n0(20 + r() * 30)} ${n0(r() * 8)}" stroke="#262332" stroke-width="2" fill="none"/>`;
		}
		return (
			`<g><circle class="pulse" cx="400" cy="218" r="70" fill="url(#tg${id})"/>` +
			`<path d="M0 0 L800 0 L800 360 L650 360 Q610 215 540 165 Q400 85 260 165 Q190 215 150 360 L0 360Z" fill="#15131c"/>${tex}` +
			`<path d="M150 360 Q400 292 650 360Z" fill="#1d1b27"/></g>`
		);
	},

	// Inside the tower: a spiral stair with the beam sweeping through the slit windows.
	stairs: ({ r }) => {
		let s =
			'<rect width="800" height="360" fill="#0c0d16"/><rect x="385" width="30" height="360" fill="#10121c"/>';
		for (let i = 0; i < 14; i++) {
			const y = 340 - i * 22;
			const x0 = (i % 2 ? 235 : 335) + (r() * 12 - 6);
			s += `<rect x="${n0(x0)}" y="${y}" width="230" height="9" fill="#2a2e42"/><rect x="${n0(x0)}" y="${y + 9}" width="230" height="5" fill="#181b29"/>`;
		}
		s +=
			'<rect class="beamA" x="110" y="40" width="26" height="150" fill="#fff6c8"/><rect class="beamB" x="664" y="90" width="26" height="150" fill="#fff6c8"/>';
		s +=
			'<polygon class="beamA" points="136,60 400,250 400,330 136,150" fill="#fff6c8" opacity=".25"/>';
		return s;
	},

	// The lamp room: the great lens, its brass frame, and pale faces pressed into the glass.
	lens: ({ id, r }) => {
		let s = '<rect width="800" height="360" fill="#080912"/>';
		for (let i = 0; i < 5; i++) {
			const x = 40 + i * 160;
			s += `<path d="M${x} 250 L${x} 120 Q${x + 40} 70 ${x + 80} 120 L${x + 80} 250Z" fill="#0f1730" stroke="#1c274d" stroke-width="3"/>`;
		}
		s += '<rect y="250" width="800" height="110" fill="#10131e"/>';
		s += `<circle class="pulse" cx="400" cy="178" r="150" fill="url(#lg${id})"/>`;
		[118, 92, 66, 40].forEach((rad, i) => {
			s += `<circle cx="400" cy="178" r="${rad}" fill="none" stroke="#c9a24a" stroke-opacity="${(0.85 - i * 0.12).toFixed(2)}" stroke-width="${i === 0 ? 5 : 3}"/>`;
		});
		s += '<circle cx="400" cy="178" r="30" fill="#fffbe0"/>';
		for (let a = 0; a < 8; a++) {
			const ang = (a * Math.PI) / 8;
			s += `<line x1="${n0(400 - 118 * Math.cos(ang))}" y1="${n0(178 - 118 * Math.sin(ang))}" x2="${n0(400 + 118 * Math.cos(ang))}" y2="${n0(178 + 118 * Math.sin(ang))}" stroke="#c9a24a" stroke-opacity=".5" stroke-width="2"/>`;
		}
		[
			[345, 125],
			[455, 128],
			[316, 185],
			[484, 182],
			[350, 238],
			[452, 236],
			[400, 108],
			[400, 248],
		].forEach(([x, y], i) => {
			s +=
				`<g class="tw" style="--d:${(i * 0.6).toFixed(1)}s"><ellipse cx="${x}" cy="${y}" rx="11" ry="14" fill="#dfe8ff" opacity=".6"/>` +
				`<circle cx="${x - 4}" cy="${y - 3}" r="1.8" fill="#10131e"/><circle cx="${x + 4}" cy="${y - 3}" r="1.8" fill="#10131e"/><ellipse cx="${x}" cy="${y + 5}" rx="2.5" ry="3.4" fill="#10131e"/></g>`;
		});
		s += '<rect x="360" y="262" width="80" height="22" fill="#8a6a2a"/>';
		return s;
	},

	// A tall dripping figure with one small flame where its face should be.
	keeper: ({ id }) =>
		`<g><path d="M566 336 Q578 204 612 172 Q646 204 658 336Z" fill="#04050a"/><circle cx="612" cy="168" r="25" fill="#04050a"/>` +
		`<circle class="flk" cx="612" cy="170" r="20" fill="url(#warm${id})"/><ellipse class="flame" cx="612" cy="171" rx="5" ry="9" fill="#ffd27a"/></g>`,

	glow: ({ id }) =>
		`<g><circle class="flk" cx="170" cy="215" r="130" fill="url(#warm${id})"/>` +
		`<rect x="165" y="222" width="10" height="56" rx="3" fill="#4a3a2a"/>` +
		`<ellipse class="flame" cx="170" cy="210" rx="9" ry="16" fill="#ffb13b"/><ellipse class="flame" cx="170" cy="214" rx="4.5" ry="9" fill="#fff0b3"/></g>`,

	fog: ({ id }) =>
		`<g filter="url(#blur${id})" fill="#dfe8ff">` +
		[
			[150, 300, 260, 26, 0.26, 20],
			[460, 275, 300, 24, 0.2, 26],
			[690, 310, 260, 28, 0.24, 17],
			[300, 335, 320, 22, 0.2, 22],
		]
			.map(
				([x, y, rx, ry, o, t]) =>
					`<ellipse class="fog" style="--t:${t}s" cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" opacity="${o}"/>`,
			)
			.join("") +
		"</g>",

	rain: ({ r }) => {
		let s =
			'<g stroke="#cfe3ff" stroke-opacity=".5" stroke-width="1.4" stroke-linecap="round">';
		for (let i = 0; i < 70; i++) {
			const x = n0(r() * 860);
			s += `<line class="rain" style="--d:-${r().toFixed(2)}s;--t:${(0.7 + r() * 0.5).toFixed(2)}s" x1="${x}" y1="-20" x2="${x - 4}" y2="-4"/>`;
		}
		return s + "</g>";
	},
};

export const SCENE_ELEMENTS = Object.keys(DRAW);
export const SCENE_MOODS = Object.keys(MOODS);

export function sceneHTML(def = {}, opts = {}) {
	const id = ++uid;
	const m = MOODS[def.mood] || MOODS.night;
	const els = new Set(def.elements || []);
	const r = rng(def.seed ?? hash(`${def.mood}|${[...els].join(",")}`));

	const defs =
		`<defs>` +
		`<linearGradient id="sky${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${m.sky[0]}"/><stop offset="1" stop-color="${m.sky[1]}"/></linearGradient>` +
		`<radialGradient id="mg${id}"><stop offset="0" stop-color="#fff6c8" stop-opacity=".5"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></radialGradient>` +
		`<linearGradient id="bl${id}" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#fff6c8" stop-opacity=".85"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></linearGradient>` +
		`<linearGradient id="br${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff6c8" stop-opacity=".85"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></linearGradient>` +
		`<radialGradient id="warm${id}"><stop offset="0" stop-color="#ffb347" stop-opacity=".55"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>` +
		`<radialGradient id="lg${id}"><stop offset="0" stop-color="#fffbe0" stop-opacity=".9"/><stop offset=".5" stop-color="#ffe9a0" stop-opacity=".35"/><stop offset="1" stop-color="#ffe9a0" stop-opacity="0"/></radialGradient>` +
		`<radialGradient id="tg${id}"><stop offset="0" stop-color="#bfe9ff" stop-opacity=".8"/><stop offset="1" stop-color="#bfe9ff" stop-opacity="0"/></radialGradient>` +
		`<filter id="blur${id}" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="12"/></filter>` +
		`</defs>`;

	let body = `<rect width="800" height="360" fill="url(#sky${id})"/>`;
	for (const name of ORDER) {
		if (els.has(name)) body += DRAW[name]({ id, m, r });
	}
	for (const name of els) {
		if (!DRAW[name]) console.warn("[scenes] unknown element:", name);
	}

	const label = def.alt
		? `role="img" aria-label="${esc(def.alt)}"`
		: 'aria-hidden="true"';
	return `<figure class="scene${opts.static ? " static" : ""}"><svg viewBox="0 0 800 360" preserveAspectRatio="${def.align || "xMidYMid"} slice" ${label}>${defs}${body}</svg></figure>`;
}
