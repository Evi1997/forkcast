// Offline support: serve the app shell from cache when there's no network.
// AI calls and database requests always go to the network.
const CACHE = 'forkcast-v4';
const SHELL = ['./', 'index.html', 'config.js', 'manifest.webmanifest', 'icons/icon-192.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.hostname.endsWith('supabase.co')) return;
  // Network first, so updates show up right away; cache as the fallback.
  // The app's own files skip the browser's 10-minute HTTP cache (GitHub Pages
  // sends max-age=600), so a new version appears as soon as it's published.
  const own = url.origin === location.origin;
  e.respondWith(fetch(own ? new Request(e.request, { cache:'no-cache' }) : e.request).then(res => {
    if (res.ok && (url.origin === location.origin || url.hostname.includes('jsdelivr') || url.hostname.includes('gstatic') || url.hostname.includes('googleapis'))) {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy));
    }
    return res;
  }).catch(() => caches.match(e.request).then(r => r || (e.request.mode === 'navigate' ? caches.match('index.html') : undefined))));
});
