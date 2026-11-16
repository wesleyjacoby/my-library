// Animated atmospheric SVG scene kit.
// A scene is described in JSON: { mood, elements: [...], alt, align? }
// Elements are drawn in a fixed back-to-front order, so authors only list what they want.
// Animation is done in CSS (see styles.css) so it can be switched off globally.

const MOODS = {
  day:   { sky: ['#5aa9e6', '#d6f0ff'], far: '#7fae9b', land: '#2f4a3d', sea: '#2e7fb8', cloud: '#ffffff', tower: '#ffffff', wave: '#ffffff', gull: '#3d4b5c' },
  dawn:  { sky: ['#3b4a7a', '#f6a96b'], far: '#4d4a6e', land: '#1f2036', sea: '#44527f', cloud: '#ffd9b0', tower: '#f5e6d6', wave: '#ffe1c0' },
  dusk:  { sky: ['#2a2358', '#e27d60'], far: '#3a2f57', land: '#1b1630', sea: '#30315f', cloud: '#f0a58a', tower: '#f1d7c9', wave: '#ffc9a8' },
  night: { sky: ['#060b20', '#26376f'], far: '#0f1a3c', land: '#050913', sea: '#0b1736', cloud: '#51649c', tower: '#b9c4e2', wave: '#8fb2ff' },
  storm: { sky: ['#161b26', '#4a5568'], far: '#2a3140', land: '#0b0e14', sea: '#1d2636', cloud: '#6b7689', tower: '#aab3c4', wave: '#c5d4ea' },
  cave:  { sky: ['#07070d', '#1c1a2a'], far: '#14131d', land: '#0a0a10', sea: '#0b1020', cloud: '#2a2a3a', tower: '#999999', wave: '#8fb2ff' },
};

const ORDER = ['stars', 'moon', 'clouds', 'gulls', 'hills', 'sea', 'village', 'cliff', 'lighthouse',
  'beam', 'boat', 'house', 'trees', 'tunnel', 'glow', 'fog', 'rain'];

