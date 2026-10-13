/**
 * Authentic OEM Spare Parts Artwork Generator.
 * Directly matches the real commercial replacement parts product photography:
 * 
 * 1. Camera Module (IMG_4403.jpeg style):
 *    - Pristine white studio background (#ffffff)
 *    - Top centered: "For Apple" / "For Samsung" pill badge, with clean bold model name ("iPhone 13")
 *    - Center: Exact dual/triple rear camera module in gunmetal CNC aluminum housing with dual sapphire lenses (deep blue optical coating reflection), yellow-orange flex ribbon, gold pin connector
 *    - Bottom: "100% Original" + "[ Back Camera ]" rounded outlined pill badge
 * 
 * 2. Display / Screen Panel (IMG_4401.jpeg style):
 *    - Clean white studio card background
 *    - Front camera ring circle zoom callout ("Front Camera Ring")
 *    - Detailed OLED digitizer front/back assembly with red model stamp (e.g. "13 Pro Max")
 *    - Golden circuit tape and middle frame callout ("Middle Frame")
 *    - Precision flex cable callout circle ("Flex Cable")
 * 
 * 3. Battery Pack:
 *    - Clean white OEM cell with original black wrapper, pull tabs, and terminal flex cable
 * 
 * 4. Logic Board:
 *    - High-density OEM green/black PCB with silver EMI shielding cans and micro-connectors
 */

export type PhonePartType = "display" | "battery" | "camera" | "logic" | "other";

export interface ExtractedPartInfo {
  isPhonePart: boolean;
  partType: PhonePartType;
  brand: "Apple" | "Samsung" | "Xiaomi" | "Google" | "OnePlus" | "Android" | "Universal";
  modelName: string;
  partLabelBengali: string;
  partLabelEnglish: string;
}

