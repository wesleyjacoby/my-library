// Reading Coach: sentence focus (one bright sentence at a time) and punctuation marks.
// Sentences are always wrapped in .sn spans; the settings only change how they look.
import { h } from './dom.js';
import { closePopup } from './syllables.js';

const isWs = (n) => n.nodeType === 3 && !n.textContent.trim();

// Splits a paragraph's nodes into .sn sentence groups. A sentence ends at . ! ? (plus closing quotes)
// unless the next word is lowercase, which means a speech tag ("...?” asked Sam.).
export function sentencify(p) {
  const nodes = [...p.childNodes];
  const out = [];
  let group = [];
  const flush = () => {
    if (!group.length) return;
    const s = document.createElement('span');
    s.className = 'sn';
    s.append(...group);
    out.push(s);
    group = [];
  };
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (isWs(n) && !group.length) { out.push(n); continue; }
    group.push(n);
    if (n.nodeType === 1 && n.dataset.end) {
      let j = i + 1;
      while (j < nodes.length && nodes[j].nodeType === 1 && nodes[j].classList.contains('cq')) { group.push(nodes[j]); j++; }
      let k = j;
      while (k < nodes.length && isWs(nodes[k])) k++;
      const next = nodes[k];
      i = j - 1;
      if (!next || !/[a-z]/.test(next.textContent.trim()[0] || '')) flush();
    }
  }
  flush();
  p.replaceChildren(...out);
}

// Sentence focus controller for one reading screen. `host` is the .reader element (holds the bottom bar).
export function initFocus(article, host) {
  let cur = 0;
  const root = document.documentElement;
  const on = () => root.dataset.focus === 'on';
  const sns = () => [...article.querySelectorAll('.sn')];

  const count = h('span', { class: 'coach-count' });
  const back = h('button', { type: 'button', class: 'coach-btn back', 'aria-label': 'Previous sentence', onclick: () => go(-1) }, '◂ Back');
  const next = h('button', { type: 'button', class: 'coach-btn next', 'aria-label': 'Next sentence', onclick: () => go(1) }, 'Next ▸');
  const bar = h('div', { class: 'coach-bar', hidden: true }, back, count, next);
  host.append(bar);

  function refresh() {
    const list = sns();
    cur = Math.max(0, Math.min(list.length - 1, cur));
    bar.hidden = !on();
    list.forEach((s, i) => {
      s.classList.toggle('past', i < cur);
      s.classList.toggle('cur', i === cur);
    });
    // a choice only wakes up once she has reached the sentence just before it
    article.querySelectorAll('.choice').forEach((c) => {
      let lastBefore = -1;
      list.forEach((s, i) => { if (s.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING) lastBefore = i; });
      c.classList.toggle('ahead', !c.classList.contains('done') && lastBefore > cur);
    });
    count.textContent = list.length ? `${cur + 1} / ${list.length}` : '';
    back.disabled = cur <= 0;
  }

  function show() {
    const el = sns()[cur];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function go(d) {
    closePopup();
    const list = sns();
    if (d > 0 && cur >= list.length - 1) {
      const tail = article.querySelector('.choice:not(.done)') || article.querySelector('.chapter-end') || article.querySelector('.ending-card');
      if (tail) tail.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    cur += d;
    refresh();
    show();
  }

  article.addEventListener('click', (e) => {
    if (!on()) return;
    const s = e.target.closest('.sn');
    if (!s) return;
    const i = sns().indexOf(s);
    if (i !== cur) { e.stopPropagation(); e.preventDefault(); closePopup(); cur = i; refresh(); }
  }, true);

  const onKey = (e) => {
    if (!article.isConnected) { document.removeEventListener('keydown', onKey); return; }
    if (!on() || /input|select|textarea/i.test(e.target.tagName)) return;
    if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'ArrowLeft') go(-1);
  };
  document.addEventListener('keydown', onKey);

  const onSettings = () => {
    if (!article.isConnected) { window.removeEventListener('settingschange', onSettings); return; }
    if (on() && cur === 0) {
      // switched on mid-chapter: start from the first sentence on screen
      const i = sns().findIndex((s) => s.getBoundingClientRect().bottom > 90);
      if (i > 0) cur = i;
    }
    refresh();
  };
  window.addEventListener('settingschange', onSettings);

  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; refresh(); });
  }).observe(article, { childList: true, subtree: true });

  refresh();
}