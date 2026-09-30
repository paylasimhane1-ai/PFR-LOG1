// Service Worker for LogiPortal Web Push & Background Notifications
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// 1. Web Push Bildirimi (Uygulama tamamen kapalı olsa bile işletim sisteminden gelen sinyal)
self.addEventListener('push', (event) => {
  let title = 'LogiPortal | Saha Bildirimi';
  let options = {
    body: 'Yeni bir rampa / araç operasyon bildirimi var.',
    icon: '/pwa-192x192.png',
    badge: '/p-logo-64.png',
    tag: 'pfr-logistics-alert-' + Date.now(),
    vibrate: [300, 150, 300, 150, 500],
    renotify: true,
    requireInteraction: true,
    data: { url: '/' }
  };

  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title || title;
      options.body = data.body || options.body;
      options.icon = data.icon || '/pwa-192x192.png';
      options.badge = '/p-logo-64.png';
      options.tag = data.tag || options.tag;
      if (data.url) options.data.url = data.url;
    } catch (e) {
      const text = event.data.text();
      if (text) options.body = text;
    }
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

// 2. Periyodik Arka Plan Senkronizasyonu (Background Sync / Periodic Sync)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'pfr-check-notifications') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        // Eğer açık pencere yoksa arka plan kontrolü yap
        if (!clients || clients.length === 0) {
          // İlgili kontroller yapılabilir
        }
      })
    );
  }
});

// 3. Client'tan gelen anlık bildirim istekleri
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    const finalOptions = {
      ...options,
      icon: options.icon || '/pwa-192x192.png',
      badge: '/p-logo-64.png',
      vibrate: [300, 150, 300, 150, 500],
      renotify: true
    };
    self.registration.showNotification(title, finalOptions);
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
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
