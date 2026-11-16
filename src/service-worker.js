// src/service-worker.js
/* eslint-disable no-restricted-globals */

const { clientsClaim } = require('workbox-core');
const { ExpirationPlugin } = require('workbox-expiration');
const { precacheAndRoute, createHandlerBoundToURL } = require('workbox-precaching');
const { registerRoute } = require('workbox-routing');
const { CacheFirst, NetworkFirst, StaleWhileRevalidate } = require('workbox-strategies');

clientsClaim();

// 1. Предварительное кэширование (App Shell)
precacheAndRoute(self.__WB_MANIFEST);

// 2. Навигация (HTML)
const fileExtensionRegexp = new RegExp('/[^/?]+\\.[^/]+$');
registerRoute(
  ({ request, url }) => {
    if (request.mode !== 'navigate') return false;
    if (url.pathname.startsWith('/_')) return false;
    if (url.pathname.match(fileExtensionRegexp)) return false;
    return true;
  },
  createHandlerBoundToURL(process.env.PUBLIC_URL + '/index.html')
);

// 3. СТРАТЕГИЯ ДЛЯ API (Органайзер - Приёмы, Клиенты, Профиль)
// Всегда сначала идем в сеть. Если сеть недоступна - берем из кэша.
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/appt/') || url.pathname.startsWith('/api/auth/'),
  new NetworkFirst({
    cacheName: 'api-data-cache',
    networkTimeoutSeconds: 3, // Ждем 3 секунды, если сеть тупит - отдаем кэш
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 }), // Храним сутки
    ],
  })
);

// 4. СТРАТЕГИЯ ДЛЯ СПРАВОЧНИКА ПДТР (Картинки, Мышцы, Органы)
// Сначала берем из кэша. Если нет в кэше - идем в сеть.
registerRoute(
  ({ url, request }) => {
    const isPDRTImage = request.destination === 'image';
    const isPDRTPage = url.pathname.includes('/muscles') || 
                       url.pathname.includes('/organs') || 
                       url.pathname.includes('/meridians') ||
                       url.pathname.includes('/dysfunctions');
    return isPDRTImage || isPDRTPage;
  },
  new CacheFirst({
    cacheName: 'pdtr-reference-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 }), // Храним 30 дней
    ],
  })
);

// 5. СТРАТЕГИЯ ДЛЯ JS И CSS (Обновления кода)
// Сначала сеть, чтобы обновления прилетали сразу
registerRoute(
  ({ request }) => request.destination === 'script' || request.destination === 'style',
  new NetworkFirst({
    cacheName: 'static-resources',
    networkTimeoutSeconds: 3,
  })
);

// 6. Обработка сообщений (для skipWaiting)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});