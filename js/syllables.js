// Syllable pop-ups. Longer words are listed in each book's "syllables" dictionary
// (written when the book is written, so they are accurate). Names are never wrapped.
import { h } from './dom.js';
import * as tts from './tts.js';
import * as store from './store.js';

export function pieces(word, hyph) {
  const segs = hyph.split('-');
  if (segs.join('').length !== word.length) return [word];
  const out = [];
  let i = 0;
  for (const s of segs) { out.push(word.substr(i, s.length)); i += s.length; }
  return out;
}

// parts come from personalise.compile(); returns a DocumentFragment
export function toFragment(parts, dict) {
  const frag = document.createDocumentFragment();
  for (const part of parts) {
    if (part.name) { frag.append(h('span', { class: 'nm' }, part.text)); continue; }
    for (const bit of part.text.split(/([A-Za-z]+)/)) {
      if (!bit) continue;
      if (/^[A-Za-z]+$/.test(bit)) {
        const hy = dict && dict[bit.toLowerCase()];
        if (hy && hy.includes('-')) {
          const ps = pieces(bit, hy);
          if (ps.length > 1) {
            frag.append(h('button', { class: 'syl', type: 'button', 'data-w': bit, 'data-s': ps.join('-') }, bit));
            continue;
          }
        }
      }
      frag.append(document.createTextNode(bit));
    }
  }
  return frag;
}

let pop = null;
let current = null;

function ensure() {
  if (pop) return pop;
  pop = h('div', { id: 'popup', role: 'dialog', 'aria-label': 'Word helper', hidden: true },
    h('div', { class: 'pop-word' }),
    h('div', { class: 'pop-btns' },
      h('button', { type: 'button', 'data-act': 'say' }, '🔊 Say it'),
      h('button', { type: 'button', 'data-act': 'slow' }, '🐢 Slowly')));
  document.body.append(pop);
  pop.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || !current) return;
    const word = current.getAttribute('data-w');
    const sy = current.getAttribute('data-s').split('-');
    const rate = store.getSettings().rate;
    if (b.dataset.act === 'say') tts.say(word, { rate });
    else tts.sayParts(sy, word, { rate: Math.min(rate, 0.7) });
  });
  return pop;
}

function place(btn, p) {
  const r = btn.getBoundingClientRect();
  p.style.left = '0px';
  p.style.top = '0px';
  const pr = p.getBoundingClientRect();
  let left = r.left + r.width / 2 - pr.width / 2;
  left = Math.max(8, Math.min(window.innerWidth - pr.width - 8, left));
  let top = r.top - pr.height - 10;
  if (top < 8) top = r.bottom + 10;
  p.style.left = `${left}px`;
  p.style.top = `${top}px`;
}

function open(btn) {
  const p = ensure();
  if (current === btn && !p.hidden) { closePopup(); return; }
  current = btn;
  const syl = btn.getAttribute('data-s').split('-');
  const kids = [];
  syl.forEach((s, i) => {
    kids.push(h('span', { class: `sy sy${i % 3}` }, s));
    if (i < syl.length - 1) kids.push(h('i', {}, '·'));
  });
  p.querySelector('.pop-word').replaceChildren(...kids);
  p.hidden = false;
  place(btn, p);
}

export function closePopup() {
  if (pop) pop.hidden = true;
  current = null;
}

export function initSyllables() {
  document.addEventListener('click', (e) => {
    const w = e.target.closest && e.target.closest('.syl');
    if (w) { e.preventDefault(); open(w); return; }
    if (pop && !pop.contains(e.target)) closePopup();
  });
  window.addEventListener('scroll', closePopup, { passive: true });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePopup(); });
}
