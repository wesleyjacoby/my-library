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
	"sun",
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
	"hall",
	"farm",
	"mill",
	"stones",
	"bull",
	"bunting",
	"cake",
	"cart",
	"sleepwalker",
	"map",
	"shop",
	"attic",
	"crates",
	"mud",
	"chamber",
	"shaft",
	"bell",
	"bench",
	"dinghy",
	"headlamps",
	"tunnel",
	"stairs",
	"shadow",
	"flare",
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

	// ---- Smugglers' Tunnel kit: flat, minimal, no figures ----

	// The Old Rope Shop front: crooked sign, glowing window of lanterns, door with a bell over it.
	shop: ({ id, m }) => {
		let lanterns = "";
		[
			[278, 200],
			[304, 214],
			[330, 200],
			[356, 214],
		].forEach(([x, y]) => {
			lanterns += `<line x1="${x}" y1="186" x2="${x}" y2="${y - 6}" stroke="#2a1d12" stroke-width="2"/><rect x="${x - 6}" y="${y - 6}" width="12" height="16" rx="3" fill="#ffc86b"/>`;
		});
		return (
			`<g>` +
			`<rect x="0" y="296" width="800" height="64" fill="${m.land}"/>` +
			`<path d="M215 300 L215 150 L400 84 L585 150 L585 300Z" fill="${m.land}"/>` +
			`<path d="M205 154 L400 80 L595 154" fill="none" stroke="${m.far}" stroke-width="8" stroke-linejoin="round"/>` +
			`<rect x="260" y="176" width="112" height="86" rx="4" fill="#ffd98a" opacity=".92"/>` +
			`<ellipse class="flk" cx="316" cy="230" rx="130" ry="90" fill="url(#warm${id})"/>` +
			`<rect x="260" y="176" width="112" height="86" rx="4" fill="none" stroke="#1b1208" stroke-width="5"/><path d="M316 176 V262 M260 219 H372" stroke="#1b1208" stroke-width="3"/>` +
			lanterns +
			`<rect x="438" y="196" width="62" height="104" rx="3" fill="#0e0a07"/><circle cx="487" cy="250" r="3" fill="#d6a74e"/>` +
			`<path d="M462 176 q-7 0 -7 12 l14 0 q0 -12 -7 -12z" fill="#c9a24a"/><line x1="462" y1="170" x2="462" y2="176" stroke="#c9a24a" stroke-width="2"/>` +
			`<g transform="rotate(-4 400 142)"><rect x="340" y="128" width="116" height="26" rx="3" fill="#2a1d12"/><circle cx="360" cy="141" r="6" fill="none" stroke="#d6a74e" stroke-width="2.4"/><circle cx="360" cy="141" r="2.4" fill="#d6a74e"/><path d="M376 141 H440" stroke="#d6a74e" stroke-width="2.4" stroke-dasharray="10 5"/></g>` +
			`<circle cx="540" cy="284" r="14" fill="none" stroke="#8a6a3a" stroke-width="5"/><circle cx="540" cy="284" r="6" fill="none" stroke="#8a6a3a" stroke-width="4"/>` +
			`</g>`
		);
	},

	// Inside the attic: a round window with the moonlit harbour in it, three beds below, one lantern.
	attic: ({ id, m }) => {
		return (
			`<g>` +
			`<rect width="800" height="360" fill="#120e18"/>` +
			`<path d="M0 0 L800 0 L800 40 L400 118 L0 40Z" fill="#0b0810"/><path d="M0 40 L400 118 L800 40" fill="none" stroke="#2a2030" stroke-width="6"/>` +
			`<clipPath id="aw${id}"><circle cx="400" cy="178" r="84"/></clipPath>` +
			`<g clip-path="url(#aw${id})"><rect x="300" y="90" width="200" height="180" fill="url(#sky${id})"/>` +
			`<circle cx="446" cy="132" r="14" fill="#f7f1d0"/><rect x="300" y="196" width="200" height="80" fill="#0a1330"/>` +
			`<path d="M300 226 H500" stroke="#1a2a5a" stroke-width="2"/>` +
			`<circle cx="352" cy="214" r="2.6" fill="#ffc86b"/><circle cx="388" cy="218" r="2.6" fill="#ffc86b"/><circle cx="424" cy="214" r="2.6" fill="#ffc86b"/>` +
			`<path d="M330 230 l22 0 l-4 8 l-14 0z M440 232 l24 0 l-4 8 l-16 0z" fill="#03050c"/></g>` +
			`<circle cx="400" cy="178" r="86" fill="none" stroke="#3a2a1a" stroke-width="10"/><path d="M400 92 V264 M314 178 H486" stroke="#3a2a1a" stroke-width="6"/>` +
			`<path d="M60 360 L60 290 Q60 270 90 270 L250 270 Q270 270 270 290 L270 360Z M300 360 L300 296 Q300 278 326 278 L474 278 Q496 278 496 296 L496 360Z M530 360 L530 290 Q530 270 560 270 L720 270 Q740 270 740 290 L740 360Z" fill="#0a0710"/>` +
			`<ellipse class="flk" cx="400" cy="318" rx="130" ry="46" fill="url(#warm${id})"/>` +
			`<rect x="390" y="296" width="20" height="28" rx="4" fill="#ffc86b"/><path d="M390 296 q10 -12 20 0" fill="none" stroke="#c9a24a" stroke-width="3"/>` +
			`</g>`
		);
	},

	// The quay at night: stacked crates, one shaded lantern with its pool of light, lobster pots, the boathouse beyond.
	crates: ({ id, m }) => {
		const crate = (x, y, w, h) =>
			`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#1a130d"/><path d="M${x} ${y + h / 2} H${x + w} M${x + w / 3} ${y} V${y + h} M${x + (2 * w) / 3} ${y} V${y + h}" stroke="#0a0705" stroke-width="2.4"/>`;
		return (
			`<g>` +
			`<rect x="0" y="206" width="800" height="62" fill="${m.sea}"/>` +
			`<path d="M0 214 H800 M0 232 H800 M0 250 H800" stroke="${m.wave}" stroke-width="1.4" opacity=".22"/>` +
			`<path d="M70 206 L70 150 L110 128 L170 128 L210 150 L210 206Z" fill="${m.land}"/><rect x="128" y="168" width="24" height="38" fill="#0a0a12"/>` +
			`<rect x="0" y="262" width="800" height="98" fill="${m.land}"/><path d="M0 262 H800" stroke="${m.far}" stroke-width="4"/>` +
			`<ellipse class="flk" cx="330" cy="304" rx="170" ry="40" fill="url(#warm${id})"/>` +
			crate(470, 236, 58, 40) +
			crate(530, 252, 50, 36) +
			crate(486, 196, 50, 40) +
			crate(580, 240, 62, 46) +
			crate(600, 198, 54, 44) +
			`<rect x="318" y="270" width="26" height="30" rx="3" fill="#0a0705"/><rect x="322" y="276" width="18" height="16" fill="#ffc86b"/><path d="M318 270 q13 -14 26 0" fill="none" stroke="#0a0705" stroke-width="4"/>` +
			`<path d="M120 336 q0 -34 36 -34 q36 0 36 34Z M672 340 q0 -30 30 -30 q30 0 30 30Z" fill="#0a0705"/><path d="M138 336 V312 M156 336 V304 M174 336 V312 M684 340 V320 M702 340 V312 M720 340 V320" stroke="#1a130d" stroke-width="2.4"/>` +
			`</g>`
		);
	},

	// The old iron bell on its post at the end of the quay, with the stone slab and its ring below it.
	bell: ({ id, m }) =>
		`<g>` +
		`<rect x="0" y="236" width="800" height="124" fill="${m.sea}"/><path d="M0 248 H800 M0 266 H800" stroke="${m.wave}" stroke-width="1.4" opacity=".22"/>` +
		`<rect x="0" y="296" width="800" height="64" fill="${m.land}"/><path d="M0 296 H800" stroke="${m.far}" stroke-width="4"/>` +
		`<rect x="372" y="318" width="56" height="34" rx="3" fill="${m.far}"/><circle cx="400" cy="335" r="7" fill="none" stroke="#8a8f99" stroke-width="3"/>` +
		`<path d="M395 142 H405 V296 H395Z" fill="#0b1210"/><path d="M340 142 H460" stroke="#0b1210" stroke-width="8"/>` +
		`<path d="M366 190 Q366 146 400 142 Q434 146 434 190 L444 204 H356Z" fill="#26413a"/><path d="M376 190 Q378 158 396 150" fill="none" stroke="#4d7a6c" stroke-width="3" opacity=".7"/>` +
		`<circle cx="400" cy="210" r="6" fill="#0b1210"/>` +
		`</g>`,

	// The harbour floor at low tide: wet mud, boats on their sides, a plank path to the boathouse.
	mud: ({ id, m }) => {
		const hull = (x, y, s, t) =>
			`<g transform="translate(${x},${y}) scale(${s}) rotate(${t})"><path d="M-40 0 Q0 24 40 0 L34 -8 Q0 8 -34 -8Z" fill="#05070f"/><path d="M-4 -6 L-2 -46" stroke="#05070f" stroke-width="3"/></g>`;
		return (
			`<g>` +
			`<rect x="0" y="176" width="800" height="184" fill="#1d2133"/>` +
			`<path d="M0 214 H800 M0 244 H800 M0 284 H800 M0 330 H800" stroke="${m.wave}" stroke-width="2" opacity=".18"/>` +
			`<path d="M560 176 L640 176 L640 140 L600 118 L560 140Z" fill="#05070f"/><rect x="590" y="146" width="22" height="30" fill="#ffc86b" opacity=".85"/>` +
			`<polygon points="392,360 436,360 612,178 598,178" fill="#3a2d22"/>` +
			`<path d="M404 336 H438 M430 300 H466 M476 268 H508 M520 238 H548 M556 212 H580 M584 192 H602" stroke="#1a130d" stroke-width="2.4"/>` +
			hull(150, 236, 1, -8) +
			hull(300, 210, 0.7, 6) +
			hull(220, 300, 1.3, -5) +
			hull(700, 256, 1.1, 9) +
			hull(470, 214, 0.6, -6) +
			`</g>`
		);
	},

	// The crate chamber under the harbour: vaulted roof, crate stacks, one hanging lamp over a table with a ledger.
	chamber: ({ id, m }) => {
		const stack = (x, w) => {
			let s = "";
			for (let row = 0; row < 4; row++)
				for (let c = 0; c < 2; c++) {
					const cw = w / 2,
						cx = x + c * cw,
						cy = 330 - (row + 1) * 36;
					s += `<rect x="${cx}" y="${cy}" width="${cw - 2}" height="34" fill="#16110d"/><path d="M${cx} ${cy + 17} H${cx + cw - 2}" stroke="#070504" stroke-width="2"/>`;
				}
			return s;
		};
		return (
			`<g>` +
			`<rect width="800" height="360" fill="#07080e"/>` +
			`<path d="M0 360 V150 Q400 -40 800 150 V360Z" fill="#0b0d16"/>` +
			`<path d="M60 360 V160 Q400 -10 740 160 V360 M170 360 V176 Q400 40 630 176 V360" fill="none" stroke="#1a1c2a" stroke-width="5"/>` +
			`<path d="M0 330 H800 V360 H0Z" fill="#0e1018"/><path d="M0 338 H800" stroke="${m.wave}" stroke-width="1.6" opacity=".25"/>` +
			`<path d="M360 300 V230 Q360 196 400 196 Q440 196 440 230 V300Z" fill="#020308"/>` +
			stack(70, 150) +
			stack(580, 150) +
			`<line x1="400" y1="0" x2="400" y2="132" stroke="#2a2430" stroke-width="2"/><path d="M386 142 Q400 112 414 142Z" fill="#2a2430"/><circle cx="400" cy="144" r="5" fill="#fff0b3"/>` +
			`<ellipse class="flk" cx="400" cy="230" rx="170" ry="130" fill="url(#warm${id})"/>` +
			`<rect x="352" y="268" width="96" height="10" fill="#2a1d12"/><path d="M364 278 V330 M436 278 V330" stroke="#2a1d12" stroke-width="5"/>` +
			`<path d="M372 268 L400 262 L428 268 L428 258 L400 252 L372 258Z" fill="#f1e2b8"/><path d="M400 252 V264" stroke="#5a3f24" stroke-width="2"/>` +
			`</g>`
		);
	},

	// Looking straight up the Back Way: ladder, one broken rung, the bell in the square of sky, water coming in below.
	shaft: ({ id, m }) => {
		let rungs = "";
		for (let i = 0; i < 11; i++) {
			const y = 300 - i * 24;
			rungs +=
				i === 2
					? `<path d="M386 ${y + 2} L398 ${y + 12} M414 ${y + 2} L404 ${y + 12}" stroke="#7a6a58" stroke-width="3.4" stroke-linecap="round"/>`
					: `<path d="M386 ${y} H414" stroke="#7a6a58" stroke-width="3.4" stroke-linecap="round"/>`;
		}
		let bricks = "";
		for (let y = 40; y < 340; y += 28)
			bricks += `<path d="M300 ${y} H500" stroke="#161822" stroke-width="2"/>`;
		return (
			`<g>` +
			`<rect width="800" height="360" fill="#04050a"/>` +
			`<rect x="300" y="0" width="200" height="360" fill="#0d0f18"/>` +
			bricks +
			`<path d="M300 0 V360 M500 0 V360" stroke="#04050a" stroke-width="10"/>` +
			`<rect x="350" y="0" width="100" height="44" fill="#8b97b8"/><rect x="350" y="0" width="100" height="44" fill="url(#lg${id})" opacity=".4"/>` +
			`<path d="M388 38 Q388 14 400 12 Q412 14 412 38 L416 42 H384Z" fill="#26413a"/>` +
			`<path d="M386 40 V320 M414 40 V320" stroke="#7a6a58" stroke-width="4"/>` +
			rungs +
			`<rect x="300" y="300" width="200" height="60" fill="${m.sea}"/><path d="M300 312 q25 -8 50 0 t50 0 t50 0 t50 0" fill="none" stroke="${m.wave}" stroke-width="2" opacity=".6"/>` +
			`</g>`
		);
	},

	// Headlamps of the lorry coming down the quay: two pale beams from the right edge.
	headlamps: () =>
		`<g><polygon points="800,206 250,170 250,290 800,250" fill="#fff6c8" opacity=".1"/>` +
		`<polygon points="800,214 320,196 320,262 800,242" fill="#fff6c8" opacity=".12"/>` +
		`<circle class="flk" cx="796" cy="214" r="22" fill="#fffbe0" opacity=".85"/><circle class="flk" cx="796" cy="246" r="22" fill="#fffbe0" opacity=".85"/></g>`,

	// A small rowing boat drifting out past the harbour mouth.
	dinghy: ({ m }) =>
		`<g class="bob"><path d="M590 252 L650 252 L640 266 L600 266Z" fill="${m.land}"/><path d="M596 250 L574 238 M644 250 L666 238" stroke="${m.land}" stroke-width="2.4" stroke-linecap="round"/></g>`,

	// Mr Fenn's empty bench on the harbour wall: net over the arm, tin of biscuits on the seat.
	bench: ({ m }) =>
		`<g>` +
		`<rect x="0" y="226" width="800" height="70" fill="${m.sea}"/><path d="M0 240 H800 M0 258 H800" stroke="${m.wave}" stroke-width="1.4" opacity=".3"/>` +
		`<rect x="0" y="292" width="800" height="68" fill="${m.land}"/><path d="M0 292 H800" stroke="${m.far}" stroke-width="4"/>` +
		`<rect x="300" y="250" width="200" height="12" rx="3" fill="#1b130c"/><rect x="300" y="214" width="200" height="8" rx="3" fill="#1b130c"/><path d="M312 262 V294 M488 262 V294 M312 222 V250 M488 222 V250" stroke="#1b130c" stroke-width="7"/>` +
		`<path d="M300 228 Q282 256 296 296 L330 296 Q322 262 336 244Z" fill="none" stroke="#2a2232" stroke-width="3"/><path d="M290 244 H330 M288 262 H326 M290 280 H322 M300 232 V296 M312 236 V296" stroke="#2a2232" stroke-width="1.6" opacity=".8"/>` +
		`<rect x="424" y="236" width="30" height="14" rx="2" fill="#d6a74e"/><path d="M424 242 H454" stroke="#8a6a3a" stroke-width="2"/>` +
		`</g>`,

	// ---- The Great Cake Chase kit ----

	// The village hall: a squat building with a lit window, double doors, a clock and a small bell turret.
	hall: ({ m }) =>
		`<g><rect y="288" width="800" height="72" fill="${m.land}"/>` +
		`<rect x="230" y="190" width="340" height="100" fill="${m.land}"/><polygon points="214,192 400,120 586,192" fill="${m.land}"/>` +
		`<rect x="388" y="84" width="24" height="44" fill="${m.land}"/><polygon points="384,86 400,62 416,86" fill="${m.land}"/>` +
		`<circle cx="400" cy="162" r="14" fill="#f1e6c4"/><path d="M400 152 V162 H407" stroke="#2a2118" stroke-width="2" fill="none"/>` +
		`<rect class="flk" x="262" y="214" width="34" height="40" fill="#ffcf70"/><rect class="flk" x="504" y="214" width="34" height="40" fill="#ffcf70"/>` +
		`<path d="M279 214 V254 M262 234 H296 M521 214 V254 M504 234 H538" stroke="#10131f" stroke-width="2.4"/>` +
		`<rect x="372" y="226" width="56" height="64" fill="#10131f"/><path d="M400 226 V290" stroke="${m.land}" stroke-width="2.4"/></g>`,

	// A string of small flags across the picture.
	bunting: () => {
		const cols = ["#d9534f", "#f0ad4e", "#5cb85c", "#5bc0de", "#e86a9a"];
		let s =
			'<g><path d="M-10 60 Q200 130 400 70 T810 62" fill="none" stroke="#2a2118" stroke-width="2.4"/>';
		for (let i = 0; i < 17; i++) {
			const x = 20 + i * 47;
			const t = x / 800;
			const y =
				60 +
				60 * Math.sin(t * Math.PI * 2 * 0.5 + 0.2) * (x < 400 ? 1 : 0.5) * 0.9;
			s += `<polygon class="sway" style="--d:${(i * 0.3).toFixed(1)}s" points="${x - 11},${n0(y)} ${x + 11},${n0(y)} ${x},${n0(y + 26)}" fill="${cols[i % cols.length]}"/>`;
		}
		return s + "</g>";
	},

	// A pale figure in a nightcap and long nightshirt, arms out in front, small and calm.
	sleepwalker: () =>
		`<g><ellipse cx="560" cy="312" rx="42" ry="7" fill="#000" opacity=".25"/>` +
		`<path d="M536 306 L544 214 Q560 204 576 214 L584 306Z" fill="#dfe6fa" stroke="#9aa6c8" stroke-width="2"/>` +
		`<circle cx="560" cy="196" r="14" fill="#f0e2d0"/><path d="M546 192 Q548 168 568 176 L580 168 Q582 186 574 194Z" fill="#9aa6c8"/><circle cx="582" cy="167" r="4" fill="#dfe6fa"/>` +
		`<path d="M546 190 H554 M566 190 H574" stroke="#2a2118" stroke-width="2"/>` +
		`<path d="M544 224 L506 232 M576 224 L520 238" stroke="#dfe6fa" stroke-width="7" stroke-linecap="round"/>` +
		`<rect x="546" y="306" width="10" height="10" fill="#c0392b"/><rect x="566" y="306" width="10" height="10" fill="#4a6fa5"/></g>`,

	// A field on the way to the mill: fence, barn, a few sleeping sheep and a scarecrow.
	farm: ({ m }) => {
		const sheep = (x, y) =>
			`<g><ellipse cx="${x}" cy="${y}" rx="22" ry="14" fill="#e8e4d8"/><ellipse cx="${x - 20}" cy="${y + 4}" rx="9" ry="8" fill="#2a2118"/><rect x="${x - 12}" y="${y + 10}" width="4" height="8" fill="#2a2118"/><rect x="${x + 8}" y="${y + 10}" width="4" height="8" fill="#2a2118"/></g>`;
		let fence = "";
		for (let x = 20; x < 380; x += 36)
			fence += `<rect x="${x}" y="244" width="6" height="44" fill="${m.land}"/>`;
		return (
			`<g><rect y="288" width="800" height="72" fill="${m.land}"/>` +
			`<rect x="470" y="196" width="130" height="94" fill="${m.land}"/><polygon points="456,198 535,148 614,198" fill="${m.land}"/><rect x="510" y="236" width="50" height="54" fill="#10131f"/>` +
			fence +
			`<path d="M14 256 H386 M14 274 H386" stroke="${m.land}" stroke-width="5"/>` +
			sheep(110, 318) +
			sheep(220, 330) +
			sheep(330, 316) +
			`<g transform="translate(690,0)"><path d="M0 214 V300" stroke="${m.land}" stroke-width="5"/><path d="M-30 236 H30" stroke="${m.land}" stroke-width="5"/><path d="M-14 232 L14 232 L10 266 L-10 266Z" fill="${m.far}"/>` +
			`<path d="M-14 204 L-10 192 H10 L14 204 Z" fill="${m.land}"/><rect x="-10" y="204" width="20" height="14" fill="#c9b27a"/></g></g>`
		);
	},

	// The mill: a stone building with a tall water wheel, a lit window and the brook underneath.
	mill: ({ m }) => {
		let spokes = "";
		for (let a = 0; a < 180; a += 30) {
			const c = Math.cos((a * Math.PI) / 180),
				s2 = Math.sin((a * Math.PI) / 180);
			spokes += `<line x1="${n0(560 - 70 * c)}" y1="${n0(230 - 70 * s2)}" x2="${n0(560 + 70 * c)}" y2="${n0(230 + 70 * s2)}" stroke="${m.land}" stroke-width="5"/>`;
		}
		return (
			`<g><rect y="286" width="800" height="74" fill="${m.land}"/>` +
			`<rect x="250" y="160" width="230" height="130" fill="${m.land}"/><polygon points="236,162 365,92 494,162" fill="${m.land}"/>` +
			`<rect class="flk" x="330" y="190" width="38" height="46" fill="#ffd97a"/><rect x="396" y="236" width="40" height="54" fill="#10131f"/>` +
			`<circle cx="560" cy="230" r="70" fill="none" stroke="${m.land}" stroke-width="8"/>${spokes}<circle cx="560" cy="230" r="8" fill="${m.land}"/>` +
			`<rect x="0" y="296" width="800" height="22" fill="${m.sea}" opacity=".75"/><path d="M0 306 q30 -6 60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0" fill="none" stroke="${m.wave}" stroke-width="2" opacity=".5"/></g>`
		);
	},

	// Stepping stones across a brook, the mill on the far bank.
	stones: ({ m }) =>
		`<g><rect y="250" width="800" height="110" fill="${m.sea}"/>` +
		`<path d="M0 270 q40 -8 80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0" fill="none" stroke="${m.wave}" stroke-width="2" opacity=".45"/>` +
		`<path d="M0 306 q40 -8 80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0" fill="none" stroke="${m.wave}" stroke-width="2" opacity=".35"/>` +
		`<rect y="238" width="800" height="16" fill="${m.land}"/>` +
		[
			[110, 300, 40],
			[230, 292, 34],
			[350, 304, 42],
			[470, 294, 36],
			[590, 302, 40],
			[700, 296, 34],
		]
			.map(
				([x, y, w]) =>
					`<ellipse cx="${x}" cy="${y}" rx="${w}" ry="${n0(w / 3.4)}" fill="${m.far}" stroke="${m.land}" stroke-width="3"/>`,
			)
			.join("") +
		`<rect x="590" y="170" width="140" height="70" fill="${m.land}"/><polygon points="580,172 660,128 740,172" fill="${m.land}"/><rect class="flk" x="640" y="190" width="22" height="26" fill="#ffd97a"/></g>`,

	// A very large, very calm bull standing in a field.
	bull: ({ m }) =>
		`<g><rect y="290" width="800" height="70" fill="${m.land}"/>` +
		`<ellipse cx="420" cy="296" rx="130" ry="9" fill="#000" opacity=".25"/>` +
		`<path d="M300 250 Q300 196 380 190 L500 190 Q548 196 548 250 L548 290 L520 290 L520 262 L470 262 L470 290 L440 290 L440 262 L400 262 L400 290 L370 290 L370 262 L336 262 L336 290 L308 290Z" fill="#2c2420"/>` +
		`<path d="M300 230 Q268 206 238 232 L226 262 Q240 286 276 280 L306 262Z" fill="#2c2420"/>` +
		`<path d="M240 206 Q222 190 210 198 M268 204 Q280 186 296 190" fill="none" stroke="#e8e4d8" stroke-width="5" stroke-linecap="round"/>` +
		`<circle cx="252" cy="236" r="3" fill="#f1e6c4"/><circle cx="238" cy="268" r="9" fill="none" stroke="#c9a24a" stroke-width="3"/>` +
		`<path d="M548 220 Q580 226 574 262" fill="none" stroke="#2c2420" stroke-width="5"/></g>`,

	// The Centenary Cake on its tea trolley: five lemon layers, a sugar duck on top.
	cake: ({ id }) => {
		let layers = "";
		const cols = ["#f4e27a", "#f8eeaa", "#f4e27a", "#f8eeaa", "#f4e27a"];
		for (let i = 0; i < 5; i++) {
			const w = 220 - i * 26,
				y = 266 - (i + 1) * 30;
			layers += `<rect x="${400 - w / 2}" y="${y}" width="${w}" height="28" rx="5" fill="${cols[i]}" stroke="#c9a24a" stroke-width="2"/><path d="M${400 - w / 2 + 6} ${y + 6} q10 10 20 0 t20 0 t20 0 t20 0 t20 0 t20 0" fill="none" stroke="#fff" stroke-width="3" opacity=".8"/>`;
		}
		return (
			`<g><ellipse class="flk" cx="400" cy="170" rx="300" ry="170" fill="url(#warm${id})" opacity=".6"/>` +
			`<rect x="250" y="268" width="300" height="14" rx="4" fill="#9a6b3c" stroke="#5b3b1d" stroke-width="2"/>` +
			`<path d="M268 282 V330 M532 282 V330 M550 276 L580 240" stroke="#5b3b1d" stroke-width="6" stroke-linecap="round"/>` +
			`<circle cx="282" cy="338" r="16" fill="#2a2118"/><circle cx="518" cy="338" r="16" fill="#2a2118"/>` +
			layers +
			`<g transform="translate(400,84)"><ellipse cx="0" cy="12" rx="16" ry="10" fill="#fff"/><circle cx="14" cy="-2" r="7" fill="#fff"/><polygon points="20,-2 30,0 20,3" fill="#f0a030"/><circle cx="16" cy="-4" r="1.4" fill="#2a2118"/></g></g>`
		);
	},

	// The runaway trolley, small and fast, cake on top, speed lines behind it.
	cart: () =>
		`<g><g stroke="#fff" stroke-width="3" opacity=".5" stroke-linecap="round"><path d="M220 258 H330 M200 280 H320 M240 302 H340"/></g>` +
		`<g transform="translate(430,0) rotate(-6 100 280)">` +
		`<rect x="0" y="278" width="200" height="10" rx="3" fill="#9a6b3c" stroke="#5b3b1d" stroke-width="2"/>` +
		`<path d="M14 288 V318 M186 288 V318 M200 284 L226 250" stroke="#5b3b1d" stroke-width="5" stroke-linecap="round"/>` +
		`<circle cx="22" cy="322" r="13" fill="#2a2118"/><circle cx="178" cy="322" r="13" fill="#2a2118"/>` +
		`<rect x="40" y="244" width="120" height="32" rx="4" fill="#f4e27a" stroke="#c9a24a" stroke-width="2"/><rect x="56" y="214" width="88" height="30" rx="4" fill="#f8eeaa" stroke="#c9a24a" stroke-width="2"/><rect x="70" y="186" width="60" height="28" rx="4" fill="#f4e27a" stroke="#c9a24a" stroke-width="2"/>` +
		`<ellipse cx="100" cy="180" rx="10" ry="7" fill="#fff"/><circle cx="110" cy="171" r="5" fill="#fff"/></g></g>`,

	// ---- Gull Rock extras ----

	// A low sun on the horizon, half hidden by the sea.
	sun: ({ id }) =>
		`<g><circle class="flk" cx="500" cy="242" r="190" fill="url(#warm${id})"/><circle cx="500" cy="242" r="38" fill="#ffe2b0"/></g>`,

	// The bedroom wall: a slanted patch of white light from the window, and a hand-shaped shadow raised inside it.
	shadow: () =>
		`<g><rect width="800" height="360" fill="#0c0a13"/>` +
		`<polygon points="420,0 700,0 760,360 380,360" fill="#dfe6fa" opacity=".42"/>` +
		`<path d="M560 0 L570 360 M420 150 L730 160" stroke="#0c0a13" stroke-width="10" opacity=".55"/>` +
		`<g fill="#05040a"><path d="M556 360 L566 262 L610 262 L620 360Z"/><ellipse cx="588" cy="244" rx="30" ry="34"/>` +
		`<rect x="552" y="168" width="11" height="68" rx="5.5" transform="rotate(-14 557 236)"/><rect x="568" y="146" width="11" height="84" rx="5.5" transform="rotate(-5 573 230)"/>` +
		`<rect x="584" y="142" width="11" height="88" rx="5.5" transform="rotate(4 589 230)"/><rect x="600" y="154" width="11" height="78" rx="5.5" transform="rotate(12 605 232)"/>` +
		`<rect x="618" y="214" width="11" height="52" rx="5.5" transform="rotate(62 623 238)"/></g>` +
		`<path d="M0 0 L120 0 Q90 180 130 360 L0 360Z" fill="#17111f"/></g>`,

	// Blinding white light: a flare with spokes, used for the lamp at full blaze.
	flare: ({ id }) => {
		let spokes = "";
		for (let i = 0; i < 24; i++) {
			const a = (i * Math.PI) / 12;
			spokes += `<line x1="400" y1="180" x2="${n0(400 + Math.cos(a) * 520)}" y2="${n0(180 + Math.sin(a) * 520)}"/>`;
		}
		return (
			`<g><rect width="800" height="360" fill="#14100a"/>` +
			`<circle cx="400" cy="180" r="360" fill="url(#lg${id})"/><circle cx="400" cy="180" r="220" fill="url(#lg${id})"/>` +
			`<g stroke="#fffbe0" stroke-width="3" opacity=".22">${spokes}</g>` +
			`<circle class="pulse" cx="400" cy="180" r="70" fill="#fffef2"/></g>`
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
