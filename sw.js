// Offline support. Serves from cache first and refreshes the cache in the background,
// so changes you push to GitHub show up the next time the app is opened (or the time after).
// Bump CACHE when you want to force old files out immediately.
const CACHE = 'my-library-v1';

const CORE = [
  './', 'index.html', 'manifest.webmanifest',
  'css/styles.css',
  'js/app.js', 'js/config.js', 'js/dom.js', 'js/store.js', 'js/personalise.js',
  'js/scenes.js', 'js/syllables.js', 'js/tts.js', 'js/reader.js', 'js/settings.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png',
  'books/index.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(CORE);
    try {
      const idx = await (await fetch('books/index.json', { cache: 'no-cache' })).json();
      for (const id of idx.books) {
        const base = `books/${id}/`;
        const res = await fetch(base + 'book.json', { cache: 'no-cache' });
        await cache.put(base + 'book.json', res.clone());
        const book = await res.json();
        if (book.cover && book.cover.image) await cache.add(base + book.cover.image);
      }
    } catch (err) { /* books will be cached on first open instead */ }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: true });
    const network = fetch(req).then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => null);

    if (cached) { event.waitUntil(network); return cached; }
    const res = await network;
    if (res) return res;
    if (req.mode === 'navigate') {
      const shell = await cache.match('index.html');
      if (shell) return shell;
    }
    return Response.error();
  })());
});
