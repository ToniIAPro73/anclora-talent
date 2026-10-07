/** Natural pixel size of an image source, measured once per src (data URL or remote). */
const cache = new Map<string, Promise<{ width: number; height: number }>>();

export function loadImageSize(src: string): Promise<{ width: number; height: number }> {
  const cached = cache.get(src);
  if (cached) return cached;
  const promise = new Promise<{ width: number; height: number }>((resolve) => {
    if (typeof Image === 'undefined') return resolve({ width: 0, height: 0 });
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve({ width: 0, height: 0 });
    image.src = src;
  });
  cache.set(src, promise);
  return promise;
}
