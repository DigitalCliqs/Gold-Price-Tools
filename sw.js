// GoldPriceTools Service Worker v1
// WP-47 PWA: Cache-first for static assets, network-first for live API price data
const CACHE_NAME = 'goldpricetools-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  '/14k-gold-price-per-gram.html',
  '/18k-gold-price-per-gram.html',
  '/10k-gold-price-per-gram.html',
  '/scrap-gold-calculator.html',
  '/silver-price-per-kilo.html',
  '/how-many-grams-in-troy-ounce.html',
  '/about.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = event.request.url;
  // Always fetch live price data fresh from network — never cache
  if (url.includes('gold-api.com') ||
      url.includes('freegoldapi.com') ||
      url.includes('goldpricetoolsworker.io') ||
      url.includes('googletagmanager.com') ||
      url.includes('googlesyndication.com') ||
      url.includes('pagead2.google')) {
    return; // Let browser handle normally
  }
  // Cache-first strategy for static assets
  event.respondWith(
    caches.match(event.request).then(cached =>
      cached || fetch(event.request).catch(() =>
        caches.match('/offline.html')
      )
    )
  );
});
