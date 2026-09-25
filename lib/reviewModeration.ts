// Centralized review moderation for scam / fraud detection
export const BANNED_REVIEW_PATTERNS = [
  // English words
  /\b(scam|scammer|scammers|scammed|scamming|fraud|fraudster|cheater|thief|fake seller)\b/i,
  
  // Banglish / Romanized Bengali
  /(taka|tk)\s*(mere|mara|marse|marce|marche|diche|dise|khalo|khaise|niye\s*palalo|paliese|palise)/i,
  /(amar|amr)\s*taka\s*(mere|marse|dise|diche)/i,
  /\b(batpar|butpar|protarok|dhokabaj|cheat|scam)\b/i,

  // Bengali script
  /(স্ক্যাম|স্ক্যামার|স্ক্যামিং)/i,
  /(টাকা\s*(মেরে|মাইরা|মারছে|মারা|মেরেছে|নিয়ে\s*গেছে|নিয়ে\s*ভেগেছে|খেয়েছে|খাইছে|মেরে\s*দিছে|মেরে\s*দিল))/i,
  /(আমার\s*টাকা\s*(মেরে|মারছে|নিয়ে|খেয়ে))/i,
  /(প্রতারক|বাটপার|বাটপারি|প্রতারণা|প্রতারিত|চিটার|চোর)/i,
];

/**
 * Returns true if the text contains prohibited scam / fraudulent accusation words
 */
export function isScamReview(text: string | null | undefined): boolean {
  if (!text) return false;
  const normalized = text
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // remove zero-width chars
    .replace(/[._\-+*#!?~]/g, ' ') // treat common separators as space
    .replace(/\s+/g, ' ')
    .trim();

  return BANNED_REVIEW_PATTERNS.some((pattern) => pattern.test(normalized));
}

/**
 * Filters out any reviews that violate safety standards
 */
export function filterSafeReviews<T extends { comment?: string; text?: string; isDeleted?: boolean; hidden?: boolean }>(
  reviews: T[]
): T[] {
  if (!Array.isArray(reviews)) return [];
  return reviews.filter((r) => {
    if (r.isDeleted || r.hidden) return false;
    const content = r.comment || r.text || '';
    return !isScamReview(content);
  });
}