let uid = 0;

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const n0 = (v) => Math.round(v);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const DRAW = {
  stars: ({ r }) => {
    let s = '<g>';
    for (let i = 0; i < 48; i++) {
      s += `<circle class="tw" style="--d:${(r() * 4).toFixed(1)}s" cx="${n0(r() * 800)}" cy="${n0(r() * 200)}" r="${(0.6 + r() * 1.5).toFixed(1)}" fill="#fff"/>`;
    }
    return s + '</g>';
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
    [[70, 60, 0, 26], [130, 92, -8, 32], [40, 112, -15, 30]].forEach(([x, y, d, t]) => {
      s += `<path class="gull" style="--d:${d}s;--t:${t}s" d="M${x} ${y} q9 -10 18 0 q9 -10 18 0"/>`;
    });
    return s + '</g>';
  },

  hills: ({ m }) => `<path d="M0 250 Q110 185 250 232 T520 222 T800 236 L800 360 L0 360Z" fill="${m.far}"/>`,

  sea: ({ m }) => {
    let s = `<rect y="255" width="800" height="105" fill="${m.sea}"/>`;
    for (let i = 0; i < 5; i++) {
      const y = 272 + i * 18;
      let d = `M-100 ${y} q25 -7 50 0`;
      for (let k = 1; k < 20; k++) d += ' t50 0';
      s += `<path class="wave" style="--t:${6 + i * 1.5}s" d="${d}" fill="none" stroke="${m.wave}" stroke-opacity="${(0.12 + i * 0.03).toFixed(2)}" stroke-width="2"/>`;
    }
    return s;
  },

  village: ({ m, r }) => {
    let s = '<g>';
    let x = 20;
    while (x < 330) {
      const w = 34 + r() * 22;
      const h = 24 + r() * 20;
      const top = 270 - h;
      s += `<rect x="${n0(x)}" y="${n0(top)}" width="${n0(w)}" height="${n0(h)}" fill="${m.land}"/>` +
        `<polygon points="${n0(x - 4)},${n0(top)} ${n0(x + w / 2)},${n0(top - 18)} ${n0(x + w + 4)},${n0(top)}" fill="${m.land}"/>`;
      if (r() > 0.35) {
        s += `<rect class="flk" style="--d:${(r() * 3).toFixed(1)}s" x="${n0(x + w / 2 - 4)}" y="${n0(top + 7)}" width="8" height="9" fill="#ffcf70"/>`;
      }
      x += w + 8 + r() * 14;
    }
    return s + `<path d="M0 268 L345 268 L395 305 L395 360 L0 360Z" fill="${m.land}"/></g>`;
  },

  cliff: ({ m }) => `<path d="M505 360 L548 268 Q588 210 640 203 Q720 198 800 190 L800 360Z" fill="${m.land}"/>`,

  lighthouse: ({ m }) => {
    const L = (y) => (632 + ((202 - y) * 8) / 107).toFixed(1);
    const R = (y) => (668 - ((202 - y) * 8) / 107).toFixed(1);
    const band = (a, b) => `<polygon points="${L(a)},${a} ${R(a)},${a} ${R(b)},${b} ${L(b)},${b}" fill="#c0392b" opacity=".92"/>`;
    return `<g><polygon points="632,202 668,202 660,95 640,95" fill="${m.tower}"/>${band(172, 150)}${band(130, 110)}` +
      `<rect x="634" y="88" width="32" height="7" fill="${m.land}"/>` +
      `<rect class="flk" x="643" y="68" width="14" height="20" fill="#ffd97a"/>` +
      `<polygon points="639,68 661,68 650,52" fill="#8e2b21"/><rect x="649" y="40" width="2" height="12" fill="${m.land}"/></g>`;
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
      `<rect ${lit ? `class="flk" style="--d:${(r() * 3).toFixed(1)}s"` : ''} x="${x}" y="${y}" width="22" height="30" fill="${lit ? '#ffcf70' : '#10131f'}"/>`;
    return `<g><rect y="288" width="800" height="72" fill="${m.land}"/>` +
      `<rect x="150" y="170" width="200" height="120" fill="${m.land}"/><polygon points="135,172 250,105 365,172" fill="${m.land}"/>` +
      `<rect x="305" y="122" width="18" height="42" fill="${m.land}"/>` +
      `<circle class="flk" cx="250" cy="144" r="9" fill="#ffcf70"/>` +
      win(175, 192, true) + win(225, 192, true) + win(285, 192, false) + win(175, 238, true) + win(285, 238, false) +
      `<rect x="232" y="240" width="36" height="50" fill="#10131f"/><circle cx="262" cy="266" r="2" fill="#ffcf70"/></g>`;
  },

  trees: ({ m, r }) => {
    const pine = (x, y, s, d) =>
      `<g class="sway" style="--d:${d}s"><rect x="${x - 3 * s}" y="${y}" width="${6 * s}" height="${22 * s}" fill="${m.land}"/>` +
      `<polygon points="${x},${y - 110 * s} ${x - 26 * s},${y - 60 * s} ${x + 26 * s},${y - 60 * s}" fill="${m.land}"/>` +
      `<polygon points="${x},${y - 80 * s} ${x - 34 * s},${y - 26 * s} ${x + 34 * s},${y - 26 * s}" fill="${m.land}"/>` +
      `<polygon points="${x},${y - 48 * s} ${x - 42 * s},${y + 2 * s} ${x + 42 * s},${y + 2 * s}" fill="${m.land}"/></g>`;
    let s = `<path d="M0 322 Q200 292 400 316 T800 306 L800 360 L0 360Z" fill="${m.land}"/>`;
    [[34, 1.1], [98, 0.8], [690, 0.75], [742, 1.05], [790, 0.85]].forEach(([x, sc]) => {
      s += pine(x, 300, sc, -(r() * 3).toFixed(1));
    });
    return s;
  },

  tunnel: ({ id, r }) => {
    let tex = '';
    for (let i = 0; i < 26; i++) {
      const left = r() > 0.5;
      const x = left ? r() * 150 : 650 + r() * 150;
      const y = r() * 340;
      tex += `<path d="M${n0(x)} ${n0(y)} q${n0(10 + r() * 20)} ${n0(-6 + r() * 12)} ${n0(20 + r() * 30)} ${n0(r() * 8)}" stroke="#262332" stroke-width="2" fill="none"/>`;
    }
    return `<g><circle class="pulse" cx="400" cy="218" r="70" fill="url(#tg${id})"/>` +
      `<path d="M0 0 L800 0 L800 360 L650 360 Q610 215 540 165 Q400 85 260 165 Q190 215 150 360 L0 360Z" fill="#15131c"/>${tex}` +
      `<path d="M150 360 Q400 292 650 360Z" fill="#1d1b27"/></g>`;
  },

  glow: ({ id }) =>
    `<g><circle class="flk" cx="170" cy="215" r="130" fill="url(#warm${id})"/>` +
    `<rect x="165" y="222" width="10" height="56" rx="3" fill="#4a3a2a"/>` +
    `<ellipse class="flame" cx="170" cy="210" rx="9" ry="16" fill="#ffb13b"/><ellipse class="flame" cx="170" cy="214" rx="4.5" ry="9" fill="#fff0b3"/></g>`,

  fog: ({ id }) =>
    `<g filter="url(#blur${id})" fill="#dfe8ff">` +
    [[150, 300, 260, 26, 0.26, 20], [460, 275, 300, 24, 0.2, 26], [690, 310, 260, 28, 0.24, 17], [300, 335, 320, 22, 0.2, 22]]
      .map(([x, y, rx, ry, o, t]) => `<ellipse class="fog" style="--t:${t}s" cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" opacity="${o}"/>`).join('') +
    '</g>',

  rain: ({ r }) => {
    let s = '<g stroke="#cfe3ff" stroke-opacity=".5" stroke-width="1.4" stroke-linecap="round">';
    for (let i = 0; i < 70; i++) {
      const x = n0(r() * 860);
      s += `<line class="rain" style="--d:-${r().toFixed(2)}s;--t:${(0.7 + r() * 0.5).toFixed(2)}s" x1="${x}" y1="-20" x2="${x - 4}" y2="-4"/>`;
    }
    return s + '</g>';
  },
};

