import config from 'src/config/config';

export const getImageProxyUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  const base = (config.apiUrl || '').replace(/\/$/, '');
  return `${base}/proxy/image?url=${encodeURIComponent(url)}`;
};
