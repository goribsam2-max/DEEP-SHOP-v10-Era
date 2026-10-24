/**
 * Client-side Canvas Image Processing & Scam Watermarking Utility
 * - For Scam Posts: Stamps scam report indicator + where the scam happened + Deep Shop verification bar
 * - For Normal Posts: Processes clean high-resolution image with ZERO scam text or watermark
 * - Returns natural dimensions & aspect ratio so post cards adapt dynamically to square/portrait/landscape photos
 */

export interface WatermarkOptions {
  watermarkText?: string;
  subText?: string;
  scamLocation?: string;
  opacity?: number;
  patternDensity?: number;
  fontSize?: number;
  includeBottomBanner?: boolean;
}

export interface ProcessedImageResult {
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
  aspectRatio: number;
}

const dataUrlToBlob = (dataUrl: string): Blob => {
  const arr = dataUrl.split(",");
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

/**
 * Processes a normal social post image cleanly with NO scam text or watermark.
 */
export const processCleanImage = async (
  fileOrUrl: File | string,
  maxDim = 1600
): Promise<ProcessedImageResult> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Unable to create canvas 2D context"));
          return;
        }

        let width = img.naturalWidth || img.width || 800;
        let height = img.naturalHeight || img.height || 800;
        const aspectRatio = Number((width / Math.max(1, height)).toFixed(3));

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        canvas.toBlob(
          (blob) => {
            resolve({
              dataUrl,
              blob: blob || dataUrlToBlob(dataUrl),
              width,
              height,
              aspectRatio,
            });
          },
          "image/jpeg",
          0.9
        );
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (e) => reject(new Error("Failed to load image: " + String(e)));

    if (typeof fileOrUrl === "string") {
      img.src = fileOrUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(fileOrUrl);
    }
  });
};

/**
 * Applies Scam Alert Banner onto an evidence photo showing where the scam occurred and Deep Shop source.
 */
export const applyWatermarkToImage = async (
  fileOrUrl: File | string,
  options: WatermarkOptions = {}
): Promise<ProcessedImageResult> => {
  const {
    watermarkText = "SCAM ALERT • DEEP SHOP",
    scamLocation,
    subText,
    includeBottomBanner = true,
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Unable to create canvas 2D context"));
          return;
        }

        const maxDim = 1600;
        let width = img.naturalWidth || img.width || 800;
        let height = img.naturalHeight || img.height || 800;
        const aspectRatio = Number((width / Math.max(1, height)).toFixed(3));

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // 1. Draw original image
        ctx.drawImage(img, 0, 0, width, height);

        // 2. Stamp Scam Alert & Where Scam Happened Banner (ONLY when includeBottomBanner is true)
        if (includeBottomBanner) {
          ctx.save();
          const bannerHeight = Math.max(46, Math.round(height * 0.08));
          const bannerY = height - bannerHeight;

          const gradient = ctx.createLinearGradient(0, bannerY, width, bannerY);
          gradient.addColorStop(0, "rgba(127, 29, 29, 0.94)");
          gradient.addColorStop(0.5, "rgba(24, 24, 27, 0.92)");
          gradient.addColorStop(1, "rgba(24, 24, 27, 0.94)");

          ctx.fillStyle = gradient;
          ctx.fillRect(0, bannerY, width, bannerHeight);

          ctx.strokeStyle = "rgba(244, 63, 94, 0.85)";
          ctx.lineWidth = Math.max(2, Math.round(bannerHeight * 0.05));
          ctx.beginPath();
          ctx.moveTo(0, bannerY);
          ctx.lineTo(width, bannerY);
          ctx.stroke();

          const padding = Math.max(14, Math.round(width * 0.03));
          const titleFontSize = Math.max(11, Math.min(20, Math.round(bannerHeight * 0.34)));
          const subFontSize = Math.max(9, Math.min(15, Math.round(bannerHeight * 0.26)));

          ctx.fillStyle = "#ffffff";
          ctx.font = `700 ${titleFontSize}px Outfit, -apple-system, sans-serif`;
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";

          const locationLabel = scamLocation?.trim()
            ? `Scam Happened on: ${scamLocation.trim()}`
            : subText || "Verified Scam Incident Report";

          ctx.fillText(
            `⚠️ ${watermarkText.toUpperCase()}`,
            padding,
            bannerY + bannerHeight * 0.36
          );

          ctx.fillStyle = "rgba(254, 205, 211, 0.96)";
          ctx.font = `600 ${subFontSize}px Outfit, -apple-system, sans-serif`;
          ctx.fillText(
            locationLabel,
            padding,
            bannerY + bannerHeight * 0.72
          );

          const dateStr = new Date().toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
          ctx.fillStyle = "rgba(228, 228, 231, 0.85)";
          ctx.textAlign = "right";
          ctx.fillText(
            dateStr,
            width - padding,
            bannerY + bannerHeight * 0.54
          );

          ctx.restore();
        }

        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        canvas.toBlob(
          (blob) => {
            resolve({
              dataUrl,
              blob: blob || dataUrlToBlob(dataUrl),
              width,
              height,
              aspectRatio,
            });
          },
          "image/jpeg",
          0.9
        );
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (e) => {
      reject(new Error("Failed to load image for watermarking: " + String(e)));
    };

    if (typeof fileOrUrl === "string") {
      img.src = fileOrUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(fileOrUrl);
    }
  });
};

/**
 * Downloads an image directly with custom filename
 */
export const downloadWatermarkedImage = (dataUrl: string, filename = "deep-shop-post-photo.jpg") => {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
