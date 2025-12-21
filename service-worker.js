/**
 * Service Worker para Oráculo PWA
 * Estrategia: Network-first para HTML/JS, Cache-first para CSS/imágenes
 */

const CACHE_NAME = 'oraculo-v1.6';
const STATIC_CACHE = 'oraculo-static-v1.6';

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

// Activación: limpiar caches antiguas
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando Service Worker...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Eliminar caches que no sean la versión actual
              return cacheName.startsWith('oraculo-') &&
                     cacheName !== STATIC_CACHE &&
                     cacheName !== CACHE_NAME;
            })
            .map((cacheName) => {
              console.log('[SW] Eliminando cache antigua:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        // Tomar control de todas las páginas inmediatamente
        return self.clients.claim();
      })
      .then(() => {
        // Forzar recarga de todos los clientes (para usuarios con SW antiguo)
        return self.clients.matchAll({ type: 'window' });
      })
      .then((clients) => {
        clients.forEach((client) => {
          // navigate() fuerza recarga con el nuevo SW activo
          if (client.url && 'navigate' in client) {
            console.log('[SW] Recargando cliente:', client.url);
            client.navigate(client.url);
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
