// مِرْقاة - Service Worker
const CACHE_NAME = 'mirqat-v2'; // قم بتغيير الرقم v2 إلى v3 عند كل تحديث كبير
const ASSETS = ['./', './index.html', './manifest.json', './icon.svg', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // لا تقم بتخزين طلبات Firebase أو API أوقات الصلاة في الكاش
  if (e.request.url.includes('firebase') || e.request.url.includes('aladhan')) return;
  
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE_NAME).then(c => c.put(e.request, clone)).catch(() => {});
      return res;
    }).catch(() => cached))
  );
});