// Service worker de l'Ultimate Dashboard : affiche les rappels et ouvre la tâche quand on touche la notification.
// Ne met rien en cache : l'app reste chargée normalement.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { title: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Rappel', {
    body: d.body || '',
    tag: d.tag || undefined,
    renotify: !!d.tag,
    data: { todo: d.todo || null },
    icon: d.icon || undefined,
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const id = e.notification.data && e.notification.data.todo;
  const base = self.registration.scope;
  const url = id ? base + '?tache=' + encodeURIComponent(id) : base;
  e.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of list) {
      if (c.url.startsWith(base)) {
        if (id) c.postMessage({ openTodo: id });
        return c.focus();
      }
    }
    return self.clients.openWindow(url);
  })());
});
