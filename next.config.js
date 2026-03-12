module.exports = {
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
