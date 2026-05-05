/**
 * Config de Jest del frontend. Los presets de Babel se pasan inline a `babel-jest`
 * (en vez de via `babel.config.js`) para que Next.js no detecte un babel config
 * en el proyecto y siga usando SWC en `next dev` / `next build`.
 *
 * `babelrc: false` + `configFile: false` evitan que babel-jest busque archivos
 * de config externos.
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  transform: {
    '^.+\\.jsx?$': ['babel-jest', {
      babelrc: false,
      configFile: false,
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }],
      ],
    }],
  },
  moduleDirectories: ['node_modules', 'src'],
};
