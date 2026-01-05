const CACHE_NAME = 'vocabloop-v2';
const STATIC_CACHE_NAME = 'vocabloop-static-v1';

// App shell - essential files for offline functionality
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/icon-192.png',
];

// Install service worker and cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

// Activate and clean old caches
self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_NAME, STATIC_CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !currentCaches.includes(name))
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Determine caching strategy based on request type
function getStrategy(request) {
  const url = new URL(request.url);

  // Static assets (JS, CSS, images) - cache first, network fallback
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2?)$/)) {
    return 'cache-first';
  }

  // HTML pages - network first, cache fallback (for freshest content)
  if (request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
    return 'network-first';
  }

  // API calls or other requests - network only
  return 'network-first';
}

// Cache-first strategy (for static assets)
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return offline fallback if available
    return caches.match('/index.html');
  }
}

// Network-first strategy (for HTML and dynamic content)
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Fallback to cache when offline
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    // For navigation requests, return cached index.html
    if (request.mode === 'navigate') {
      return caches.match('/index.html');
    }
    throw error;
  }
}

// Fetch handler
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!event.request.url.startsWith('http')) {
    return;
  }

  const strategy = getStrategy(event.request);

  if (strategy === 'cache-first') {
    event.respondWith(cacheFirst(event.request));
  } else {
    event.respondWith(networkFirst(event.request));
  }
});

// Handle messages from the app (e.g., skip waiting)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
