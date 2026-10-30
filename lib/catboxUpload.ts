/**
 * Resilient Mobile & Desktop Browser Media Uploader (MP4, WebM, MOV, MP3, WAV)
 * Automatically bypasses browser CORS restrictions using:
 * 1. Same-origin binary stream (/api/upload-media) for fast zero-CORS server-to-Catbox upload
 * 2. Browser-native CORS-enabled direct media CDN (pomf2.lain.la) with XHR upload progress
 * 3. Public CORS-proxied Catbox FormData ('reqtype'='fileupload', 'fileToUpload')
 * 4. Browser-native CORS fallbacks (uguu.se, tmpfiles.org direct /dl/ stream)
 */

export interface CatboxUploadResult {
  success: boolean;
  url: string;
  error?: string;
}

const isValidRemoteUrl = (candidate: string): boolean => {
  if (!candidate) return false;
  const trimmed = candidate.trim();
  if (!/^https?:\/\/\S+$/i.test(trimmed)) return false;
  if (/invalid uploader|error|<html|<!doctype/i.test(trimmed)) return false;
  return true;
};

const toHttpsUrl = (raw: string): string =>
  raw.trim().replace(/^http:\/\//i, "https://");

const uploadViaXhrFormData = (
  endpoint: string,
  formData: FormData,
  parseResponse: (responseText: string) => string | null,
  onProgress?: (percent: number) => void,
  timeoutMs = 90000
): Promise<string> =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint, true);
    xhr.timeout = timeoutMs;
    // Never set Content-Type manually so browser attaches multipart/form-data boundary

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable && ev.total > 0) {
          const pct = Math.min(92, Math.max(12, Math.round((ev.loaded / ev.total) * 90)));
          onProgress(pct);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const parsedUrl = parseResponse(xhr.responseText || "");
          if (parsedUrl && isValidRemoteUrl(parsedUrl)) {
            resolve(toHttpsUrl(parsedUrl));
            return;
          }
        } catch {
          // Fall through to reject
        }
      }
      reject(new Error(`Upload failed (${xhr.status})`));
    };

    xhr.onerror = () => reject(new Error("Network or CORS restriction"));
    xhr.ontimeout = () => reject(new Error("Upload timed out"));
    xhr.send(formData);
  });

