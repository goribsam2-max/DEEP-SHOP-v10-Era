/**
 * Automatic AI-Generated Image Detector for News Hub Posts & Stories.
 *
 * Layer 1 (0ms local provenance inspection):
 *   Scans raw File filename + binary metadata chunks (C2PA / Content Credentials / JUMBF,
 *   PNG tEXt/iTXt/eXIf, XMP, IPTC, EXIF Software/Artist) BEFORE canvas compression strips them.
 *
 * Layer 2 (Server-side Gemini Vision verification via /api/detect-ai-image):
 *   Inspects a compact resized JPEG preview on the server so AI-generated images shared via
 *   WhatsApp, Messenger, Telegram, or screenshots (with stripped metadata) are still detected.
 */

const AI_FILENAME_PATTERNS: RegExp[] = [
  /chatgpt[\s_-]*image/i,
  /dall[·\-_ ]?e/i,
  /midjourney/i,
  /gemini[\s_-]*generated/i,
  /imagen[\s_-]*\d?/i,
  /adobe[\s_-]*firefly/i,
  /firefly[\s_-]*\d/i,
  /stable[\s_-]*diffusion/i,
  /comfyui/i,
  /ideogram/i,
  /leonardo[\s_-]*ai/i,
  /flux[\s_-]*(?:dev|pro|schnell|\d)/i,
  /bing[\s_-]*image[\s_-]*creator/i,
  /copilot[\s_-]*designer/i,
  /ai[\s_-]*generated/i,
];

const AI_BINARY_SIGNATURE_PATTERNS: RegExp[] = [
  /trainedAlgorithmicMedia/i,
  /compositeWithTrainedAlgorithmicMedia/i,
  /c2pa\.ai_generated/i,
  /c2pa\.actions/i,
  /urn:c2pa/i,
  /Midjourney/i,
  /DALL[·\- ]E/i,
  /ChatGPT/i,
  /OpenAI/i,
  /GPT-4o/i,
  /SynthID/i,
  /Google DeepMind/i,
  /Imagen\s*[234]?/i,
  /Adobe Firefly/i,
  /Stable Diffusion/i,
  /AUTOMATIC1111/i,
  /ComfyUI/i,
  /NovelAI/i,
  /Black Forest Labs/i,
  /FLUX\.1/i,
  /Ideogram/i,
  /Leonardo\.Ai/i,
  /Bing Image Creator/i,
  /Recraft/i,
  /RunwayML/i,
  /Kling AI/i,
  /DreamStudio/i,
  /Playground AI/i,
];

const REAL_CAMERA_MAKE_MODELS: RegExp[] = [
  /Apple\0+iPhone/i,
  /Samsung\0+SM-/i,
  /Google\0+Pixel/i,
  /Xiaomi/i,
  /Redmi/i,
  /Realme/i,
  /OnePlus/i,
  /OPPO/i,
  /vivo/i,
  /Canon EOS/i,
  /NIKON CORPORATION/i,
  /SONY\0+ILCE/i,
  /FUJIFILM/i,
];

async function readFileMetadataWindow(file: File): Promise<string> {
  try {
    const headSize = Math.min(file.size, 262144); // First 256 KB
    const headBuf = await file.slice(0, headSize).arrayBuffer();
    const decoder = new TextDecoder("latin1");
    let combined = decoder.decode(headBuf);

    if (file.size > headSize) {
      const tailStart = Math.max(headSize, file.size - 131072); // Last 128 KB
      const tailBuf = await file.slice(tailStart, file.size).arrayBuffer();
      combined += "\n" + decoder.decode(tailBuf);
    }
    return combined;
  } catch {
    return "";
  }
}

async function createCompactVisionDataUrl(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const maxDim = 768;
        let w = img.naturalWidth || img.width || 512;
        let h = img.naturalHeight || img.height || 512;
        if (w > maxDim || h > maxDim) {
          if (w >= h) {
            h = Math.max(1, Math.round((h * maxDim) / w));
            w = maxDim;
          } else {
            w = Math.max(1, Math.round((w * maxDim) / h));
            h = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        URL.revokeObjectURL(objectUrl);
        resolve(dataUrl);
      } catch {
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };
    img.src = objectUrl;
  });
}

export async function detectSingleAiImage(file: File): Promise<boolean> {
  if (!file || !file.type.startsWith("image/")) return false;

  // 1. Check filename hints
  const name = file.name || "";
  if (AI_FILENAME_PATTERNS.some((rx) => rx.test(name))) {
    return true;
  }

  // 2. Check raw binary EXIF / XMP / C2PA / PNG chunks before compression
  const rawMeta = await readFileMetadataWindow(file);
  if (rawMeta) {
    if (AI_BINARY_SIGNATURE_PATTERNS.some((rx) => rx.test(rawMeta))) {
      return true;
    }
    // Authentic optical camera hardware EXIF without C2PA/AI edits -> real camera photo
    const hasHardwareMake = REAL_CAMERA_MAKE_MODELS.some((rx) => rx.test(rawMeta));
    const hasExifHeader = rawMeta.includes("Exif\0\0");
    if (hasHardwareMake && hasExifHeader && !/c2pa|firefly|photoshop|generative/i.test(rawMeta)) {
      return false;
    }
  }

  // 3. Server-side Gemini Vision inspection for metadata-stripped images
  try {
    const compactDataUrl = await createCompactVisionDataUrl(file);
    if (!compactDataUrl) return false;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 6500);

    const res = await fetch("/api/detect-ai-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: compactDataUrl,
        mimeType: "image/jpeg",
      }),
      signal: controller.signal,
    });
    window.clearTimeout(timeoutId);

    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data?.isAiGenerated);
  } catch {
    return false;
  }
}

export async function detectAiGeneratedFiles(files: File[]): Promise<boolean> {
  if (!Array.isArray(files) || files.length === 0) return false;
  const results = await Promise.all(
    files.slice(0, 4).map((f) => detectSingleAiImage(f))
  );
  return results.some(Boolean);
}
