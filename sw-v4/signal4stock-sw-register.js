// PWA Service Worker 註冊（外部檔 — 相容嚴格 CSP: script-src 'self'）
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // 2026-08-21 邦尼：updateViaCache:'none' — SW 腳本更新檢查繞過 HTTP 快取
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(err => {
      console.warn('⚠️ 天樞 SW 註冊失敗', err);
    });
  });
}
