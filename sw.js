// OGFZACOOP Dashboard Service Worker
// Caches the static app shell only. Never caches Apps Script API calls
// (member ledgers, loan data, notifications) so figures are never stale.

const CACHE_NAME = "ogfzacoop-shell-v1"; // bump this string on every deploy to force refresh

// Confirmed pages from your repo. If your logged-in member/exec/admin
// dashboard pages live at different filenames or on a different
// subdomain/host, add their paths here too.
const APP_SHELL = [
  "/",
  "/index.html",
  "/login.html",
  "/register.html",
  "/manifest.json",
  "/offline.html",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

// Requests to never cache — Apps Script Web App calls and anything dynamic.
const NEVER_CACHE_HOSTS = [
  "script.google.com",
  "script.googleusercontent.com"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never intercept Apps Script API traffic — always go to network.
  if (NEVER_CACHE_HOSTS.some((host) => url.hostname.includes(host))) {
    return;
  }

  // Only handle same-origin GET requests for the static shell.
  if (event.request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached || caches.match("/offline.html"));

      // Stale-while-revalidate: serve cached instantly, update cache in background.
      return cached || networkFetch;
    })
  );
});
