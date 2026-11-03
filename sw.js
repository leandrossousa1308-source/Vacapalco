// Com internet: sempre busca a versão nova (e guarda cópia). Sem internet: usa a cópia guardada.
const V = 'vaca-palco-v8';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'fonts.css', 'fonts/f1.woff2', 'fonts/f2.woff2', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(V)
      .then(c => Promise.all(FILES.map(f => fetch(new Request(f, { cache: 'reload' })).then(r => { if (!r.ok) throw new Error(f); return c.put(f, r); }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(networkFirst(req));
});

async function networkFirst(req) {
  const cache = await caches.open(V);
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 2500); // rede ruim: desiste rápido e usa a cópia
    const res = await fetch(req, { cache: 'no-cache', signal: ctrl.signal });
    clearTimeout(to);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (_) {
    return (await cache.match(req, { ignoreSearch: true })) || (await cache.match('index.html')) || Response.error();
  }
}
