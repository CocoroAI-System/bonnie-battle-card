// ========================================================================
// 邦尼台股作戰卡 Service Worker v1.1
// 策略：導覽請求 Network-First（每天都要最新卡片）+ 離線快取備援
//       靜態資源（圖示/manifest）Cache-First
// ------------------------------------------------------------------------
// 2026-09-22 修正（Kevin 核可）：導覽快取鍵改為「請求自身 URL」
//   舊版 `c.put('./', copy)` 把**任何**導覽結果都存進根路徑鍵 →
//   開過 archive/盤後分析_*.html 就覆蓋首頁快取，離線/連線不穩時
//   開首頁會先跑出盤後分析頁（錯頁）。CACHE 升 v3 以清掉舊快取。
// ========================================================================
const CACHE = 'battle-card-v3';
const OFFLINE_URL = './'   // 離線外殼（precache 的站台首頁）
const PRECACHE = [
  './',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;

  // 導覽請求（開網站/開 App）：Network-First，失敗才用快取（離線）
  // 快取鍵＝req 自身 URL（每頁各自一份，互不覆蓋）；失敗回應（404/500）不快取
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then(r => r || caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  // 靜態資源：Cache-First
  event.respondWith(
    caches.match(req).then(hit =>
      hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      })
    )
  );
});
