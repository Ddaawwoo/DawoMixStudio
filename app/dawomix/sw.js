const CACHE_NAME = 'dawomix-v25'; // Změň verzi, pokud aktualizuješ soubory
const urlsToCache = [
    './index.html',
    './gdrive-advanced.js',
    './dropbox-advanced.js',
    './manifest.json',
    './icons/icon-192x192.png',
    './icons/icon-512x512.png',
    './logo.png',
    './source.png',
    './mega.png',
    './googledrive.png',
    './dropbox.png',
    './settings.png'
];

// Instalace Service Workeru a uložení souborů do cache
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache byla otevřena');
                // Add entries separately. Cache.addAll() rejects the whole install
                // when redirects normalize two requests to the same cache key.
                return Promise.all(urlsToCache.map(url => cache.add(url)));
            })
    );
    self.skipWaiting();
});

// Zachytávání požadavků: HTML vždy zkusí nejdřív síť, assety mohou zůstat cache-first.
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
                    return response;
                })
                .catch(async () => {
                    const cachedPage = await caches.match('./index.html');
                    return cachedPage || new Response('Aplikace je momentálně offline.', {
                        status: 503,
                        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
                    });
                })
        );
        return;
    }

    const isStaticAsset = ['script', 'style', 'image', 'font'].includes(event.request.destination);
    if (!isStaticAsset) return;

    const networkResponse = fetch(event.request).then(async response => {
        if (response.ok || response.type === 'opaque') {
            // Clone before returning the response. Once the browser starts reading its
            // body, calling clone() asynchronously would throw "body is already used".
            const responseForCache = response.clone();
            try {
                const cache = await caches.open(CACHE_NAME);
                await cache.put(event.request, responseForCache);
            } catch (error) {
                console.warn('Asset se nepodařilo uložit do cache:', event.request.url, error);
            }
        }
        return response;
    });

    event.waitUntil(networkResponse.then(() => undefined).catch(() => undefined));
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) return cachedResponse;
            return networkResponse.catch(() => new Response('', {
                status: 504,
                statusText: 'Gateway Timeout'
            }));
        })
    );
});

// Mazání starých verzí cache při aktivaci nového Service Workeru
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(cacheNames.map(cacheName => {
                    if (CACHE_NAME !== cacheName) return caches.delete(cacheName);
                }));
            })
            .then(() => self.clients.claim())
    );
});