export function detectPhonePart(title: string = "", category: string = ""): ExtractedPartInfo {
  const combined = `${title} ${category}`.toLowerCase();

  let partType: PhonePartType = "other";
  let isPhonePart = false;

  if (
    combined.includes("display") ||
    combined.includes("screen") ||
    combined.includes("lcd") ||
    combined.includes("oled") ||
    combined.includes("ডিসপ্লে") ||
    combined.includes("স্ক্রিন")
  ) {
    partType = "display";
    isPhonePart = true;
  } else if (
    combined.includes("camera") ||
    combined.includes("lens") ||
    combined.includes("ক্যামেরা") ||
    combined.includes("cam module")
  ) {
    partType = "camera";
    isPhonePart = true;
  } else if (
    combined.includes("battery") ||
    combined.includes("battary") ||
    combined.includes("ব্যাটারি") ||
    combined.includes("mah")
  ) {
    partType = "battery";
    isPhonePart = true;
  } else if (
    combined.includes("logic") ||
    combined.includes("motherboard") ||
    combined.includes("mainboard") ||
    combined.includes("pcb") ||
    combined.includes("লজিক") ||
    combined.includes("মাদারবোর্ড")
  ) {
    partType = "logic";
    isPhonePart = true;
  } else if (
    category.toLowerCase().includes("part") ||
    category.toLowerCase().includes("পার্টস") ||
    combined.includes("parts") ||
    combined.includes("পার্টস")
  ) {
    partType = "other";
    isPhonePart = true;
  }

  // Detect Brand
  let brand: ExtractedPartInfo["brand"] = "Universal";
  if (combined.includes("iphone") || combined.includes("apple") || combined.includes("ipad")) {
    brand = "Apple";
  } else if (combined.includes("samsung") || combined.includes("galaxy")) {
    brand = "Samsung";
  } else if (combined.includes("xiaomi") || combined.includes("redmi") || combined.includes("poco")) {
    brand = "Xiaomi";
  } else if (combined.includes("google") || combined.includes("pixel")) {
    brand = "Google";
  } else if (combined.includes("oneplus")) {
    brand = "OnePlus";
  } else if (combined.includes("android") || combined.includes("vivo") || combined.includes("oppo") || combined.includes("realme")) {
    brand = "Android";
  }

  // Clean Model Extraction
  let cleanModel = title
    .replace(/(display|screen|oled|lcd|touch|original|genuine|replacement|part|parts|battery|camera|module|logic\s*board|motherboard|mainboard|grade\s*a\+|100%|oem|back\s*camera|rear\s*camera)/gi, "")
    .replace(/[-–—,:|]+/g, " ")
    .trim();

  if (!cleanModel || cleanModel.length < 2) {
    cleanModel = title || (brand !== "Universal" ? `${brand} Phone` : "Phone");
  }

  if (cleanModel.length > 28) {
    cleanModel = cleanModel.slice(0, 26) + "...";
  }

  const labelMap: Record<PhonePartType, { bn: string; en: string }> = {
    camera: { bn: "ব্যাক ক্যামেরা মডিউল", en: "Back Camera" },
    display: { bn: "অরিজিনাল ডিসপ্লে ও স্ক্রিন", en: "Display Screen" },
    battery: { bn: "হাই ক্যাপাসিটি ব্যাটারি", en: "Li-ion Battery" },
    logic: { bn: "টেস্টেড লজিক মাদারবোর্ড", en: "Logic Board" },
    other: { bn: "জেনুইন স্পেয়ার পার্টস", en: "Replacement Part" },
  };

  return {
    isPhonePart,
    partType,
    brand,
    modelName: cleanModel,
    partLabelBengali: labelMap[partType].bn,
    partLabelEnglish: labelMap[partType].en,
  };
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Generates an ultra high-quality SVG data URI for a phone part based on user's real reference pictures:
 * - Studio White background
 * - Top Brand pill & Model Name
 * - Authentic metallic camera hardware / OLED screen with diagram callouts
 * - Bottom "100% Original" + outlined badge
 */
export function generatePartSvg(title: string, category: string = "Phone Parts"): string {
  const info = detectPhonePart(title, category);
  const escapedModel = escapeXml(info.modelName);
  const brandLabel = info.brand === "Universal" ? "Mobile" : info.brand;
  const escapedBrand = escapeXml(brandLabel);

  // 1. CAMERA MODULE (Matches IMG_4403.jpeg)
  if (info.partType === "camera") {
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" style="background:#ffffff">
  <defs>
    <!-- Camera Lens Reflections -->
    <radialGradient id="camGlass1" cx="42%" cy="38%" r="62%">
      <stop offset="0%" stop-color="#1e3a8a" />
      <stop offset="35%" stop-color="#0f172a" />
      <stop offset="70%" stop-color="#030712" />
      <stop offset="100%" stop-color="#000000" />
    </radialGradient>
    <radialGradient id="camGlass2" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#2563eb" />
      <stop offset="45%" stop-color="#0f172a" />
      <stop offset="85%" stop-color="#020617" />
    </radialGradient>
    <linearGradient id="bodyMetal" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#52525b" />
      <stop offset="50%" stop-color="#3f3f46" />
      <stop offset="100%" stop-color="#27272a" />
    </linearGradient>
    <linearGradient id="plateMetal" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#71717a" />
      <stop offset="100%" stop-color="#52525b" />
    </linearGradient>
    <filter id="softDrop" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.12" />
    </filter>
  </defs>

  <!-- Top Header Section (For Apple / iPhone 13 style) -->
  <g transform="translate(300, 72)">
    <!-- 'For' Pill Badge + Brand Name -->
    <g transform="translate(0, 0)">
      <rect x="-65" y="-14" width="42" height="22" rx="11" fill="#38bdf8" />
      <text x="-44" y="2" font-family="'Inter', sans-serif" font-size="11" font-weight="700" fill="#ffffff" text-anchor="middle">For</text>
      <text x="5" y="2" font-family="'Inter', -apple-system, sans-serif" font-size="17" font-weight="700" fill="#1e293b" text-anchor="start">${escapedBrand}</text>
    </g>

    <!-- Main Clean Phone Model Name -->
    <text x="0" y="44" font-family="'Inter', -apple-system, sans-serif" font-size="30" font-weight="800" fill="#0f172a" text-anchor="middle" letter-spacing="-0.02em">
      ${escapedModel}
    </text>
  </g>

  <!-- Camera Hardware Module Unit (Center) -->
  <g transform="translate(300, 310)" filter="url(#softDrop)">
    <!-- Base Bracket Body with cutouts -->
    <path d="M -110 -140 L -30 -140 L -30 -70 L 65 -70 Q 75 -70 75 -60 L 75 75 Q 75 85 65 85 L -100 85 Q -110 85 -110 75 Z" fill="url(#bodyMetal)" stroke="#27272a" stroke-width="1.5" />

    <!-- Left Bracket Metallic Shield Plate -->
    <path d="M -102 -50 L -46 -50 L -46 75 L -92 75 Q -102 75 -102 65 Z" fill="url(#plateMetal)" stroke="#3f3f46" stroke-width="1" />
    <!-- QR Code Laser Etch Matrix -->
    <rect x="-100" y="-72" width="16" height="16" rx="2" fill="#d4d4d8" />
    <rect x="-97" y="-69" width="4" height="4" fill="#18181b" />
    <rect x="-89" y="-69" width="3" height="3" fill="#18181b" />
    <rect x="-97" y="-61" width="3" height="3" fill="#18181b" />
    <!-- Mounting Holes -->
    <circle cx="-56" cy="-25" r="9" fill="#ffffff" stroke="#a1a1aa" stroke-width="1.5" />
    <circle cx="-56" cy="45" r="9" fill="#ffffff" stroke="#a1a1aa" stroke-width="1.5" />

    <!-- TOP TELEPHOTO / ULTRA-WIDE LENS (Black Beveled Rim with Optical Flare) -->
    <g transform="translate(-70, -85)">
      <circle cx="0" cy="0" r="44" fill="#18181b" stroke="#71717a" stroke-width="2" />
      <circle cx="0" cy="0" r="38" fill="url(#camGlass1)" />
      <circle cx="0" cy="0" r="24" fill="#000000" stroke="#3b82f6" stroke-width="1" opacity="0.8" />
      <!-- Aperture Core Spec -->
      <circle cx="0" cy="0" r="10" fill="#0f172a" />
      <circle cx="-6" cy="-6" r="3.5" fill="#60a5fa" opacity="0.85" />
      <circle cx="5" cy="5" r="1.5" fill="#ffffff" opacity="0.6" />
    </g>

    <!-- MAIN CENTER 48MP/12MP SENSOR (Dual Beveled Rings with Sensor Bracket) -->
    <g transform="translate(15, 8)">
      <!-- Octagonal CNC Metal Lens Carrier -->
      <rect x="-56" y="-56" width="112" height="112" rx="28" fill="#27272a" stroke="#71717a" stroke-width="1.5" />
      <circle cx="0" cy="0" r="48" fill="#18181b" stroke="#a1a1aa" stroke-width="1.5" />
      <!-- Outer Lens Ring -->
      <circle cx="0" cy="0" r="40" fill="url(#camGlass2)" />
      <!-- Iris Aperture Blades -->
      <circle cx="0" cy="0" r="26" fill="#020617" stroke="#60a5fa" stroke-width="1.5" />
      <circle cx="0" cy="0" r="14" fill="#000000" />
      <!-- Sapphire Optical Blue Flare Highlights -->
      <ellipse cx="-8" cy="-8" rx="8" ry="5" transform="rotate(-30 -8 -8)" fill="#38bdf8" opacity="0.75" />
      <circle cx="8" cy="8" r="2.5" fill="#ffffff" opacity="0.5" />
    </g>

    <!-- Bottom Yellow-Orange Flex Cable Ribbon with Gold Contacts -->
    <g transform="translate(0, 85)">
      <rect x="-42" y="0" width="94" height="20" fill="#f59e0b" stroke="#d97706" stroke-width="1" />
      <!-- Gold Pins -->
      ${Array.from({ length: 22 })
        .map((_, i) => `<line x1="${-38 + i * 4}" y1="8" x2="${-38 + i * 4}" y2="18" stroke="#fef08a" stroke-width="1.8" />`)
        .join("")}
      
      <!-- Black Base Ribbon Frame -->
      <path d="M -100 20 L 68 20 L 68 40 L 125 40 L 125 2 L 140 2 L 140 76 L 100 76 L 100 40 L -100 40 Z" fill="#18181b" />

      <!-- FPC Golden Snap Connectors (Right Side) -->
      <g transform="translate(125, -12)">
        <rect x="-18" y="0" width="36" height="16" rx="2" fill="#18181b" stroke="#52525b" stroke-width="1" />
        <rect x="-14" y="3" width="28" height="10" rx="1" fill="#f59e0b" stroke="#eab308" stroke-width="0.8" />
        <!-- Pin lines -->
        <line x1="-10" y1="5" x2="10" y2="5" stroke="#fef08a" stroke-width="1.5" stroke-dasharray="2 1" />
        <line x1="-10" y1="11" x2="10" y2="11" stroke="#fef08a" stroke-width="1.5" stroke-dasharray="2 1" />

        <rect x="-18" y="24" width="36" height="16" rx="2" fill="#18181b" stroke="#52525b" stroke-width="1" />
        <rect x="-14" y="27" width="28" height="10" rx="1" fill="#f59e0b" stroke="#eab308" stroke-width="0.8" />
        <line x1="-10" y1="29" x2="10" y2="29" stroke="#fef08a" stroke-width="1.5" stroke-dasharray="2 1" />
        <line x1="-10" y1="35" x2="10" y2="35" stroke="#fef08a" stroke-width="1.5" stroke-dasharray="2 1" />
      </g>
    </g>
  </g>

  <!-- Bottom Badges (100% Original | Back Camera pill) -->
  <g transform="translate(300, 520)">
    <text x="-40" y="6" font-family="'Inter', sans-serif" font-size="16" font-weight="700" fill="#1e293b" text-anchor="end">
      100% Original
    </text>

    <!-- Outlined Blue Pill: [ Back Camera ] -->
    <rect x="-24" y="-14" width="130" height="28" rx="14" fill="#ffffff" stroke="#38bdf8" stroke-width="2" />
    <text x="41" y="5" font-family="'Inter', sans-serif" font-size="14" font-weight="600" fill="#0284c7" text-anchor="middle">
      Back Camera
    </text>
  </g>
</svg>
    `.trim();

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  // 2. DISPLAY / SCREEN ASSEMBLY (Matches IMG_4401.jpeg)
  if (info.partType === "display") {
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" style="background:#ffffff">
  <defs>
    <!-- Border Gradient frame -->
    <linearGradient id="rainbowBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5" />
      <stop offset="50%" stop-color="#ec4899" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#000000" flood-opacity="0.1" />
    </filter>
  </defs>

  <!-- Outer Frame Border -->
  <rect x="15" y="15" width="570" height="570" fill="#ffffff" stroke="url(#rainbowBorder)" stroke-width="4" rx="4" />

  <!-- LEFT: OLED Screen Digitizer Chassis with Red Model Stamp -->
  <g transform="translate(75, 60)" filter="url(#cardShadow)">
    <!-- Outer Metal Screen Frame -->
    <rect x="0" y="0" width="190" height="380" rx="22" fill="#d4d4d8" stroke="#71717a" stroke-width="2" />
    <!-- Top Speaker Ear Cushion Cutout -->
    <rect x="75" y="6" width="40" height="4" rx="2" fill="#18181b" />
    <!-- Front Camera Hole -->
    <circle cx="65" cy="18" r="5" fill="#18181b" stroke="#71717a" stroke-width="1" />
    <circle cx="85" cy="18" r="3" fill="#3b82f6" opacity="0.8" />

    <!-- Inner Black Screen Surface -->
    <rect x="8" y="28" width="174" height="340" rx="12" fill="#09090b" />

    <!-- Golden Sensor EMI Tape at Top Left -->
    <rect x="16" y="38" width="65" height="38" fill="#eab308" opacity="0.85" rx="2" />
    <rect x="22" y="44" width="30" height="16" fill="#ca8a04" opacity="0.6" />

    <!-- Red Model Stamp in Center (e.g. "13 Pro Max" / "iPhone 14") -->
    <text x="95" y="200" font-family="'Inter', sans-serif" font-size="16" font-weight="900" fill="#ef4444" text-anchor="middle" letter-spacing="0.5">
      ${escapedModel}
    </text>

    <!-- Bottom IC Driver Board & Gold Flex Circuit -->
    <g transform="translate(8, 330)">
      <rect x="0" y="0" width="174" height="38" rx="4" fill="#27272a" />
      <rect x="30" y="6" width="60" height="14" fill="#000000" stroke="#a1a1aa" stroke-width="0.5" />
      <text x="60" y="16" font-family="monospace" font-size="7" fill="#ffffff" text-anchor="middle">DISPLAY IC</text>
      <!-- Silver Pins -->
      ${Array.from({ length: 16 })
        .map((_, i) => `<line x1="${10 + i * 4}" y1="26" x2="${10 + i * 4}" y2="34" stroke="#94a3b8" stroke-width="1.5" />`)
        .join("")}
    </g>

    <!-- Extended Long Flex Cable (Going up to middle connector) -->
    <path d="M 172 320 L 195 320 L 195 120" stroke="#18181b" stroke-width="14" fill="none" stroke-linecap="round" />
  </g>

  <!-- RIGHT SIDE: Precision Diagram Callouts with Maroon Circles -->

  <!-- 1. Front Camera Ring Callout -->
  <g transform="translate(390, 85)">
    <!-- Zoom Circle with Camera Sensors -->
    <circle cx="0" cy="0" r="42" fill="#ffffff" stroke="#991b1b" stroke-width="2" />
    <rect x="-26" y="-14" width="52" height="28" rx="4" fill="#e4e4e7" stroke="#71717a" stroke-width="1" />
    <circle cx="-12" cy="0" r="7" fill="#09090b" stroke="#3b82f6" stroke-width="1.5" />
    <circle cx="10" cy="0" r="5" fill="#09090b" />
    <!-- Connector line to screen notch -->
    <line x1="-42" y1="0" x2="-230" y2="-5" stroke="#991b1b" stroke-width="1.5" />
    <!-- Label -->
    <text x="56" y="5" font-family="'Inter', serif" font-size="15" font-weight="700" fill="#0f172a" text-anchor="start">
      Front Camera Ring
    </text>
  </g>

  <!-- 2. Flex Cable Callout -->
  <g transform="translate(435, 255)">
    <!-- Zoom Circle with Bent Ribbon FPC -->
    <circle cx="0" cy="0" r="42" fill="#ffffff" stroke="#991b1b" stroke-width="2" />
    <path d="M -24 24 L -24 -10 Q -24 -24 -10 -24 L 20 -24" stroke="#18181b" stroke-width="12" fill="none" />
    <rect x="10" y="-30" width="18" height="12" rx="1" fill="#f59e0b" stroke="#d97706" stroke-width="1" />
    <!-- Connector line -->
    <line x1="-42" y1="0" x2="-145" y2="-75" stroke="#991b1b" stroke-width="1.5" />
    <!-- Label -->
    <text x="-40" y="65" font-family="'Inter', serif" font-size="15" font-weight="700" fill="#0f172a" text-anchor="start">
      Flex Cable
    </text>
  </g>

  <!-- 3. Middle Frame Callout -->
  <g transform="translate(280, 480)">
    <!-- Zoom Circle on Bottom Frame Corner -->
    <circle cx="0" cy="0" r="42" fill="#ffffff" stroke="#991b1b" stroke-width="2" />
    <rect x="-25" y="-25" width="50" height="50" fill="#d4d4d8" />
    <path d="M -25 0 L 25 0 M 0 -25 L 0 25" stroke="#a1a1aa" stroke-width="1" />
    <rect x="-15" y="-10" width="30" height="20" rx="3" fill="#18181b" />
    <!-- Pointer arrow to chassis corner -->
    <line x1="50" y1="-8" x2="160" y2="-12" stroke="#991b1b" stroke-width="1.5" />
    <text x="180" y="-6" font-family="'Inter', serif" font-size="15" font-weight="700" fill="#0f172a" text-anchor="start">
      Middle Frame
    </text>
  </g>
</svg>
    `.trim();

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  // 3. BATTERY PACK (Clean OEM Studio Li-ion Cell)
  if (info.partType === "battery") {
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" style="background:#ffffff">
  <defs>
    <filter id="batShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.12" />
    </filter>
  </defs>

  <!-- Top Header -->
  <g transform="translate(300, 75)">
    <g transform="translate(0, 0)">
      <rect x="-65" y="-14" width="42" height="22" rx="11" fill="#10b981" />
      <text x="-44" y="2" font-family="'Inter', sans-serif" font-size="11" font-weight="700" fill="#ffffff" text-anchor="middle">For</text>
      <text x="5" y="2" font-family="'Inter', sans-serif" font-size="17" font-weight="700" fill="#1e293b" text-anchor="start">${escapedBrand}</text>
    </g>
    <text x="0" y="44" font-family="'Inter', sans-serif" font-size="30" font-weight="800" fill="#0f172a" text-anchor="middle">
      ${escapedModel}
    </text>
  </g>

  <!-- Battery Hardware Cell in Center -->
  <g transform="translate(300, 310)" filter="url(#batShadow)">
    <!-- Battery Body Foil Pack -->
    <rect x="-85" y="-130" width="170" height="250" rx="12" fill="#18181b" stroke="#3f3f46" stroke-width="2" />
    <!-- White Technical Spec Silk-screen Text -->
    <text x="0" y="-85" font-family="'Inter', sans-serif" font-size="13" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="1">GENUINE OEM BATTERY</text>
    <text x="0" y="-60" font-family="monospace" font-size="10" font-weight="bold" fill="#34d399" text-anchor="middle">100% HEALTH · 0 CYCLE</text>
    <text x="0" y="-40" font-family="monospace" font-size="9" fill="#9ca3af" text-anchor="middle">Li-ion Polymer Battery · 3.85V</text>
    <text x="0" y="-20" font-family="monospace" font-size="8" fill="#6b7280" text-anchor="middle">Model Spec · CE · FCC · RoHS</text>

    <!-- Apple / Android Battery Warning Matrix -->
    <rect x="-65" y="10" width="130" height="65" rx="4" fill="#09090b" stroke="#27272a" stroke-width="1" />
    <text x="0" y="32" font-family="monospace" font-size="8" fill="#9ca3af" text-anchor="middle">WARNING: Do not puncture,</text>
    <text x="0" y="46" font-family="monospace" font-size="8" fill="#9ca3af" text-anchor="middle">crush, heat, or burn.</text>
    <text x="0" y="60" font-family="monospace" font-size="7" fill="#eab308" text-anchor="middle">TIS 2217-2548 · Certified</text>

    <!-- Top Flex Cable Ribbon with Gold Terminals -->
    <path d="M -30 -130 L -30 -160 L 25 -160 L 25 -145" stroke="#18181b" stroke-width="12" fill="none" stroke-linecap="round" />
    <rect x="15" y="-155" width="22" height="15" rx="2" fill="#f59e0b" stroke="#d97706" stroke-width="1" />

    <!-- Bottom Adhesive Pull Tabs -->
    <rect x="-55" y="120" width="38" height="24" rx="3" fill="#292524" stroke="#44403c" stroke-width="1" />
    <rect x="17" y="120" width="38" height="24" rx="3" fill="#292524" stroke="#44403c" stroke-width="1" />
    <text x="-36" y="136" font-family="monospace" font-size="8" fill="#a8a29e" text-anchor="middle">PULL</text>
    <text x="36" y="136" font-family="monospace" font-size="8" fill="#a8a29e" text-anchor="middle">PULL</text>
  </g>

  <!-- Bottom Badges -->
  <g transform="translate(300, 520)">
    <text x="-40" y="6" font-family="'Inter', sans-serif" font-size="16" font-weight="700" fill="#1e293b" text-anchor="end">
      100% Original
    </text>
    <rect x="-24" y="-14" width="130" height="28" rx="14" fill="#ffffff" stroke="#10b981" stroke-width="2" />
    <text x="41" y="5" font-family="'Inter', sans-serif" font-size="14" font-weight="600" fill="#059669" text-anchor="middle">
      Battery Pack
    </text>
  </g>
</svg>
    `.trim();

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  // 4. LOGIC BOARD / MOTHERBOARD
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" style="background:#ffffff">
  <defs>
    <filter id="pcbShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.12" />
    </filter>
  </defs>

  <g transform="translate(300, 75)">
    <g transform="translate(0, 0)">
      <rect x="-65" y="-14" width="42" height="22" rx="11" fill="#f59e0b" />
      <text x="-44" y="2" font-family="'Inter', sans-serif" font-size="11" font-weight="700" fill="#ffffff" text-anchor="middle">For</text>
      <text x="5" y="2" font-family="'Inter', sans-serif" font-size="17" font-weight="700" fill="#1e293b" text-anchor="start">${escapedBrand}</text>
    </g>
    <text x="0" y="44" font-family="'Inter', sans-serif" font-size="30" font-weight="800" fill="#0f172a" text-anchor="middle">
      ${escapedModel}
    </text>
  </g>

  <!-- PCB Logic Board -->
  <g transform="translate(300, 310)" filter="url(#pcbShadow)">
    <rect x="-95" y="-135" width="190" height="260" rx="14" fill="#064e3b" stroke="#047857" stroke-width="2" />
    <!-- Metal Cans -->
    <rect x="-75" y="-115" width="85" height="85" rx="6" fill="#cbd5e1" stroke="#64748b" stroke-width="1.5" />
    <rect x="20" y="-115" width="55" height="70" rx="4" fill="#cbd5e1" stroke="#64748b" stroke-width="1.5" />
    <rect x="20" y="-35" width="55" height="50" rx="4" fill="#1e293b" stroke="#eab308" stroke-width="1.5" />
    <!-- Connectors -->
    <rect x="-80" y="20" width="60" height="14" rx="2" fill="#000" stroke="#f59e0b" stroke-width="1.2" />
    <rect x="-80" y="45" width="60" height="14" rx="2" fill="#000" stroke="#f59e0b" stroke-width="1.2" />
    <rect x="5" y="45" width="70" height="14" rx="2" fill="#000" stroke="#f59e0b" stroke-width="1.2" />
    <!-- Tested Stamp -->
    <rect x="-60" y="85" width="120" height="22" rx="4" fill="#10b981" />
    <text x="0" y="100" font-family="'Inter', sans-serif" font-size="10" font-weight="bold" fill="#ffffff" text-anchor="middle">100% UNLOCKED · TESTED</text>
  </g>

  <g transform="translate(300, 520)">
    <text x="-40" y="6" font-family="'Inter', sans-serif" font-size="16" font-weight="700" fill="#1e293b" text-anchor="end">
      100% Original
    </text>
    <rect x="-24" y="-14" width="130" height="28" rx="14" fill="#ffffff" stroke="#f59e0b" stroke-width="2" />
    <text x="41" y="5" font-family="'Inter', sans-serif" font-size="14" font-weight="600" fill="#d97706" text-anchor="middle">
      Logic Board
    </text>
  </g>
</svg>
  `.trim();

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function getProductDisplayImage(product: {
  image?: string;
  images?: string[];
  name?: string;
  category?: string;
}): string {
  if (product.image && product.image.trim() !== "" && !product.image.includes("ui-avatars.com")) {
    return product.image;
  }
  if (product.images && product.images.length > 0 && product.images[0].trim() !== "") {
    return product.images[0];
  }
  return generatePartSvg(product.name || "Mobile Device Part", product.category || "Phone Parts");
}
