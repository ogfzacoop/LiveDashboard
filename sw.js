// OGFZACOOP Dashboard Service Worker
// Caches static assets only (icons, manifest). Deliberately does NOT
// intercept page navigations (index.html, login.html, register.html, etc.)
//
// WHY: your server responds to /login.html with a 307 redirect. Chrome
// enforces a strict rule that a service worker may never resolve a page
// navigation with a redirected Response - doing so throws net::ERR_FAILED.
// The safest fix is to never let the service worker touch navigations at
// all: the browser then requests these pages directly, exactly as it
// would with no service worker present. Static assets (icons, manifest,
// this file) are unaffected by this restriction and still get cached.

const CACHE_NAME = "ogfzacoop-shell-v3";

const APP_SHELL = [
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-192-maskable.png",
  "/icons/icon-512-maskable.png"
];

const NEVER_CACHE_HOSTS = [
  "script.google.com",
  "script.googleusercontent.com"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch((err) => console.error("SW install cache.addAll failed:", err))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Never touch page navigations (clicking links, typing a URL, opening
  // the installed app). Let the browser fetch these directly and
  // normally - this is the critical fix.
  if (event.request.mode === "navigate") {
    return;
  }

  const url = new URL(event.request.url);

  if (NEVER_CACHE_HOSTS.some((host) => url.hostname.includes(host))) return;
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        fetch(event.request)
          .then((resp) => {
            if (resp && resp.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resp));
            }
          })
          .catch(() => {});
        return cached;
      }
      return fetch(event.request).then((resp) => {
        if (resp && resp.status === 200) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return resp;
      });
    })
  );
});
