// Wrappers para navegaciones de Next.js que evitan reportar el invariant
// "attempted to hard navigate to the same URL" como un error no manejado.
//
// Este error lo lanza el router de Next cuando se llama a `router.push` o
// `router.replace` y la URL resultante es idéntica a la actual. En esos casos
// no hay nada que navegar, así que silenciamos la rejection en vez de dejar
// que escale a `onunhandledrejection` y termine en Sentry.
//
// Uso:
//   safeRouterReplace(router, { pathname, query }, undefined, { shallow: true });
//   safeRouterPush(router, '/cajas?...');

const isSameUrlInvariant = (err) =>
  typeof err?.message === 'string' &&
  err.message.includes('hard navigate to the same URL');

const handle = (promise) => {
  if (!promise || typeof promise.catch !== 'function') return promise;
  return promise.catch((err) => {
    if (isSameUrlInvariant(err)) return false;
    throw err;
  });
};

export const safeRouterReplace = (router, url, as, options) =>
  handle(router.replace(url, as, options));

export const safeRouterPush = (router, url, as, options) =>
  handle(router.push(url, as, options));