const uploadViaSameOriginBinary = (
  fileToUpload: File,
  onProgress?: (percent: number) => void,
  timeoutMs = 90000
): Promise<string> =>
  new Promise((resolve, reject) => {
    const qs = new URLSearchParams({
      filename: fileToUpload.name || `media-${Date.now()}.mp4`,
      mime: fileToUpload.type || "video/mp4",
    });
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/upload-media?${qs.toString()}`, true);
    xhr.timeout = timeoutMs;
    xhr.setRequestHeader(
      "Content-Type",
      fileToUpload.type || "application/octet-stream"
    );

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable && ev.total > 0) {
          const pct = Math.min(92, Math.max(12, Math.round((ev.loaded / ev.total) * 90)));
          onProgress(pct);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText || "{}");
          if (data?.url && isValidRemoteUrl(String(data.url))) {
            resolve(toHttpsUrl(String(data.url)));
            return;
          }
        } catch {
          // Ignore parse error
        }
      }
      reject(new Error(`Same-origin upload failed (${xhr.status})`));
    };

    xhr.onerror = () => reject(new Error("Same-origin upload network error"));
    xhr.ontimeout = () => reject(new Error("Same-origin upload timed out"));
    xhr.send(fileToUpload);
  });

const buildCatboxFormData = (fileToUpload: File): FormData => {
  const formData = new FormData();
  formData.append("reqtype", "fileupload");
  formData.append("fileToUpload", fileToUpload);
  return formData;
};

export const uploadFileToCatbox = async (
  file: File | Blob,
  customFileName?: string,
  onProgress?: (percent: number) => void
): Promise<string> => {
  if (!file) {
    throw new Error("No file selected for upload.");
  }

  if (onProgress) onProgress(12);

  const extFromMime = file.type.includes("webm")
    ? ".webm"
    : file.type.includes("quicktime")
    ? ".mov"
    : file.type.includes("wav")
    ? ".wav"
    : file.type.startsWith("audio/")
    ? ".mp3"
    : ".mp4";

  const baseName =
    customFileName ||
    (file instanceof File && file.name ? file.name : "") ||
    `${file.type.startsWith("audio/") ? "audio" : "video"}-${Date.now()}${extFromMime}`;
  const safeDefaultName = /\.[a-z0-9]{2,5}$/i.test(baseName)
    ? baseName
    : `${baseName}${extFromMime}`;

  const fileToUpload =
    file instanceof File && /\.[a-z0-9]{2,5}$/i.test(file.name)
      ? file
      : new File([file], safeDefaultName, {
          type: file.type || "video/mp4",
        });

  const isSmallEnoughForServerless = fileToUpload.size <= 4.2 * 1024 * 1024;

  // Tier 1: Same-origin binary upload for <= 4.2MB files (instant on mobile browsers, zero CORS)
  if (isSmallEnoughForServerless) {
    try {
      const url = await uploadViaSameOriginBinary(fileToUpload, onProgress, 45000);
      if (onProgress) onProgress(100);
      return url;
    } catch {
      // Proceed seamlessly to pure client-side CORS-friendly upload tiers
    }
  }

  // Tier 2: Pure Client-Side Native-CORS Direct Upload (pomf2.lain.la — permanent direct HTTPS stream)
  try {
    const fd = new FormData();
    fd.append("files[]", fileToUpload, fileToUpload.name);
    const url = await uploadViaXhrFormData(
      "https://pomf2.lain.la/upload.php",
      fd,
      (raw) => {
        const parsed = JSON.parse(raw);
        return parsed?.files?.[0]?.url || null;
      },
      onProgress
    );
    if (onProgress) onProgress(100);
    return url;
  } catch {
    // Continue to next CORS-bypass method
  }

  // Tier 3: Pure Client-Side Native-CORS Direct Upload (uguu.se — fast verified 206 byte-range stream)
  try {
    const fd = new FormData();
    fd.append("files[]", fileToUpload, fileToUpload.name);
    const url = await uploadViaXhrFormData(
      "https://uguu.se/upload",
      fd,
      (raw) => {
        const parsed = JSON.parse(raw);
        return parsed?.files?.[0]?.url || null;
      },
      onProgress
    );
    if (onProgress) onProgress(100);
    return url;
  } catch {
    // Continue to Tier 4
  }

  // Tier 4: Catbox API wrapped with public CORS proxies (strictly reqtype='fileupload' & fileToUpload)
  const catboxCorsEndpoints = [
    `https://corsproxy.io/?url=${encodeURIComponent("https://catbox.moe/user/api.php")}`,
    "https://api.codetabs.com/v1/proxy?quest=https://catbox.moe/user/api.php",
  ];

  for (const proxyEndpoint of catboxCorsEndpoints) {
    try {
      const url = await uploadViaXhrFormData(
        proxyEndpoint,
        buildCatboxFormData(fileToUpload),
        (raw) => {
          const clean = raw.trim();
          return isValidRemoteUrl(clean) ? clean : null;
        },
        onProgress,
        60000
      );
      if (onProgress) onProgress(100);
      return url;
    } catch {
      // Try next endpoint
    }
  }

  // Tier 5: Litterbox direct stream fallback
  try {
    const fd = new FormData();
    fd.append("reqtype", "fileupload");
    fd.append("time", "72h");
    fd.append("fileToUpload", fileToUpload, fileToUpload.name);
    const url = await uploadViaXhrFormData(
      "https://litterbox.catbox.moe/resources/internals/api.php",
      fd,
      (raw) => {
        const clean = raw.trim();
        return isValidRemoteUrl(clean) ? clean : null;
      },
      onProgress,
      60000
    );
    if (onProgress) onProgress(100);
    return url;
  } catch {
    // Continue to final fallback
  }

  // Tier 6: Same-origin binary stream for larger files (> 4.2MB on full Node/Express server)
  if (!isSmallEnoughForServerless) {
    try {
      const url = await uploadViaSameOriginBinary(fileToUpload, onProgress, 120000);
      if (onProgress) onProgress(100);
      return url;
    } catch {
      // All tiers exhausted
    }
  }

  throw new Error("Media upload failed. Please check your connection and try again.");
};
