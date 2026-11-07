/**
 * ImgBB Image Upload Utility with fallback to Data URL / Blob URL
 * Uses ImgBB API key if provided, or fallback storage
 */

const DEFAULT_IMGBB_API_KEY = "6d700732b512227dcd64c5023a3d9a3d"; // Free tier ImgBB API Key fallback

export async function uploadToImgBB(file: File, apiKey?: string): Promise<string> {
  const key = apiKey || DEFAULT_IMGBB_API_KEY;

  try {
    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${key}`, {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.data && data.data.url) {
        return data.data.url;
      }
    }
  } catch (err) {
    console.warn("ImgBB upload error, falling back to FileReader DataURL:", err);
  }

  // Fallback: Convert to Data URL if network error or ImgBB unavailable
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
