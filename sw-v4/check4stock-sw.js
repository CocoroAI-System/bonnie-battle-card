// 台股選股健診評分系統 — Service Worker v4 (2026-08-21 邦尼根治版)
// 策略：Navigation + JS/CSS = Network-First（HTML/JS 更新免 bump CACHE_NAME，§6 鐵則痛點根治）
//       靜態資源（icons/manifest）= Cache-First ｜ API = 永不快取
// 背景：Kevin 一般模式 0 pageview — 舊版全站 SWR 連 HTML 都先回快取 → 舊 app.js（無 analytics）一直殘留
// 修復：導覽請求 + app.js/style.css 永遠先問網路 → 每次開站必拿最新 HTML+JS → analytics 必生效
const CACHE_NAME = 'check4stock-v4-20260821a';
const PRECACHE_URLS = ['/', 'style.css', 'app.js', 'manifest.json', 'icon-192.png', 'icon-512.png', 'icon-maskable.png', 'sw-register.js'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  // API / 登入請求永不快取
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return;  // v4.1 邦尼：auth 路徑永不快取（防登入狀態過期）

  const isNav = req.mode === 'navigate';
  const isCode = url.pathname.endsWith('app.js') || url.pathname.endsWith('style.css');

  // 🟢 Network-First：HTML 導覽 + JS/CSS — 永遠先問網路，失敗才 fallback 快取（離線）
  if (isNav || isCode) {
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone));
        }
        return res;
      }).catch(() => caches.match(req).then(hit => hit || caches.match('/')))
    );
    return;
  }

  // 🟡 靜態資源（icons/manifest 等）：Cache-First
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const clone = res.clone();
      caches.open(CACHE_NAME).then(c => c.put(req, clone));
      return res;
    }).catch(() => caches.match('/')))
  );
});
