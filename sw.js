const CACHE_NAME = 'navi-v9.4-cache';
const urlsToCache = ['/', '/index.html', '/style.css', '/script.js', '/manifest.json', '/favicon.png', '/logo-512.png'];

self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(cacheNames => Promise.all(cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))))); });
self.addEventListener('fetch', event => { event.respondWith(caches.match(event.request).then(response => response || fetch(event.request))); });

self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'NAVI | Co-Piloto';
  const options = {
    body: data.body || 'Nova mensagem do seu co-piloto',
    icon: data.icon || '/logo-512.png',
    badge: '/favicon.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/?wake=true' } // 6. Acorda o app com parâmetro
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url || '/?wake=true'));
});

self.addEventListener('periodicsync', event => {
  if (event.tag === 'navi-periodic-check') {
    event.waitUntil((async () => {
      const now = new Date(); const hour = now.getHours(); let title = '', body = '';
      if (hour >= 7 && hour < 9) { title = 'NAVI | Bom dia!'; body = 'Hora do checklist matinal.'; }
      else if (hour >= 18 && hour < 20) { title = 'NAVI | Missão do dia'; body = 'Você completou sua missão?'; }
      else if (hour >= 21 && hour < 23) { title = 'NAVI | Boa noite'; body = 'Registre seu humor.'; }
      if (title && body) self.registration.showNotification(title, { body, icon: '/logo-512.png', badge: '/favicon.png', vibrate: [200, 100, 200], data: { url: '/?wake=true' } });
    })());
  }
});