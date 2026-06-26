/* Service worker mínimo para uso offline e instalación como app. */
const CACHE = "aperturas-v11";
const PIECES = ["wK","wQ","wR","wB","wN","wP","bK","bQ","bR","bB","bN","bP"]
  .map((p) => "assets/pieces/" + p + ".svg");
const ASSETS = [
  "index.html",
  "styles.css",
  "app.js",
  "openings.js",
  "ai.js",
  "manifest.json",
  "icon.svg",
  ...PIECES
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  // Solo gestionamos peticiones de la propia app. Las externas (CDN del modelo
  // Llama, APIs de IA) van directas a la red, sin pasar por la caché.
  if (new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request))
  );
});
