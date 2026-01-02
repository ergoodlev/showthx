/**
 * Gift Category Service
 * Maps gift types to emojis and provides AI-powered gift parsing
 */

import { supabase } from '../supabaseClient';

// Gift category to emoji mapping
// These are kid-friendly categories with large, recognizable emojis
export const GIFT_CATEGORIES = {
  // Toys & Games
  stuffed_animal: { emoji: '🧸', label: 'Stuffed Animal', keywords: ['stuffed', 'plush', 'teddy', 'animal', 'bear', 'bunny', 'elephant', 'dog', 'cat', 'unicorn'] },
  doll: { emoji: '🪆', label: 'Doll', keywords: ['doll', 'barbie', 'baby doll', 'action figure', 'figurine'] },
  lego: { emoji: '🧱', label: 'LEGO/Blocks', keywords: ['lego', 'blocks', 'building', 'duplo', 'mega blocks', 'minecraft'] },
  board_game: { emoji: '🎲', label: 'Board Game', keywords: ['board game', 'puzzle', 'game', 'monopoly', 'uno', 'cards', 'chess'] },
  video_game: { emoji: '🎮', label: 'Video Game', keywords: ['video game', 'nintendo', 'switch', 'xbox', 'playstation', 'ps5', 'gaming', 'controller', 'pokemon'] },
  toy_car: { emoji: '🚗', label: 'Toy Car/Vehicle', keywords: ['car', 'truck', 'train', 'hot wheels', 'vehicle', 'airplane', 'helicopter', 'boat'] },
  robot: { emoji: '🤖', label: 'Robot/Tech Toy', keywords: ['robot', 'drone', 'remote control', 'rc', 'electronic', 'coding', 'stem'] },

  // Creative & Educational
  art_supplies: { emoji: '🎨', label: 'Art Supplies', keywords: ['art', 'paint', 'crayon', 'marker', 'drawing', 'coloring', 'craft', 'playdoh', 'clay'] },
  book: { emoji: '📚', label: 'Book', keywords: ['book', 'reading', 'story', 'comic', 'manga', 'novel'] },
  musical: { emoji: '🎵', label: 'Musical', keywords: ['music', 'instrument', 'piano', 'guitar', 'drum', 'microphone', 'karaoke'] },
  science: { emoji: '🔬', label: 'Science Kit', keywords: ['science', 'experiment', 'chemistry', 'telescope', 'microscope', 'dinosaur', 'fossil'] },

  // Sports & Outdoor
  sports: { emoji: '⚽', label: 'Sports Equipment', keywords: ['ball', 'soccer', 'basketball', 'football', 'baseball', 'tennis', 'golf', 'sports'] },
  bike: { emoji: '🚲', label: 'Bike/Scooter', keywords: ['bike', 'bicycle', 'scooter', 'skateboard', 'roller', 'skates', 'helmet'] },
  outdoor: { emoji: '🏕️', label: 'Outdoor Gear', keywords: ['outdoor', 'camping', 'tent', 'fishing', 'swimming', 'pool', 'water'] },

  // Clothing & Accessories
  clothing: { emoji: '👕', label: 'Clothing', keywords: ['shirt', 'dress', 'pants', 'shoes', 'clothes', 'outfit', 'costume', 'pajamas'] },
  jewelry: { emoji: '💎', label: 'Jewelry/Accessories', keywords: ['jewelry', 'necklace', 'bracelet', 'ring', 'watch', 'earring', 'accessories'] },
  bag: { emoji: '🎒', label: 'Bag/Backpack', keywords: ['bag', 'backpack', 'purse', 'luggage', 'suitcase'] },

  // Electronics
  electronics: { emoji: '📱', label: 'Electronics', keywords: ['tablet', 'ipad', 'phone', 'computer', 'laptop', 'headphones', 'earbuds', 'camera'] },

  // Money & Gift Cards
  money: { emoji: '💵', label: 'Money/Gift Card', keywords: ['money', 'cash', 'gift card', 'amazon', 'visa', 'card', 'certificate', 'dollars'] },

  // Food & Treats
  candy: { emoji: '🍬', label: 'Candy/Treats', keywords: ['candy', 'chocolate', 'sweets', 'treats', 'cookies', 'cake'] },

  // Pets & Animals
  pet: { emoji: '🐕', label: 'Pet/Animal', keywords: ['pet', 'fish', 'hamster', 'turtle', 'bird', 'aquarium', 'cage'] },

  // Home & Room
  room_decor: { emoji: '🛏️', label: 'Room Decor', keywords: ['blanket', 'pillow', 'lamp', 'poster', 'decor', 'bedding', 'furniture'] },

  // Default
  gift: { emoji: '🎁', label: 'Gift', keywords: [] },
};

/**
 * Get emoji for a gift category
 */
export function getEmojiForCategory(category) {
  return GIFT_CATEGORIES[category]?.emoji || '🎁';
}

