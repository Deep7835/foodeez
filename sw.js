// Offline cache. Bump VERSION whenever you change menu.js / prices so phones get the update.
const VERSION = "foodeez-v5";
const ASSETS = [
  "./", "index.html", "styles.css", "app.js", "menu.js", "vendor/qrcode.js", "manifest.webmanifest",
  "img/logo.png", "img/icon-192.png", "img/icon-512.png", "img/icon-180.png",
  "img/steam.jpg", "img/fried.jpg", "img/kurkure.jpg",
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Network first (so price changes show immediately), cache as fallback when offline.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(VERSION).then((c) => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match("index.html")))
  );
});
