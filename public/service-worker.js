// public/service-worker.js

const CACHE_NAME = "asmath-pwa-cache-v3";
const OFFLINE_URL = "/offline";

const PRECACHE_URLS = [
  "/",
  "/student",
  "/teacher",
  "/auth/login",
  OFFLINE_URL,
  "/manifest.json",
  "/favicon.ico",
  "/icons/icon-512x512.png",
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

  // 1) Page navigations → network first, then cache, then /offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          try {
            const copy = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(request, copy))
              .catch(() => {});
          } catch (err) {
            console.warn("[SW] clone error (navigate):", err);
          }
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

  // 2) IMAGES (any origin) → cache first, then network
  if (request.destination === "image") {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          // refresh in background
          fetch(request)
            .then((networkResponse) => {
              try {
                if (networkResponse && networkResponse.status === 200) {
                  const copy = networkResponse.clone();
                  caches
                    .open(CACHE_NAME)
                    .then((cache) => cache.put(request, copy))
                    .catch(() => {});
                }
              } catch (err) {
                console.warn("[SW] clone error (image refresh):", err);
              }
            })
            .catch(() => {});
          return cached;
        }

        // Not cached yet: fetch and store
        return fetch(request)
          .then((networkResponse) => {
            try {
              if (networkResponse && networkResponse.status === 200) {
                const copy = networkResponse.clone();
                caches
                  .open(CACHE_NAME)
                  .then((cache) => cache.put(request, copy))
                  .catch(() => {});
              }
            } catch (err) {
              console.warn("[SW] clone error (image fetch):", err);
            }
            return networkResponse;
          })
          .catch(() => {
            return new Response("", { status: 503, statusText: "Offline" });
          });
      })
    );
    return;
  }

  // 3) Same-origin static assets (JS, CSS, etc.) → cache first, then update
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // refresh in background
          fetch(request)
            .then((networkResponse) => {
              try {
                if (networkResponse && networkResponse.status === 200) {
                  const copy = networkResponse.clone();
                  caches
                    .open(CACHE_NAME)
                    .then((cache) => cache.put(request, copy))
                    .catch(() => {});
                }
              } catch (err) {
                console.warn("[SW] clone error (static refresh):", err);
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        // not cached yet → try network, then cache it
        return fetch(request)
          .then((networkResponse) => {
            try {
              if (networkResponse && networkResponse.status === 200) {
                const copy = networkResponse.clone();
                caches
                  .open(CACHE_NAME)
                  .then((cache) => cache.put(request, copy))
                  .catch(() => {});
              }
            } catch (err) {
              console.warn("[SW] clone error (static fetch):", err);
            }
            return networkResponse;
          })
          .catch(async () => {
            const anyCached = await caches.match(request);
            if (anyCached) return anyCached;

            return new Response("Offline and resource not cached.", {
              status: 503,
              statusText: "Service Unavailable",
            });
          });
      })
    );
  }
});
