// Turns book text into personalised text.
//
// Tokens in book text:
//   {hero}            the name            {hero’s} / {hero's}   possessive (Wes’s, James’)
//   {hero.he}         he / she / they     {hero.He}             capitalised
//   {hero.him}        him / her / them    {hero.his}            his / her / their
//   {hero.hers}       his / hers / theirs {hero.self}           himself / herself / themselves
//   {hero.is} {hero.has} {hero.was} {hero.does}   verb forms that agree (is/are, has/have ...)
//   {hero.s}          "s" for he/she/it, "" for they   (so: walk{hero.s})
//   [[pet:dog=barked|cat=miaowed|*=made a noise]]   switch on a slot's variant (dog/cat choice)

const PRONOUNS = {
  he:   { he: 'he',   him: 'him',  his: 'his',   hers: 'his',    self: 'himself',    is: 'is',  has: 'has',  was: 'was',  does: 'does', s: 's' },
  she:  { he: 'she',  him: 'her',  his: 'her',   hers: 'hers',   self: 'herself',    is: 'is',  has: 'has',  was: 'was',  does: 'does', s: 's' },
  they: { he: 'they', him: 'them', his: 'their', hers: 'theirs', self: 'themselves', is: 'are', has: 'have', was: 'were', does: 'do',   s: '' },
  it:   { he: 'it',   him: 'it',   his: 'its',   hers: 'its',    self: 'itself',     is: 'is',  has: 'has',  was: 'was',  does: 'does', s: 's' },
};

export const PRONOUN_LABELS = { she: 'she / her', he: 'he / him', they: 'they / them', it: 'it' };

export function possessive(name) {
  return /s$/i.test(name) ? `${name}’` : `${name}’s`;
}

// Returns an array of parts: { text, name? }. Name parts are never given syllable pop-ups.
export function compile(str, cast) {
  if (!str) return [];
  cast = cast || {};

  // 1) variant switches
  str = str.replace(/\[\[(\w+):([^\]]+)\]\]/g, (m, slot, opts) => {
    const variant = cast[slot] && cast[slot].variant;
    let fallback = null;
    for (const o of opts.split('|')) {
      const i = o.indexOf('=');
      if (i < 0) continue;
      const k = o.slice(0, i).trim();
      const val = o.slice(i + 1);
      if (k === variant) return val;
      if (k === '*' || fallback === null) fallback = val;
    }
    return fallback === null ? '' : fallback;
  });

  // 2) tokens
  const parts = [];
  const re = /\{(\w+)(’s|'s)?(?:\.(\w+))?\}/g;
  let last = 0;
  let m;
  while ((m = re.exec(str))) {
    if (m.index > last) parts.push({ text: str.slice(last, m.index) });
    const [whole, slot, poss, prop] = m;
    const c = cast[slot];
    if (!c) {
      parts.push({ text: whole });
    } else if (!prop) {
      parts.push({ text: poss ? possessive(c.name) : c.name, name: true });
    } else {
      const set = PRONOUNS[c.pronoun] || PRONOUNS.they;
      let v = set[prop.toLowerCase()];
      if (v === undefined) {
        parts.push({ text: whole });
      } else {
        if (prop[0] !== prop[0].toLowerCase()) v = v[0].toUpperCase() + v.slice(1);
        parts.push({ text: v });
      }
    }
    last = re.lastIndex;
  }
  if (last < str.length) parts.push({ text: str.slice(last) });
  return parts;
}

export function plain(str, cast) {
  return compile(str, cast).map((p) => p.text).join('');
}

// ---- Choices, scores and conditions ----

export function walkBlocks(blocks, fn) {
  for (const b of blocks || []) {
    if (!b || typeof b === 'string') continue;
    fn(b);
    if (b.blocks) walkBlocks(b.blocks, fn);
    if (b.choice) {
      for (const o of b.choice.options) walkBlocks(o.blocks || [], fn);
    }
  }
}

export function allChoices(book) {
  const out = [];
  for (const ch of book.chapters) {
    walkBlocks(ch.blocks, (b) => { if (b.choice) out.push(b.choice); });
  }
  return out;
}

export function computeScores(book, picks) {
  const scores = {};
  for (const t of book.traits || []) scores[t] = 0;
  for (const choice of allChoices(book)) {
    const picked = picks[choice.id];
    if (picked === undefined) continue;
    const opt = choice.options.find((o) => o.id === picked);
    if (!opt || !opt.score) continue;
    for (const [k, v] of Object.entries(opt.score)) scores[k] = (scores[k] || 0) + v;
  }
  return scores;
}

// Conditions: { pick:'id', is:'optionId' } | { pick:'id', isNot:'optionId' } | { pick:'id' } (has chosen)
//             { score:'brave', atLeast:2 } | { top:'brave' } (highest trait, ties allowed)
//             { all:[...] } | { any:[...] } | { not:{...} }
export function evalCond(c, st) {
  if (!c) return true;
  if (c.all) return c.all.every((x) => evalCond(x, st));
  if (c.any) return c.any.some((x) => evalCond(x, st));
  if (c.not) return !evalCond(c.not, st);
  if (c.pick !== undefined) {
    const p = st.picks[c.pick];
    if (c.is !== undefined) return p === c.is;
    if (c.isNot !== undefined) return p !== undefined && p !== c.isNot;
    return p !== undefined;
  }
  if (c.score) {
    const v = st.scores[c.score] || 0;
    if (c.atLeast !== undefined) return v >= c.atLeast;
    if (c.atMost !== undefined) return v <= c.atMost;
    return v > 0;
  }
  if (c.top) {
    const v = st.scores[c.top] || 0;
    return v > 0 && Object.values(st.scores).every((x) => x <= v);
  }
  return true;
}

export function cleanName(s) {
  return String(s || '').replace(/[<>{}\[\]|=]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20);
}
