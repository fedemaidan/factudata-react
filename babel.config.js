/**
 * Babel config compartido entre jest y Next.js.
 *
 * Next.js detecta este archivo y desactiva SWC (ver "Disabled SWC as replacement
 * for Babel" en los logs). Por eso la rama no-test devuelve `next/babel`, que
 * incluye preset-react + las transformaciones que Next.js necesita en dev/build.
 */
module.exports = (api) => {
  if (api.env('test')) {
    return {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }],
      ],
    };
  }
  return {
    presets: ['next/babel'],
  };
};
