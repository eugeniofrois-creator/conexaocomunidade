const CACHE = "conexao-static-v79-marca-cartaz";
self.addEventListener("install", (event) =>
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(["/offline.html", "/icon-192.png", "/icon-512.png", "/fundos-paginas.css", "/brand/fundo-offline-v2.webp"])),
  ),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
      self.clients.claim(),
    ]),
  ),
);
self.addEventListener("message", (event) => {
  if (event.data?.type === "ACTIVATE") self.skipWaiting();
});
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match("/offline.html")));
    return;
  }
  if (["/icon-192.png", "/icon-512.png", "/offline.html", "/fundos-paginas.css", "/brand/fundo-offline-v2.webp"].includes(url.pathname))
    event.respondWith(caches.match(event.request).then((r) => r || fetch(event.request)));
});
