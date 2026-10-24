/* مِرْقاة — cache update fix
   - Do not precache optional/possibly missing files during installation.
   - Always try the network first for pages so installed mobile apps receive updates.
   - Keep a cached response as an offline fallback.
*/
const CACHE_NAME = 'mirqat-app-v7';
const CACHE_PREFIX = 'mirqat-';

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const isNavigation = request.mode === 'navigate' || request.destination === 'document';

    try {
      // Navigation uses a fresh network response, avoiding stale HTML in installed PWAs.
      const response = isNavigation
        ? await fetch(request, { cache: 'no-store' })
        : await fetch(request);

      if (response && response.ok) {
        try {
          await cache.put(request, response.clone());
          // Save a stable index fallback as well for offline opens from the site root.
          if (isNavigation) {
            const indexUrl = new URL('index.html', self.registration.scope).href;
            await cache.put(indexUrl, response.clone());
          }
        } catch (cacheError) {
          // A cache write failure should never prevent the app from opening online.
        }
      }
      return response;
    } catch (networkError) {
      const cached = await cache.match(request);
      if (cached) return cached;

      if (isNavigation) {
        const indexUrl = new URL('index.html', self.registration.scope).href;
        const indexFallback = await cache.match(indexUrl);
        if (indexFallback) return indexFallback;
      }

      return new Response(
        'لا يوجد اتصال بالإنترنت، ولم توجد نسخة محفوظة من هذه الصفحة. افتح التطبيق مرة أخرى بعد الاتصال بالإنترنت.',
        { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      );
    }
  })());
});
