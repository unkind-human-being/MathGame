// public/service-worker.js

// 🔹 Change this when you update what gets cached
const CACHE_NAME = "asmath-pwa-cache-v1";

const OFFLINE_URL = "/offline";

// 🔹 Files to precache (must be reachable when online)
const PRECACHE_URLS = [
  "/",                 // Home page (app/page.tsx)
  OFFLINE_URL,         // Offline fallback page
  "/manifest.json",    // PWA manifest
  "/favicon.ico",
  "/icons/icon/512x512.png"
  // Add more game assets here if you want them always available offline:
  // "/sounds/correct.mp3",
  // "/sounds/wrong.mp3",
  // "/images/logo.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  // Activate this service worker immediately after installation
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
  // Take control of all clients as soon as this SW activates
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // 🔹 1. Handle full page navigations
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Save a copy in cache for future offline use
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          // If network fails, try cached version of this page
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;

          // If not in cache, fall back to the offline page
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  // 🔹 2. Handle same-origin static assets (JS, CSS, images, etc.)
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached asset immediately…
          // …and refresh it in the background
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) =>
                  cache.put(request, networkResponse.clone())
                );
              }
            })
            .catch(() => {
              // Ignore network errors for background refresh
            });

          return cachedResponse;
        }

        // If not cached yet → try network, then cache it
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
            // If offline and not in cache at all
            const anyCached = await caches.match(request);
            if (anyCached) return anyCached;

            // Last resort: plain offline response
            return new Response("Offline and resource not cached.", {
              status: 503,
              statusText: "Service Unavailable"
            });
          });
      })
    );
  }

  // 🔹 3. For cross-origin requests, let the browser handle it normally
});
