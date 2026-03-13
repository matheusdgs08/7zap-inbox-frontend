const CACHE = '7crm-v1';
const ASSETS = ['/', '/index.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Só cacheia GET, ignora API calls
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('railway.app') || e.request.url.includes('supabase')) return;
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
