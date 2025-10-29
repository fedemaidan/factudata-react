const loadImageFromFile = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });

const getRotatedBounds = (w, h, radians) => {
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  return { width: Math.round(w * cos + h * sin), height: Math.round(w * sin + h * cos) };
};

export const rotateImageFile = async (file, degrees, mimeOverride) => {
  const radians = (degrees * Math.PI) / 180;
  const img = await loadImageFromFile(file);
  const { width, height } = getRotatedBounds(img.naturalWidth || img.width, img.naturalHeight || img.height, radians);

  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height);
  ctx.translate(width / 2, height / 2);
  ctx.rotate(radians);
  ctx.drawImage(img, -(img.width / 2), -(img.height / 2));

  const targetType = mimeOverride || (file.type?.startsWith('image/') ? file.type : 'image/jpeg');
  const quality = 0.92;

  const blob = await new Promise((res) => canvas.toBlob(res, targetType, quality));
  const ext = targetType.includes('png') ? 'png' : targetType.includes('webp') ? 'webp' : 'jpg';
  const rotatedName = file.name.replace(/\.(\w+)$/i, `_rotated.${ext}`);
  return new File([blob], rotatedName, { type: targetType, lastModified: Date.now() });
};
