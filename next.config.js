const { withSentryConfig } = require('@sentry/nextjs');

const nextConfig = {
  reactStrictMode: true,
  trailingSlash: true,
  transpilePackages: ['@mui/x-charts'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        fontkit: false,
      };
    }
    return config;
  },
};

module.exports = withSentryConfig(nextConfig, {
  org: 'sorbydata',
  project: 'frontend',
  silent: true,
  hideSourceMaps: true,
});
