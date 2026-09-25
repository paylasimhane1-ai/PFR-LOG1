// Service Worker for YMS Web Push & Background Notifications
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'Lojistik Depo & Rampa Bildirimi';
    const options = {
      body: data.body || 'Yeni bir operasyon bildirimi var.',
      icon: data.icon || '/favicon.svg',
      badge: '/favicon.svg',
      tag: data.tag || 'yms-push',
      vibrate: [200, 100, 200],
      data: data.data || {}
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('Lojistik Depo Bildirimi', {
        body: text,
        icon: '/favicon.svg'
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
