// public/service-worker.js

// 🔹 Bump this when you change offline assets
const CACHE_NAME = "asmath-pwa-cache-v1";

const OFFLINE_URL = "/offline";

// 🔹 Files to precache
const PRECACHE_URLS = [
  "/",                 // Home page
  OFFLINE_URL,         // Offline fallback page
  "/manifest.json",    // PWA manifest
  "/favicon.ico",
  "/icons/icon/512x512.png"
  // You can add more game assets here (sounds, images, etc.)
  // e.g. "/sounds/correct.mp3"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
          return undefined;
        })
      )
    )
  );
  return self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // 🔹 Page navigations → network first, then offline page
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  // 🔹 Same-origin static assets → cache first, then network update
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Update in background
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) =>
                  cache.put(request, networkResponse.clone())
                );
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const copy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) =>
                cache.put(request, copy)
              );
            }
            return networkResponse;
          })
          .catch(async () => {
            const anyCached = await caches.match(request);
            if (anyCached) return anyCached;

            return new Response("Offline and resource not cached.", {
              status: 503,
              statusText: "Service Unavailable"
            });
          });
      })
    );
  }
  // Cross-origin → default browser behavior
});