/**
 * Get label for a gift category
 */
export function getLabelForCategory(category) {
  return GIFT_CATEGORIES[category]?.label || 'Gift';
}

/**
 * Clean up a gift name by removing common prefixes and notes
 */
function cleanGiftName(giftText) {
  if (!giftText) return 'Gift';

  let cleaned = giftText
    // Remove child name prefixes like "(ELI)" or "(ASHER)"
    .replace(/\([A-Z]+\)\s*/gi, '')
    // Remove common instruction text
    .replace(/thank.*both|thank.*them|don't forget|please note/gi, '')
    // Remove quantity notes like "(x2)" or "x 3"
    .replace(/\(x\d+\)|x\s*\d+/gi, '')
    // Remove multiple spaces
    .replace(/\s+/g, ' ')
    .trim();

  // Capitalize first letter of each word
  cleaned = cleaned.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  // Keep full gift name - only limit extremely long names for display
  if (cleaned.length > 100) {
    cleaned = cleaned.substring(0, 97) + '...';
  }

  return cleaned || 'Gift';
}

/**
 * Simple local matching - try to match gift text to a category using keywords
 * This is used as a fallback when AI parsing isn't available
 */
export function matchGiftToCategory(giftText) {
  if (!giftText) return { category: 'gift', emoji: '🎁', parsedName: 'Gift' };

  const lowerText = giftText.toLowerCase();
  const cleanedName = cleanGiftName(giftText);

  // Try to match against each category's keywords
  for (const [categoryKey, categoryData] of Object.entries(GIFT_CATEGORIES)) {
    if (categoryKey === 'gift') continue; // Skip default

    for (const keyword of categoryData.keywords) {
      if (lowerText.includes(keyword)) {
        return {
          category: categoryKey,
          emoji: categoryData.emoji,
          parsedName: cleanedName,  // Use cleaned gift name, not category label
        };
      }
    }
  }

  // Default to generic gift with cleaned name
  return {
    category: 'gift',
    emoji: '🎁',
    parsedName: cleanedName,
  };
}

/**
 * Parse multiple gifts using AI (calls Supabase Edge Function)
 * This extracts clean gift names and categories from messy freeform text
 *
 * @param {Array<{id: string, name: string}>} gifts - Array of gifts with raw names
 * @returns {Promise<Array<{id: string, category: string, emoji: string, parsedName: string}>>}
 */
export async function parseGiftsWithAI(gifts) {
  if (!gifts || gifts.length === 0) return [];

  try {
    // Call Supabase Edge Function for AI parsing
    const { data, error } = await supabase.functions.invoke('parse-gift-categories', {
      body: { gifts: gifts.map(g => ({ id: g.id, rawName: g.name })) },
    });

    if (error) {
      console.warn('[GiftCategory] AI parsing failed, using local matching:', error);
      // Fallback to local keyword matching
      return gifts.map(gift => ({
        id: gift.id,
        ...matchGiftToCategory(gift.name),
      }));
    }

    return data.parsedGifts;
  } catch (err) {
    console.error('[GiftCategory] Error parsing gifts:', err);
    // Fallback to local keyword matching
    return gifts.map(gift => ({
      id: gift.id,
      ...matchGiftToCategory(gift.name),
    }));
  }
}

/**
 * Update gift with parsed category data
 */
export async function updateGiftCategory(giftId, category, emoji, parsedName) {
  const { error } = await supabase
    .from('gifts')
    .update({
      gift_category: category,
      gift_emoji: emoji,
      parsed_gift_name: parsedName,
    })
    .eq('id', giftId);

  if (error) {
    console.error('[GiftCategory] Error updating gift:', error);
    throw error;
  }
}

/**
 * Batch update gifts with parsed categories
 */
export async function batchUpdateGiftCategories(parsedGifts) {
  const updates = parsedGifts.map(gift =>
    updateGiftCategory(gift.id, gift.category, gift.emoji, gift.parsedName)
  );

  await Promise.all(updates);
}

/**
 * Get a kid-friendly audio prompt for the gift
 */
export function getAudioPromptForGift(giftName, giverName, parsedGiftName) {
  const displayName = parsedGiftName || giftName || 'the gift';
  const giver = giverName || 'someone special';

  return `Time to say thank you to ${giver} for the ${displayName}!`;
}

/**
 * Get all available categories for UI display (e.g., manual selection)
 */
export function getAllCategories() {
  return Object.entries(GIFT_CATEGORIES).map(([key, value]) => ({
    key,
    emoji: value.emoji,
    label: value.label,
  }));
}

export default {
  GIFT_CATEGORIES,
  getEmojiForCategory,
  getLabelForCategory,
  matchGiftToCategory,
  parseGiftsWithAI,
  updateGiftCategory,
  batchUpdateGiftCategories,
  getAudioPromptForGift,
  getAllCategories,
};
