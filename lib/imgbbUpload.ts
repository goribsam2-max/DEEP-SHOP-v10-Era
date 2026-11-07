/**
 * ImgBB Image Upload Utility with fast canvas compression fallback
 */

const DEFAULT_IMGBB_API_KEY = "6d700732b512227dcd64c5023a3d9a3d";

export async function uploadToImgBB(file: File, apiKey?: string): Promise<string> {
  const key = apiKey || DEFAULT_IMGBB_API_KEY;

  try {
    const formData = new FormData();
    formData.append("image", file);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 sec max timeout for API

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${key}`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.data && data.data.url) {
        return data.data.url;
      }
    }
  } catch (err) {
    console.warn("ImgBB upload error or timeout, compressing image locally:", err);
  }

  // Canvas-compressed DataURL fallback (~40-60KB lightweight image)
  return compressImageToDataUrl(file);
}

function compressImageToDataUrl(file: File, maxWidth = 800, quality = 0.65): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        } else {
          resolve((e.target?.result as string) || "");
        }
      };
      img.onerror = () => resolve((e.target?.result as string) || "");
      img.src = (e.target?.result as string) || "";
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}
