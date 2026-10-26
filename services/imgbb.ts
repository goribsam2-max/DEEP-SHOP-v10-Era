// High-performance client-side image compression & optimizer
export const compressImage = async (
  file: File,
  maxWidth = 1280,
  maxHeight = 1280,
  quality = 0.8
): Promise<string> => {
  return new Promise((resolve) => {
    // If SVG or tiny gif, return as-is
    if (file.type === 'image/svg+xml' || (file.type === 'image/gif' && file.size < 500 * 1024)) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve('');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Maintain aspect ratio while clamping max dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          const fallbackReader = new FileReader();
          fallbackReader.onload = () => resolve((fallbackReader.result as string) || '');
          fallbackReader.onerror = () => resolve('');
          fallbackReader.readAsDataURL(file);
          return;
        }

        // Keep small PNGs lossless; convert heavy PNG screenshots (>250KB) to crisp JPEG for fast uploads
        const keepPng = file.type === 'image/png' && file.size <= 250 * 1024;
        if (!keepPng) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const mimeType = keepPng ? 'image/png' : 'image/jpeg';
        const compressedBase64 = canvas.toDataURL(mimeType, quality);
        URL.revokeObjectURL(objectUrl);
        resolve(compressedBase64);
      } catch {
        URL.revokeObjectURL(objectUrl);
        resolve('');
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      const fallbackReader = new FileReader();
      fallbackReader.onload = () => resolve((fallbackReader.result as string) || '');
      fallbackReader.onerror = () => resolve('');
      fallbackReader.readAsDataURL(file);
    };
    img.src = objectUrl;
  });
};

// Generates a tiny blurred micro-thumbnail for progressive chat image loading (~500 bytes)
export const generateMicroThumb = async (file: File): Promise<string> => {
  return compressImage(file, 48, 48, 0.35);
};

// Uploads a processed base64 dataUrl (or passes through an existing https:// URL) via backend proxy
export const uploadDataUrlToImgbb = async (
  dataUrl: string,
  name = `photo-${Date.now()}.jpg`,
  options?: { requireRemote?: boolean }
): Promise<string> => {
  if (!dataUrl) {
    if (options?.requireRemote) {
      throw new Error('Missing image data');
    }
    return '';
  }

  if (/^https?:\/\//i.test(dataUrl)) {
    return dataUrl.replace(/^http:\/\//i, 'https://');
  }

  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: dataUrl,
          name,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.url) {
          return String(result.url).replace(/^http:\/\//i, 'https://');
        }
      } else {
        lastErr = new Error(`Upload status ${response.status}`);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      lastErr = err;
    }
  }

  if (options?.requireRemote) {
    throw lastErr instanceof Error ? lastErr : new Error('Failed to upload photo');
  }

  return dataUrl;
};

export const uploadToImgbb = async (
  file: File,
  options?: { requireRemote?: boolean }
): Promise<string> => {
  const compressedBase64 = await compressImage(file);
  return uploadDataUrlToImgbb(compressedBase64, file.name, options);
};
