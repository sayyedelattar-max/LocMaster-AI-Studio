// sw.js — Service Worker for PWA offline-first

const CACHE_NAME = 'locmaster-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/main.css',
  '/css/components.css',
  '/css/rtl.css',
  '/js/config.js',
  '/js/auth.js',
  '/js/supabase-client.js',
  '/js/parser.js',
  '/js/ai-client.js',
  '/js/tm.js',
  '/js/qa.js',
  '/js/lqi.js',
  '/js/ui-segments.js',
  '/js/ui-preview.js',
  '/js/ui-reports.js',
  '/js/export.js',
  '/js/app.js'
];

// Install
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch - network first, fallback to cache
self.addEventListener('fetch', e => {
  // Skip non-GET and external CDN requests
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('googleapis.com') ||
      e.request.url.includes('anthropic.com') ||
      e.request.url.includes('supabase.co')) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