export const SCENE_ELEMENTS = Object.keys(DRAW);
export const SCENE_MOODS = Object.keys(MOODS);

export function sceneHTML(def = {}, opts = {}) {
  const id = ++uid;
  const m = MOODS[def.mood] || MOODS.night;
  const els = new Set(def.elements || []);
  const r = rng(def.seed ?? hash(`${def.mood}|${[...els].join(',')}`));

  const defs =
    `<defs>` +
    `<linearGradient id="sky${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${m.sky[0]}"/><stop offset="1" stop-color="${m.sky[1]}"/></linearGradient>` +
    `<radialGradient id="mg${id}"><stop offset="0" stop-color="#fff6c8" stop-opacity=".5"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="bl${id}" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#fff6c8" stop-opacity=".85"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="br${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff6c8" stop-opacity=".85"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></linearGradient>` +
    `<radialGradient id="warm${id}"><stop offset="0" stop-color="#ffb347" stop-opacity=".55"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="tg${id}"><stop offset="0" stop-color="#bfe9ff" stop-opacity=".8"/><stop offset="1" stop-color="#bfe9ff" stop-opacity="0"/></radialGradient>` +
    `<filter id="blur${id}" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="12"/></filter>` +
    `</defs>`;

  let body = `<rect width="800" height="360" fill="url(#sky${id})"/>`;
  for (const name of ORDER) {
    if (els.has(name)) body += DRAW[name]({ id, m, r });
  }
  for (const name of els) {
    if (!DRAW[name]) console.warn('[scenes] unknown element:', name);
  }

  const label = def.alt ? `role="img" aria-label="${esc(def.alt)}"` : 'aria-hidden="true"';
  return `<figure class="scene${opts.static ? ' static' : ''}"><svg viewBox="0 0 800 360" preserveAspectRatio="${def.align || 'xMidYMid'} slice" ${label}>${defs}${body}</svg></figure>`;
}
