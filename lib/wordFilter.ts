import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Helper to check if text contains any banned / prohibited words
export const checkContainsBannedWord = async (text: string): Promise<string | null> => {
  if (!text || typeof text !== 'string') return null;
  try {
    const snap = await getDoc(doc(db, 'settings', 'word_filter'));
    if (snap.exists()) {
      const data = snap.data();
      const bannedWords: string[] = Array.isArray(data.bannedWords) ? data.bannedWords : [];
      const lowerText = text.toLowerCase();
      
      for (const word of bannedWords) {
        const cleanWord = word?.trim().toLowerCase();
        if (cleanWord && cleanWord.length > 0) {
          // Check as whole word or substring match
          if (lowerText.includes(cleanWord)) {
            return cleanWord;
          }
        }
      }
    }
  } catch (err) {
    console.error('Error checking banned words:', err);
  }
  return null;
};

// Synchronous check if bannedWords array is already loaded
export const containsBannedWordSync = (text: string, bannedWords: string[]): string | null => {
  if (!text || !Array.isArray(bannedWords)) return null;
  const lowerText = text.toLowerCase();
  for (const word of bannedWords) {
    const cleanWord = word?.trim().toLowerCase();
    if (cleanWord && cleanWord.length > 0 && lowerText.includes(cleanWord)) {
      return cleanWord;
    }
  }
  return null;
};
