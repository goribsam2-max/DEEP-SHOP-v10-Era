/**
 * Client-side Canvas Image Watermarking Utility
 * Automatically applies "Revealed On DEEP SHOP" watermark across images.
 * Features:
 * - Repeated diagonal tiled text across the whole canvas with subtle opacity
 * - Bottom official verification badge with Deep Shop branding
 * - Exportable as dataURL / Blob for download and display
 */

export interface WatermarkOptions {
  watermarkText?: string;
  subText?: string;
  opacity?: number;
  patternDensity?: number; // spacing between repetitions
  fontSize?: number;
  includeBottomBanner?: boolean;
}

export const applyWatermarkToImage = async (
  fileOrUrl: File | string,
  options: WatermarkOptions = {}
): Promise<{ dataUrl: string; blob: Blob }> => {
  const {
    watermarkText = "Revealed On DEEP SHOP",
    subText = "OFFICIAL SCAM ALERT • VERIFIED REPORT",
    opacity = 0.28,
    patternDensity = 140,
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

        // Maintain original resolution or cap at 1800px max dimension for fast processing
        const maxDim = 1800;
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

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

        // 2. Clean image display (Middle tiled diagonal text omitted per user request for clean images)
        // Watermark badge is positioned elegantly at the bottom shape banner below.
        ctx.restore();

        // 3. Official Bottom Verification Banner
        if (includeBottomBanner) {
          ctx.save();
          const bannerHeight = Math.max(38, Math.round(height * 0.065));
          const bannerY = height - bannerHeight;

          // Semi-transparent gradient bar
          const gradient = ctx.createLinearGradient(0, bannerY, width, bannerY);
          gradient.addColorStop(0, "rgba(24, 24, 27, 0.92)");
          gradient.addColorStop(0.5, "rgba(39, 39, 42, 0.88)");
          gradient.addColorStop(1, "rgba(24, 24, 27, 0.92)");

          ctx.fillStyle = gradient;
          ctx.fillRect(0, bannerY, width, bannerHeight);

          // Top border line on banner
          ctx.strokeStyle = "rgba(234, 88, 12, 0.6)"; // Amber/orange border
          ctx.lineWidth = Math.max(1.5, Math.round(bannerHeight * 0.05));
          ctx.beginPath();
          ctx.moveTo(0, bannerY);
          ctx.lineTo(width, bannerY);
          ctx.stroke();

          // Left warning icon & text
          const textFontSize = Math.max(11, Math.min(18, Math.round(bannerHeight * 0.36)));
          ctx.font = `700 ${textFontSize}px Inter, -apple-system, sans-serif`;
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";

          const textY = bannerY + bannerHeight / 2;
          const padding = Math.max(14, Math.round(width * 0.025));

          ctx.fillText(`🚨 ${watermarkText.toUpperCase()}`, padding, textY);

          // Right verification badge & date
          const subFontSize = Math.max(9, Math.min(14, Math.round(bannerHeight * 0.28)));
          ctx.font = `500 ${subFontSize}px Inter, -apple-system, sans-serif`;
          ctx.fillStyle = "rgba(228, 228, 231, 0.9)";
          ctx.textAlign = "right";

          const dateStr = new Date().toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
          ctx.fillText(`${subText} • ${dateStr}`, width - padding, textY);

          ctx.restore();
        }

        // Convert to dataUrl and Blob
        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ dataUrl, blob });
            } else {
              // Fallback
              const arr = dataUrl.split(",");
              const mime = arr[0].match(/:(.*?);/)![1];
              const bstr = atob(arr[1]);
              let n = bstr.length;
              const u8arr = new Uint8Array(n);
              while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
              }
              resolve({ dataUrl, blob: new Blob([u8arr], { type: mime }) });
            }
          },
          "image/jpeg",
          0.92
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
 * Downloads a watermarked image directly with custom filename
 */
export const downloadWatermarkedImage = (dataUrl: string, filename = "revealed-on-deep-shop.jpg") => {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
