let initialized = false;
const trackedSrcMap = new WeakMap<HTMLImageElement, string>();
const revealTimers = new WeakMap<HTMLImageElement, number>();

function clearImgTimers(img: HTMLImageElement) {
  const existing = revealTimers.get(img);
  if (existing !== undefined) {
    window.clearTimeout(existing);
    revealTimers.delete(img);
  }
}

function revealImage(img: HTMLImageElement, animate: boolean) {
  clearImgTimers(img);
  delete img.dataset.imgLoading;
  img.dataset.imgReady = "true";

  if (!animate) {
    delete img.dataset.imgAnimating;
    return;
  }

  img.dataset.imgAnimating = "true";
  const cleanup = () => {
    delete img.dataset.imgAnimating;
    img.removeEventListener("animationend", cleanup);
  };
  img.addEventListener("animationend", cleanup, { once: true });
  const t = window.setTimeout(cleanup, 360);
  revealTimers.set(img, t);
}

function decodeAndReveal(img: HTMLImageElement) {
  if (img.dataset.dsManaged === "true" || img.dataset.noReveal === "true") {
    return;
  }
  const doReveal = () => {
    requestAnimationFrame(() => {
      if (img.isConnected) {
        revealImage(img, true);
      } else {
        delete img.dataset.imgLoading;
        img.dataset.imgReady = "true";
      }
    });
  };
  if (typeof img.decode === "function") {
    img.decode().then(doReveal).catch(doReveal);
  } else {
    doReveal();
  }
}

function processImage(img: HTMLImageElement) {
  if (
    img.dataset.dsManaged === "true" ||
    img.dataset.noReveal === "true" ||
    img.closest('[data-no-reveal="true"]')
  ) {
    return;
  }

  const rawSrc = img.getAttribute("src") || "";
  if (!rawSrc || rawSrc.startsWith("data:") || rawSrc.startsWith("blob:")) {
    clearImgTimers(img);
    delete img.dataset.imgLoading;
    delete img.dataset.imgAnimating;
    img.dataset.imgReady = "true";
    trackedSrcMap.set(img, rawSrc);
    return;
  }

  const prevSrc = trackedSrcMap.get(img);
  if (prevSrc === rawSrc && (img.dataset.imgReady === "true" || img.dataset.imgLoading === "true")) {
    if (img.complete && img.naturalWidth > 0 && img.dataset.imgLoading === "true") {
      revealImage(img, false);
    }
    return;
  }
  trackedSrcMap.set(img, rawSrc);

  if (!img.getAttribute("decoding")) {
    img.decoding = "async";
  }

  // Cached / already decoded images render immediately at 0ms with zero flicker
  if (img.complete && img.naturalWidth > 0) {
    revealImage(img, false);
    return;
  }

  // Hide progressive top-to-bottom scanline paint until bytes are decoded
  delete img.dataset.imgReady;
  delete img.dataset.imgAnimating;
  img.dataset.imgLoading = "true";

  // Safety guard so stalled external hosts never leave an image hidden forever
  clearImgTimers(img);
  const safetyTimer = window.setTimeout(() => {
    if (img.dataset.imgLoading === "true") {
      revealImage(img, true);
    }
  }, 2600);
  revealTimers.set(img, safetyTimer);
}

export function initGlobalImageReveal(): void {
  if (initialized || typeof window === "undefined" || typeof document === "undefined") {
    return;
  }
  initialized = true;

  const scan = (root: ParentNode = document) => {
    const imgs = root.querySelectorAll("img");
    for (let i = 0; i < imgs.length; i += 1) {
      processImage(imgs[i]);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => scan(document), { once: true });
  } else {
    scan(document);
  }

  document.addEventListener(
    "load",
    (e) => {
      const target = e.target;
      if (target instanceof HTMLImageElement) {
        decodeAndReveal(target);
      }
    },
    true
  );

  document.addEventListener(
    "error",
    (e) => {
      const target = e.target;
      if (target instanceof HTMLImageElement) {
        revealImage(target, false);
      }
    },
    true
  );

  if (typeof MutationObserver !== "undefined") {
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "attributes" && m.target instanceof HTMLImageElement) {
          processImage(m.target);
        } else if (m.type === "childList") {
          m.addedNodes.forEach((node) => {
            if (node instanceof HTMLImageElement) {
              processImage(node);
            } else if (node instanceof Element) {
              if (node.querySelector("img")) {
                scan(node);
              }
            }
          });
        }
      }
    });

    const targetNode = document.documentElement || document.body;
    if (targetNode) {
      observer.observe(targetNode, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["src", "srcset"],
      });
    }
  }
}
