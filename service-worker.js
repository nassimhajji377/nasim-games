const CACHE_NAME = 'nasim-games-v1';
const APP_SHELL = './';
const PRECACHE_URLS = ["./app.js", "./assets/chaque-math-game.png", "./assets/cheque-template.jpg", "./assets/favicon.png", "./assets/hero.png", "./assets/hero2.png", "./assets/icon-192.png", "./assets/icon-512.png", "./assets/icon-math.svg", "./assets/logo.png", "./assets/math1-music.mp3", "./assets/puzzle-perimeter.png", "./cheque-data.js", "./home.css", "./index.html", "./multiplication.html", "./puzzelgame.html", "./puzzelgameapp.js", "./puzzelgamestyle.css", "./style.css"];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll([APP_SHELL, ...PRECACHE_URLS]);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('nasim-games-') && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      if (request.mode === 'navigate') {
        return (await caches.match('./index.html')) || Response.error();
      }
      return Response.error();
    }
  })());
});
