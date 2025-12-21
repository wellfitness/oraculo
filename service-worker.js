/**
 * Service Worker para Oráculo PWA
 * Estrategia: Network-first para HTML/JS, Cache-first para CSS/imágenes
 */

const CACHE_NAME = 'oraculo-v1.7';
const STATIC_CACHE = 'oraculo-static-v1.7';

// Archivos a cachear en la instalación
const STATIC_ASSETS = [
  '/',
  '/app.html',
  '/index.html',
  '/css/style.css',
  '/landing.css',
  '/favicon.svg',
  '/manifest.json',
  // Módulos JS principales
  '/js/app.js',
  '/js/storage.js',
  '/js/modules/dashboard.js',
  '/js/modules/values.js',
  '/js/modules/kanban.js',
  '/js/modules/projects.js',
  '/js/modules/habits.js',
  '/js/modules/calendar.js',
  '/js/modules/journal.js',
  '/js/modules/achievements.js',
  '/js/modules/settings.js',
  '/js/modules/help.js',
  // Componentes
  '/js/components/daily-setup-modal.js',
  '/js/components/spontaneous-achievement.js',
  '/js/components/calm-timer.js',
  // Data y utils
  '/js/data/burkeman.js',
  '/js/utils/achievements-calculator.js'
];

// Recursos externos que queremos cachear
const EXTERNAL_RESOURCES = [
  'https://fonts.googleapis.com/css2?family=Righteous&family=ABeeZee:ital@0;1&display=swap',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0'
];

// Instalación: cachear assets estáticos
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Cacheando assets estáticos');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // Forzar activación inmediata
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Error al cachear:', error);
      })
  );
});

// Activación: limpiar caches antiguas y forzar recarga
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando Service Worker v1.7...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        // Eliminar TODAS las caches antiguas (no solo oraculo-)
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== STATIC_CACHE && cacheName !== CACHE_NAME;
            })
            .map((cacheName) => {
              console.log('[SW] Eliminando cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Caches limpiadas, tomando control...');
        return self.clients.claim();
      })
      .then(() => {
        // Pequeño delay para asegurar que claim() se complete
        return new Promise(resolve => setTimeout(resolve, 100));
      })
      .then(() => {
        return self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      })
      .then((clients) => {
        console.log('[SW] Clientes encontrados:', clients.length);
        clients.forEach((client) => {
          if (client.url && 'navigate' in client) {
            console.log('[SW] Forzando recarga:', client.url);
            // Añadir timestamp para forzar bypass de cualquier cache
            const url = new URL(client.url);
            url.searchParams.set('_swv', '1.7');
            client.navigate(url.toString());
          }
        });
      })
  );
});

// Fetch: estrategia de cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo manejar requests GET
  if (request.method !== 'GET') return;

  // Ignorar extensiones de Chrome, etc.
  if (!url.protocol.startsWith('http')) return;

  // Para recursos locales
  if (url.origin === location.origin) {
    // HTML y JS: Network-first (siempre obtener la última versión)
    const isHtmlOrJs = request.url.endsWith('.html') ||
                       request.url.endsWith('.js') ||
                       request.url === url.origin + '/';

    if (isHtmlOrJs) {
      event.respondWith(
        fetch(request)
          .then((response) => {
            // Guardar copia en cache para offline
            const responseToCache = response.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
            return response;
          })
          .catch(() => {
            // Si falla la red, usar cache (offline)
            return caches.match(request).then((cached) => {
              if (cached) return cached;
              // Fallback a app.html para rutas HTML
              if (request.headers.get('accept')?.includes('text/html')) {
                return caches.match('/app.html');
              }
            });
          })
      );
      return;
    }

    // CSS, imágenes, fonts locales: Cache-first (no cambian tan seguido)
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request).then((response) => {
            if (response.status === 200) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
            return response;
          });
        })
    );
    return;
  }

  // Para recursos externos (fonts): Network-first con fallback a cache
  if (url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cachear fonts para uso offline
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(request, responseToCache));
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }
});

// Mensaje para forzar actualización
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
