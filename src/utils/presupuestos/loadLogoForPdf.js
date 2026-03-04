import config from 'src/config/config';
import api from 'src/services/axiosConfig';

const USE_PROXY_ORIGINS = ['storage.googleapis.com', 'firebasestorage.googleapis.com'];

const shouldUseProxy = (url) =>
  url && USE_PROXY_ORIGINS.some((o) => url.includes(o));

const blobToPngDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const blobUrl = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      URL.revokeObjectURL(blobUrl);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error('Error al cargar imagen'));
    };
    img.src = blobUrl;
  });

export const loadImageAsDataUrl = async (url) => {
  if (!url) return null;
  try {
    let blob;
    if (shouldUseProxy(url)) {
      const base = (config.apiUrl || '').replace(/\/$/, '');
      const proxyUrl = `${base}/presupuestos-profesionales/logo-proxy?url=${encodeURIComponent(url)}`;
      const res = await api.get(proxyUrl, { responseType: 'blob' });
      blob = res.data;
    } else {
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) return null;
      blob = await response.blob();
    }
    return await blobToPngDataUrl(blob);
  } catch (error) {
    console.debug('No se pudo cargar el logo para el PDF', error);
    return null;
  }
};
