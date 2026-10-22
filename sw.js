// Offline support: always try the network first (so updates show straight away),
// fall back to the saved copy when offline. Microsoft and SharePoint calls are never cached.
const CACHE = "ilx-passport-v2";
const FILES = ["./", "./index.html", "./css/styles.css", "./js/app.js", "./js/data.js", "./js/storage.js",
  "./js/config.js", "./js/auth.js", "./manifest.webmanifest",
  "./assets/pws-logo-white.png", "./assets/icon-192.png", "./assets/icon-512.png"];
self.addEventListener("install", e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return; // Graph, sign-in, fonts: straight to network
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request)));
});
