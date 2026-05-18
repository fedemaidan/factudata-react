// Servido por Firebase Hosting cuando se solicita un asset de /_next/ que ya no
// existe (típicamente un chunk de un build anterior tras un deploy). Tirar un
// error con "ChunkLoadError" hace que el handler global en _app.js recargue la
// página y traiga la versión nueva, en vez de que Firebase responda con
// index.html (HTML) y el browser explote con "Unexpected token '<'".
throw new Error('ChunkLoadError: chunk de build anterior no disponible, recargando');
