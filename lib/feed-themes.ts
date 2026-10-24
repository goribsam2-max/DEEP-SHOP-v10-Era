
export type FeedThemeGroup =
  | "Cyber & Security"
  | "Tech & AI"
  | "Online & Business"
  | "Digital & Gaming";

export const FEED_THEME_GROUPS: FeedThemeGroup[] = [
  "Cyber & Security",
  "Tech & AI",
  "Online & Business",
  "Digital & Gaming",
];

export interface ThemeDefinition {
  id: string;
  label: string;
  emoji: string;
  group: FeedThemeGroup;
}

export const FEED_THEMES: ThemeDefinition[] = [
  // Cyber & Security
  { id: "cyber_news", label: "Cyber News", emoji: "🛡️", group: "Cyber & Security" },
  { id: "cybersecurity", label: "Cybersecurity", emoji: "🔐", group: "Cyber & Security" },
  { id: "scam_watch", label: "Scam Alerts", emoji: "🚨", group: "Cyber & Security" },
  { id: "ethical_hacking", label: "Ethical Hacking", emoji: "🕵️", group: "Cyber & Security" },
  { id: "data_breach", label: "Data Breaches", emoji: "⚠️", group: "Cyber & Security" },
  { id: "online_privacy", label: "Online Privacy", emoji: "🔒", group: "Cyber & Security" },

  // Tech & AI
  { id: "tech_news", label: "Tech News", emoji: "💻", group: "Tech & AI" },
  { id: "ai_tools", label: "AI & Tools", emoji: "🤖", group: "Tech & AI" },
  { id: "software_apps", label: "Software & Apps", emoji: "🧩", group: "Tech & AI" },
  { id: "gadgets", label: "Gadgets & Mobile", emoji: "📱", group: "Tech & AI" },
  { id: "programming", label: "Coding & Dev", emoji: "👨‍💻", group: "Tech & AI" },
  { id: "cloud_server", label: "Cloud & Hosting", emoji: "☁️", group: "Tech & AI" },

  // Online & Business
  { id: "ecommerce", label: "E-Commerce", emoji: "🛒", group: "Online & Business" },
  { id: "freelancing", label: "Freelancing", emoji: "💼", group: "Online & Business" },
  { id: "digital_marketing", label: "Digital Marketing", emoji: "📈", group: "Online & Business" },
  { id: "crypto_web3", label: "Crypto & Web3", emoji: "🪙", group: "Online & Business" },
  { id: "fintech_banking", label: "bKash & Fintech", emoji: "💳", group: "Online & Business" },
  { id: "online_earning", label: "Online Earning", emoji: "💰", group: "Online & Business" },

  // Digital & Gaming
  { id: "social_media", label: "Social Media", emoji: "🌐", group: "Digital & Gaming" },
  { id: "gaming_esports", label: "Gaming & Esports", emoji: "🎮", group: "Digital & Gaming" },
  { id: "telecom_isp", label: "SIM, WiFi & ISP", emoji: "📡", group: "Digital & Gaming" },
  { id: "pc_hardware", label: "PC & Hardware", emoji: "🖥️", group: "Digital & Gaming" },
  { id: "tech_tutorials", label: "Tech Tips", emoji: "⚡", group: "Digital & Gaming" },
  { id: "reviews", label: "Tech Reviews", emoji: "⭐", group: "Digital & Gaming" },
];

const VALID_THEME_ID_SET = new Set(FEED_THEMES.map((t) => t.id));

export const sanitizeSelectedThemes = (rawThemes?: unknown): string[] => {
  if (!Array.isArray(rawThemes)) {
    return FEED_THEMES.map((t) => t.id);
  }
  const valid = rawThemes.filter(
    (id): id is string => typeof id === "string" && VALID_THEME_ID_SET.has(id)
  );
  return valid.length > 0 ? Array.from(new Set(valid)) : FEED_THEMES.map((t) => t.id);
};

export const getFeedThemeMeta = (id?: string | null): ThemeDefinition | undefined => {
  if (!id) return undefined;
  return FEED_THEMES.find((t) => t.id === id);
};
