/**
 * Borra todo el almacenamiento del navegador: cookies, localStorage,
 * sessionStorage, Cache API e IndexedDB. Útil para sign out completo.
 */
export const clearAllBrowserStorage = async () => {
  localStorage.clear();
  sessionStorage.clear();

  // Cookies
  document.cookie.split(";").forEach((c) => {
    const name = c.replace(/^\s+/, "").split("=")[0];
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
  });

  // Cache API (Service Worker caches)
  if (typeof caches !== "undefined") {
    const names = await caches.keys();
    await Promise.all(names.map((name) => caches.delete(name)));
  }

  // IndexedDB: borrar todas las bases si la API está disponible
  if (typeof indexedDB?.databases === "function") {
    const dbs = await indexedDB.databases();
    await Promise.all(
      dbs.map(
        (db) =>
          new Promise((resolve) => {
            const req = indexedDB.deleteDatabase(db.name);
            req.onsuccess = resolve;
            req.onerror = resolve;
          })
      )
    );
  } else {
    const known = ["factudata-conversaciones", "firebase-installations-db", "firebase-heartbeat-database"];
    await Promise.all(
      known.map(
        (name) =>
          new Promise((resolve) => {
            const req = indexedDB.deleteDatabase(name);
            req.onsuccess = resolve;
            req.onerror = resolve;
          })
      )
    );
  }
};
