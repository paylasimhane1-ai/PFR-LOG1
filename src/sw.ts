/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null } | string>;
};

// Workbox precache & outdated cache cleanup (static shell assets only; never caches Firestore/API traffic)
cleanupOutdatedCaches();
const precacheManifest = self.__WB_MANIFEST || [];
precacheAndRoute(precacheManifest);

// Take control immediately once activated via user confirmation (SKIP_WAITING) or first install
clientsClaim();

// Serve precached SPA shell for offline navigation when index.html is in the build manifest
const hasIndexHtml =
  Array.isArray(precacheManifest) &&
  precacheManifest.some((entry) => {
    const url = typeof entry === 'string' ? entry : entry.url;
    return url === '/index.html' || url === 'index.html';
  });

if (hasIndexHtml) {
  registerRoute(
    new NavigationRoute(createHandlerBoundToURL('/index.html'), {
      denylist: [/^\/api\//, /^\/__/],
    })
  );
}

// Cache Google Fonts stylesheets and font files cleanly without touching live Firebase/API domains
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
    ],
  })
);

registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'gstatic-fonts-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
    ],
  })
);

// 1. Web Push Bildirimi (Uygulama tamamen kapalı olsa bile işletim sisteminden gelen sinyal)
self.addEventListener('push', (event) => {
  let title = 'LogiPortal | Saha Bildirimi';
  const options: NotificationOptions & {
    vibrate?: number[];
    renotify?: boolean;
    badge?: string;
    tag?: string;
    data?: { url: string };
  } = {
    body: 'Yeni bir rampa / araç operasyon bildirimi var.',
    icon: '/pwa-192x192.png',
    badge: '/p-logo-64.png',
    tag: 'pfr-logistics-alert-' + Date.now(),
    vibrate: [300, 150, 300, 150, 500],
    renotify: true,
    requireInteraction: true,
    data: { url: '/' },
  };

  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title || title;
      options.body = data.body || options.body;
      options.icon = data.icon || '/pwa-192x192.png';
      options.badge = '/p-logo-64.png';
      options.tag = data.tag || options.tag;
      if (data.url && options.data) options.data.url = data.url;
    } catch {
      const text = event.data.text();
      if (text) options.body = text;
    }
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

// 2. Periyodik Arka Plan Senkronizasyonu (Background Sync / Periodic Sync)
self.addEventListener('periodicsync', (event: Event & { tag?: string; waitUntil?: (p: Promise<unknown>) => void }) => {
  if (event.tag === 'pfr-check-notifications' && typeof event.waitUntil === 'function') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        if (!clients || clients.length === 0) {
          // Arka plan kontrol noktası
        }
      })
    );
  }
});

// 3. Client'tan gelen güncelleme (SKIP_WAITING) ve anlık bildirim istekleri
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options = {} } = event.data;
    const finalOptions: NotificationOptions & { vibrate?: number[]; renotify?: boolean } = {
      ...options,
      icon: options.icon || '/pwa-192x192.png',
      badge: '/p-logo-64.png',
      vibrate: [300, 150, 300, 150, 500],
      renotify: true,
    };
    event.waitUntil(self.registration.showNotification(title, finalOptions));
  }
});

// 4. Bildirime Tıklama Olayı (Bildirime tıklandığında uygulamayı aç/öne getir)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client && typeof client.navigate === 'function') {
            client.navigate(targetUrl).catch(() => {});
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
