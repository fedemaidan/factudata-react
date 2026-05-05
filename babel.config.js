/**
 * Babel config used ONLY for jest (NODE_ENV=test).
 * Next.js 13 sigue usando SWC en build/dev (este config retorna {} fuera de tests).
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
  return {};
};
