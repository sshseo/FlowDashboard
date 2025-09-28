const CACHE_NAME = 'flow-dashboard-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// PWA에서 즉시 활성화
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', function(event) {
  // 외부 API 요청은 Service Worker에서 처리하지 않음
  if (event.request.url.includes('apis.data.go.kr') ||
      event.request.url.includes('api.') ||
      event.request.url.startsWith('http') && !event.request.url.includes(self.location.origin)) {
    return; // 외부 API는 브라우저가 직접 처리하도록 함
  }

  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          return response;
        }
        return fetch(event.request).catch(function(error) {
          // 네트워크 요청 실패 시 에러를 무시하고 undefined 반환
          console.log('Fetch failed for:', event.request.url, error);
          return undefined;
        });
      }
    )
  );
});