import { h } from './dom.js';
import * as store from './store.js';
import { APP_NAME } from './config.js';

export const SIZES = [0.85, 1, 1.15, 1.3, 1.5];

export function applySettings() {
  const s = store.getSettings();
  const root = document.documentElement;
  root.dataset.theme = s.theme;
  root.dataset.anim = s.anim ? 'on' : 'off';
  root.style.setProperty('--scale', SIZES[s.size] ?? 1);
  const meta = document.querySelector('meta[name=theme-color]');
  if (meta) meta.setAttribute('content', s.theme === 'night' ? '#10162b' : '#1b2547');
}

export function bumpSize(delta) {
  const s = store.getSettings();
  const next = Math.max(0, Math.min(SIZES.length - 1, s.size + delta));
  store.setSetting('size', next);
  applySettings();
}

export function openSettings() {
  if (document.querySelector('.sheet-back')) return;
  const s = store.getSettings();

  const close = () => { back.remove(); };

  const seg = (name, options, value, onPick) =>
    h('div', { class: 'seg', role: 'radiogroup' },
      options.map(([val, label]) =>
        h('button', {
          type: 'button', role: 'radio', 'aria-checked': String(val === value), class: val === value ? 'on' : '',
          onclick: (e) => {
            onPick(val);
            e.currentTarget.parentElement.querySelectorAll('button').forEach((b) => {
              b.classList.remove('on'); b.setAttribute('aria-checked', 'false');
            });
            e.currentTarget.classList.add('on'); e.currentTarget.setAttribute('aria-checked', 'true');
          },
        }, label)));

  const sizeBtns = h('div', { class: 'row-ctrl' },
    h('button', { type: 'button', class: 'btn small', onclick: () => bumpSize(-1) }, 'A−'),
    h('button', { type: 'button', class: 'btn small', onclick: () => bumpSize(1) }, 'A+'));

  const rate = h('input', {
    type: 'range', min: '0.6', max: '1.2', step: '0.05', value: String(s.rate), 'aria-label': 'Read-aloud speed',
    oninput: (e) => store.setSetting('rate', Number(e.target.value)),
  });

  const sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-label': 'Settings' },
    h('h2', {}, 'Settings'),
    h('div', { class: 'srow' }, h('span', {}, 'Text size'), sizeBtns),
    h('div', { class: 'srow' }, h('span', {}, 'Look'),
      seg('theme', [['paper', 'Paper'], ['night', 'Night']], s.theme, (v) => { store.setSetting('theme', v); applySettings(); })),
    h('div', { class: 'srow' }, h('span', {}, 'Moving pictures'),
      seg('anim', [['on', 'On'], ['off', 'Off']], s.anim ? 'on' : 'off', (v) => { store.setSetting('anim', v === 'on'); applySettings(); })),
    h('div', { class: 'srow' }, h('span', {}, 'Read-aloud speed'), rate),
    h('div', { class: 'srow' }, h('span', {}, 'Progress'),
      h('button', {
        type: 'button', class: 'btn small danger',
        onclick: () => {
          if (confirm('Erase all reading progress and saved names on this device?')) {
            store.resetAll(); close(); location.hash = '#/'; location.reload();
          }
        },
      }, 'Erase progress')),
    h('button', { type: 'button', class: 'btn primary', onclick: close }, 'Done'),
    h('p', { class: 'fine' }, `${APP_NAME} keeps everything on this device. Nothing is sent anywhere.`));

  const back = h('div', { class: 'sheet-back', onclick: (e) => { if (e.target === back) close(); } }, sheet);
  document.body.append(back);
}
