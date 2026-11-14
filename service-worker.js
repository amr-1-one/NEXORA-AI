const CACHE_NAME = "nexora-shell-v20";
const APP_ROOT = new URL("./", self.registration.scope);
const APP_FILES = [
  "./",
  "./index.html",
  "./app.js",
  "./style.css",
  "./manifest.json",
  "./favicon.svg",
  "./icons/nexora-icon.svg",
  "./manifest-style-1.json",
  "./icons/nexora-style-1.svg",
  "./manifest-style-2.json",
  "./icons/nexora-style-2.svg",
  "./manifest-style-3.json",
  "./icons/nexora-style-3.svg",
  "./manifest-style-4.json",
  "./icons/nexora-style-4.svg",
  "./manifest-style-5.json",
  "./icons/nexora-style-5.svg",
  "./manifest-style-6.json",
  "./icons/nexora-style-6.svg",
  "./icons/nexora-icon-1.png",
  "./icons/nexora-icon-2.png",
  "./icons/nexora-icon-3.png",
  "./icons/nexora-icon-4.png",
  "./icons/nexora-icon-5.png",
  "./icons/nexora-icon-6.png"
].map((path) => new URL(path, APP_ROOT).href);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith("nexora-shell-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigation: prefer the latest page, with the cached app shell as offline fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(new URL("./", APP_ROOT).href, copy);
            });
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match(new URL("./", APP_ROOT).href)) ||
            (await cache.match(new URL("./index.html", APP_ROOT).href));
        })
    );
    return;
  }

  // Cache only the app's known static shell files. Never cache API/auth/user data.
  if (!APP_FILES.includes(url.href)) return;

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    }))
  );
});
