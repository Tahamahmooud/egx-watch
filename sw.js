// خدمة التخزين المؤقت — الصفحة تفتح حتى من غير نت، والأسعار دايماً من الشبكة
const CACHE = 'egx-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // بيانات الأسعار: الشبكة أولاً دايماً، من غير تخزين
  if (url.hostname.endsWith('workers.dev') || url.hostname.endsWith('allorigins.win')) {
    e.respondWith(fetch(e.request).catch(() => new Response('{}', { headers: { 'content-type': 'application/json' } })));
    return;
  }
  if (e.request.method !== 'GET') return;
  // ملفات التطبيق: من الكاش وبيتحدث في الخلفية
  e.respondWith(
    caches.match(e.request).then(hit => {
      const net = fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
