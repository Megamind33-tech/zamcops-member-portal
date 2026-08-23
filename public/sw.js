// Minimal service worker so the portal is installable. Network-first for
// documents and static files. API calls are never cached — a stale
// `/api/auth/me` or bootstrap payload is what bounced signed-in members
// back to the login screen on Vercel.
const CACHE = "zamcops-shell-v2";
const SHELL = ["/manifest.webmanifest", "/icon.svg", "/brand/zamcops-logo-mark.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  const isDocument = request.mode === "navigate" || request.destination === "document";
  if (isDocument) {
    event.respondWith(fetch(request).catch(() => caches.match("/") || Response.error()));
    return;
  }

  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(request).then((r) => r || Response.error())),
  );
});
