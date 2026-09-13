// OGFZACOOP Dashboard Service Worker
// Caches the static app shell only. Never caches Apps Script API calls
// (member ledgers, loan data, notifications) so figures are never stale.
//
// v2 fix: the fetch handler now ALWAYS resolves with a real Response object.
// The previous version could resolve with `undefined` when both the cache
// and the network lookup failed at the same time, which Chrome shows as
// net::ERR_FAILED / "This site can't be reached" instead of your page.

const CACHE_NAME = "ogfzacoop-shell-v2"; // bumped so every phone force-refreshes the old broken cache

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

const NEVER_CACHE_HOSTS = [
  "script.google.com",
  "script.googleusercontent.com"
];

// A guaranteed, always-available fallback — used only if even offline.html
// somehow isn't cached yet, so the browser never gets an empty response.
const EMERGENCY_FALLBACK = new Response(
  "<!DOCTYPE html><html><body style='font-family:sans-serif;text-align:center;padding:40px;'>" +
  "<h2>Connecting…</h2><p>Please check your internet connection and reopen the app.</p></body></html>",
  { headers: { "Content-Type": "text/html" } }
);

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
  const url = new URL(event.request.url);

  if (NEVER_CACHE_HOSTS.some((host) => url.hostname.includes(host))) return;
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // Serve instantly, refresh cache in background (errors here are fine to ignore).
        fetch(event.request)
          .then((resp) => {
            if (resp && resp.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resp));
            }
          })
          .catch(() => {});
        return cached;
      }

      // Nothing cached — try the network, and guarantee SOME real response no matter what.
      return fetch(event.request)
        .then((resp) => {
          if (resp && resp.status === 200) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return resp;
        })
        .catch(() =>
          caches.match("/offline.html").then((offline) => offline || EMERGENCY_FALLBACK)
        );
    })
  );
});
