// Servido por Firebase Hosting (rewrite en firebase.json) cuando se pide un
// asset de /_next/ que ya no existe — típicamente un chunk de un build
// anterior. Intentamos un reload simple primero; si en esta sesión ya
// recargamos hace poco y seguimos pidiendo chunks viejos, es probable que el
// HTML esté cacheado o haya un SW interceptando, así que mandamos al cliente a
// /reset.html que limpia storage/SW/caches.
(function () {
  try {
    var KEY = 'sorby-chunk-reloaded-at';
    var last = Number(sessionStorage.getItem(KEY) || 0);
    var now = Date.now();
    if (now - last < 30000) {
      location.replace('/reset.html');
      return;
    }
    sessionStorage.setItem(KEY, String(now));
    location.reload();
  } catch (_) {
    throw new Error('ChunkLoadError: chunk de build anterior no disponible');
  }
})();
