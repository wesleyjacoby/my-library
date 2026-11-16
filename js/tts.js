// Read-aloud using the browser's built-in voices (works offline on iPad).
export const available = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

let voice = null;
let gen = 0; // bumps on cancel so stale callbacks are ignored

function pickVoice() {
  if (!available) return;
  const vs = speechSynthesis.getVoices();
  voice =
    vs.find((v) => v.lang === 'en-GB' && /daniel|kate|serena|oliver|arthur|martha/i.test(v.name)) ||
    vs.find((v) => /^en[-_]GB/i.test(v.lang)) ||
    vs.find((v) => /^en/i.test(v.lang)) ||
    null;
}

if (available) {
  pickVoice();
  if (speechSynthesis.addEventListener) speechSynthesis.addEventListener('voiceschanged', pickVoice);
}

function utter(text, rate, onend) {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-GB';
  if (voice) u.voice = voice;
  u.rate = rate;
  const mine = gen;
  const done = () => { if (mine === gen && onend) onend(); };
  u.onend = done;
  u.onerror = done;
  speechSynthesis.speak(u);
}

export function cancel() {
  gen++;
  if (available) speechSynthesis.cancel();
}

export function say(text, { rate = 0.9 } = {}) {
  if (!available) return;
  cancel();
  utter(text, rate);
}

// Says each syllable on its own, then the whole word.
export function sayParts(parts, whole, { rate = 0.7 } = {}) {
  if (!available) return;
  cancel();
  const mine = gen;
  let i = 0;
  const next = () => {
    if (mine !== gen) return;
    if (i < parts.length) {
      const t = parts[i++];
      setTimeout(() => { if (mine === gen) utter(t, rate, next); }, i === 1 ? 0 : 250);
    } else {
      setTimeout(() => { if (mine === gen) utter(whole, rate); }, 350);
    }
  };
  next();
}

export function readAll(texts, { rate = 0.9, onItem, onDone } = {}) {
  if (!available) return;
  cancel();
  const mine = gen;
  let i = 0;
  const next = () => {
    if (mine !== gen) return;
    if (i >= texts.length) { if (onDone) onDone(); return; }
    const idx = i++;
    if (onItem) onItem(idx);
    utter(texts[idx], rate, next);
  };
  next();
}
