/**
 * Normalizes admin-pasted custom SVG strings so they scale fluidly and
 * inherit `currentColor` cleanly across Light mode, Dark mode, and inverted
 * dock buttons without hardcoded blue/black/purple fills or strokes.
 */
export function normalizeCustomSvg(rawSvg: string): string {
  if (!rawSvg || typeof rawSvg !== "string") return "";
  const trimmed = rawSvg.trim();
  if (!trimmed) return "";

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("/")
  ) {
    return trimmed;
  }

  let svg = trimmed
    .replace(/<\?xml[\s\S]*?\?>/gi, "")
    .replace(/<!DOCTYPE[\s\S]*?>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .trim();

  // Extract width/height on root <svg> to synthesize viewBox if missing
  const svgTagMatch = svg.match(/<svg\b([^>]*)>/i);
  if (svgTagMatch) {
    let attrs = svgTagMatch[1];
    const hasViewBox = /\bviewBox\s*=/i.test(attrs);
    if (!hasViewBox) {
      const wMatch = attrs.match(/\bwidth\s*=\s*["']\s*([\d.]+)(?:px)?\s*["']/i);
      const hMatch = attrs.match(/\bheight\s*=\s*["']\s*([\d.]+)(?:px)?\s*["']/i);
      const w = wMatch ? Number(wMatch[1]) : 24;
      const h = hMatch ? Number(hMatch[1]) : 24;
      if (w > 0 && h > 0) {
        attrs += ` viewBox="0 0 ${w} ${h}"`;
      } else {
        attrs += ` viewBox="0 0 24 24"`;
      }
    }

    // Remove fixed width/height on root <svg> so container classes size it
    attrs = attrs
      .replace(/\s*\bwidth\s*=\s*["'][^"']*["']/gi, "")
      .replace(/\s*\bheight\s*=\s*["'][^"']*["']/gi, "");

    svg = svg.replace(/<svg\b[^>]*>/i, `<svg${attrs}>`);
  }

  // Convert inline style stroke/fill colors to currentColor, then strip color-locking styles
  svg = svg.replace(/\bstyle\s*=\s*["']([^"']*)["']/gi, (_full, styleBody: string) => {
    const cleanedProps = styleBody
      .split(";")
      .map((decl) => decl.trim())
      .filter(Boolean)
      .map((decl) => {
        const [propRaw, valRaw] = decl.split(":");
        if (!propRaw || !valRaw) return "";
        const prop = propRaw.trim().toLowerCase();
        const val = valRaw.trim();
        if (prop === "width" || prop === "height" || prop === "color") return "";
        if (prop === "stroke") {
          if (/^(none|transparent)$/i.test(val) || /^url\(/i.test(val)) {
            return `stroke:${val}`;
          }
          return "stroke:currentColor";
        }
        if (prop === "fill") {
          if (/^(none|transparent)$/i.test(val) || /^url\(/i.test(val)) {
            return `fill:${val}`;
          }
          return "fill:currentColor";
        }
        return `${propRaw.trim()}:${val}`;
      })
      .filter(Boolean);

    return cleanedProps.length > 0 ? `style="${cleanedProps.join(";")}"` : "";
  });

  // Normalize stroke="..." attributes
  svg = svg.replace(/\bstroke\s*=\s*["']([^"']*)["']/gi, (match, val: string) => {
    const v = val.trim();
    if (!v || /^(none|transparent|currentColor)$/i.test(v) || /^url\(/i.test(v)) {
      return match;
    }
    return 'stroke="currentColor"';
  });

  // Normalize fill="..." attributes
  svg = svg.replace(/\bfill\s*=\s*["']([^"']*)["']/gi, (match, val: string) => {
    const v = val.trim();
    if (!v || /^(none|transparent|currentColor)$/i.test(v) || /^url\(/i.test(v)) {
      return match;
    }
    return 'fill="currentColor"';
  });

  // If root <svg> has no fill attribute and the SVG uses no strokes at all,
  // set fill="currentColor" on root <svg> so un-attributed solid paths inherit theme color instead of default #000.
  const rootMatchAfter = svg.match(/<svg\b([^>]*)>/i);
  if (rootMatchAfter) {
    const rootAttrs = rootMatchAfter[1];
    const hasRootFill = /\bfill\s*=/i.test(rootAttrs);
    const hasAnyStroke = /\bstroke\s*=/i.test(svg) || /stroke\s*:/i.test(svg);
    if (!hasRootFill && !hasAnyStroke) {
      svg = svg.replace(/<svg\b([^>]*)>/i, `<svg fill="currentColor"$1>`);
    }
  }

  return svg;
}
