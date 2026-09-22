/* Casal Navy — service worker: app shell offline-first */
const CACHE = 'casal-navy-v21';
const ASSETS = [
  '.', 'index.html', 'manifest.json',
  'css/style.css',
  'js/plans.js', 'js/history_seed.js', 'js/sb.js', 'js/store.js', 'js/app.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-180.png',
  'img/watermark.jpg',
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== self.location.origin) return;
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(e.request, copy)).catch(()=>{});
    return res;
  }).catch(() => caches.match('index.html'))));
});
/* ---- Push notifications: recadinhos do casal ---- */
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) {}
  const title = d.title || '💌 Novo recadinho';
  e.waitUntil(self.registration.showNotification(title, {
    body: d.body || 'Abre o app pra ver 💕',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    tag: 'casal-recado',
    renotify: true,
    data: { url: './' },
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => {
    for (const w of ws) { try { if (new URL(w.url).pathname.includes('casal-navy')) return w.focus(); } catch (_) {} }
    return clients.openWindow((e.notification.data && e.notification.data.url) || './');
  }));
});
