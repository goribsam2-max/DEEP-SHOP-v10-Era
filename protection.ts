export function setupProtection() {
  // Safe image protocol upgrade
  const forceHttps = (node: any) => {
    if (
      node.tagName === "IMG" &&
      node.src &&
      node.src.startsWith("http://") &&
      !node.src.includes("localhost")
    ) {
      node.src = node.src.replace(/^http:\/\//i, "https://");
    }
  };

  try {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "src"
        ) {
          forceHttps(mutation.target);
        } else if (mutation.addedNodes.length) {
          mutation.addedNodes.forEach((node: any) => {
            if (node.tagName === "IMG") forceHttps(node);
            else if (node.querySelectorAll) {
              node.querySelectorAll("img").forEach(forceHttps);
            }
          });
        }
      });
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src"],
    });
  } catch (e) {
    // Graceful fallback
  }
}

