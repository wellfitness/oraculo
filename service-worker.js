/**
 * Service Worker para Oráculo PWA
 * Estrategia: Cache-first para assets estáticos, Network-first para datos
 */

const CACHE_NAME = 'oraculo-v1.3';
const STATIC_CACHE = 'oraculo-static-v1.3';

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
  '/js/utils/dates.js',
  '/js/utils/ics.js',
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

  // Para recursos locales: Cache-first
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // Devolver desde cache
            return cachedResponse;
          }

          // Si no está en cache, buscar en red y cachear
          return fetch(request)
            .then((response) => {
              // No cachear respuestas no válidas
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }

              // Clonar respuesta (se consume una vez)
              const responseToCache = response.clone();

              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseToCache);
                });

              return response;
            })
            .catch(() => {
              // Offline fallback para HTML
              if (request.headers.get('accept').includes('text/html')) {
                return caches.match('/app.html');
              }
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
