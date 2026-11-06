/* Painel Lumi Lux — service worker.
   Guarda apenas os ficheiros do painel. Todos os outros pedidos do site
   passam ao lado deste worker, sem interferência. */

var CACHE = 'lumilux-painel-v1';
var FONTES = 'lumilux-fontes-v1';

var FICHEIROS = [
  '/painel',
  '/painel.html',
  '/painel-manifest.json',
  '/painel-icon-192.png',
  '/painel-icon-512.png',
  '/painel-icon-180.png',
  '/painel-icon-maskable.png'
];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(FICHEIROS.map(function (f) {
        return c.add(new Request(f, { cache: 'reload' })).catch(function () {});
      }));
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (nomes) {
      return Promise.all(nomes.map(function (n) {
        if (n !== CACHE && n !== FONTES) return caches.delete(n);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;

  var url;
  try { url = new URL(e.request.url); } catch (err) { return; }

  /* Tipos de letra do Google: guarda depois de ir buscar uma vez. */
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(FONTES).then(function (c) {
        return c.match(e.request).then(function (r) {
          if (r) return r;
          return fetch(e.request).then(function (res) {
            try { c.put(e.request, res.clone()); } catch (err) {}
            return res;
          });
        });
      }).catch(function () { return fetch(e.request); })
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  /* Só os ficheiros do painel. O resto do site não é tocado. */
  if (FICHEIROS.indexOf(url.pathname) === -1) return;

  e.respondWith(
    fetch(e.request).then(function (res) {
      if (res && res.ok) {
        var copia = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copia); }).catch(function () {});
      }
      return res;
    }).catch(function () {
      return caches.match(e.request).then(function (r) {
        return r || caches.match('/painel');
      });
    })
  );
});
