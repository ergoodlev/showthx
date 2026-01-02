/**
 * Decoration Service
 * Manages stickers that kids can place on their videos
 * Supports PNG stickers (for baking into video) with emoji fallback
 *
 * PNG stickers are composited directly into video via FFmpeg
 * Emoji stickers are rendered via drawtext filter as fallback
 */

// Sticker categories - Microsoft Fluent Emoji 3D
// All stickers use Fluent 3D PNGs from Supabase storage for consistent look
// PNG files are named: fluent-{id}.png

export const STICKER_CATEGORIES = {
  party: {
    name: 'Party',
    icon: '🎉',
    stickers: [
      { id: 'balloon', name: 'Balloon', emoji: '🎈', pngFile: 'fluent-balloon.png', color: '#FF6B9D' },
      { id: 'confetti', name: 'Confetti', emoji: '🎊', pngFile: 'fluent-confetti.png', color: '#FF69B4' },
      { id: 'gift', name: 'Gift', emoji: '🎁', pngFile: 'fluent-gift.png', color: '#FF6347' },
      { id: 'cake', name: 'Cake', emoji: '🎂', pngFile: 'fluent-cake.png', color: '#FFB6C1' },
      { id: 'party-popper', name: 'Party Popper', emoji: '🎉', pngFile: 'fluent-party-popper.png', color: '#FFD700' },
      { id: 'cupcake', name: 'Cupcake', emoji: '🧁', pngFile: 'fluent-cupcake.png', color: '#FF9EC4' },
      { id: 'candy', name: 'Candy', emoji: '🍬', pngFile: 'fluent-candy.png', color: '#FF6B6B' },
      { id: 'lollipop', name: 'Lollipop', emoji: '🍭', pngFile: 'fluent-lollipop.png', color: '#FF69B4' },
      { id: 'ribbon', name: 'Ribbon', emoji: '🎀', pngFile: 'fluent-ribbon.png', color: '#FF1493' },
    ],
  },
  faces: {
    name: 'Faces',
    icon: '😊',
    stickers: [
      { id: 'smile', name: 'Smile', emoji: '😊', pngFile: 'fluent-smile.png', color: '#FFD700' },
      { id: 'heart-eyes', name: 'Heart Eyes', emoji: '😍', pngFile: 'fluent-heart-eyes.png', color: '#FF6B6B' },
      { id: 'star-eyes', name: 'Star Struck', emoji: '🤩', pngFile: 'fluent-star-eyes.png', color: '#FFD700' },
      { id: 'grin', name: 'Grin', emoji: '😀', pngFile: 'fluent-grin.png', color: '#FFD700' },
      { id: 'joy', name: 'Joy', emoji: '😂', pngFile: 'fluent-joy.png', color: '#FFD700' },
      { id: 'blush', name: 'Blush', emoji: '☺️', pngFile: 'fluent-blush.png', color: '#FFB6C1' },
      { id: 'wink', name: 'Wink', emoji: '😉', pngFile: 'fluent-wink.png', color: '#FFD700' },
      { id: 'hug', name: 'Hug', emoji: '🤗', pngFile: 'fluent-hug.png', color: '#FFD700' },
    ],
  },
  hearts: {
    name: 'Hearts',
    icon: '❤️',
    stickers: [
      { id: 'red-heart', name: 'Red Heart', emoji: '❤️', pngFile: 'fluent-red-heart.png', color: '#FF0000' },
      { id: 'sparkling-heart', name: 'Sparkling', emoji: '💖', pngFile: 'fluent-sparkling-heart.png', color: '#FF69B4' },
      { id: 'heart-ribbon', name: 'With Ribbon', emoji: '💝', pngFile: 'fluent-heart-ribbon.png', color: '#FF1493' },
      { id: 'growing-heart', name: 'Growing', emoji: '💗', pngFile: 'fluent-growing-heart.png', color: '#FF69B4' },
      { id: 'two-hearts', name: 'Two Hearts', emoji: '💕', pngFile: 'fluent-two-hearts.png', color: '#FF69B4' },
      { id: 'heart-decoration', name: 'Decoration', emoji: '💟', pngFile: 'fluent-heart-decoration.png', color: '#FF69B4' },
      { id: 'pink-heart', name: 'Pink Heart', emoji: '🩷', pngFile: 'fluent-pink-heart.png', color: '#FFB6C1' },
      { id: 'orange-heart', name: 'Orange Heart', emoji: '🧡', pngFile: 'fluent-orange-heart.png', color: '#FF8C00' },
    ],
  },
  stars: {
    name: 'Stars',
    icon: '⭐',
    stickers: [
      { id: 'glowing-star', name: 'Glowing Star', emoji: '🌟', pngFile: 'fluent-glowing-star.png', color: '#FFD700' },
      { id: 'star', name: 'Star', emoji: '⭐', pngFile: 'fluent-star.png', color: '#FFD700' },
      { id: 'sparkles', name: 'Sparkles', emoji: '✨', pngFile: 'fluent-sparkles.png', color: '#FFD93D' },
      { id: 'dizzy', name: 'Dizzy', emoji: '💫', pngFile: 'fluent-dizzy.png', color: '#FFD700' },
      { id: 'collision', name: 'Boom!', emoji: '💥', pngFile: 'fluent-collision.png', color: '#FF4500' },
      { id: 'fire', name: 'Fire', emoji: '🔥', pngFile: 'fluent-fire.png', color: '#FF4500' },
    ],
  },
  nature: {
    name: 'Nature',
    icon: '🌈',
    stickers: [
      { id: 'rainbow', name: 'Rainbow', emoji: '🌈', pngFile: 'fluent-rainbow.png', color: '#FF69B4' },
      { id: 'sun', name: 'Sun', emoji: '🌞', pngFile: 'fluent-sun.png', color: '#FFD700' },
      { id: 'sunflower', name: 'Sunflower', emoji: '🌻', pngFile: 'fluent-sunflower.png', color: '#FFD700' },
      { id: 'tulip', name: 'Tulip', emoji: '🌷', pngFile: 'fluent-tulip.png', color: '#FF69B4' },
      { id: 'four-leaf-clover', name: 'Clover', emoji: '🍀', pngFile: 'fluent-four-leaf-clover.png', color: '#32CD32' },
      { id: 'butterfly', name: 'Butterfly', emoji: '🦋', pngFile: 'fluent-butterfly.png', color: '#87CEEB' },
      { id: 'unicorn', name: 'Unicorn', emoji: '🦄', pngFile: 'fluent-unicorn.png', color: '#FF69B4' },
      { id: 'crown', name: 'Crown', emoji: '👑', pngFile: 'fluent-crown.png', color: '#FFD700' },
    ],
  },
  animals: {
    name: 'Animals',
    icon: '🐶',
    stickers: [
      { id: 'cat-heart', name: 'Cat Love', emoji: '😻', pngFile: 'fluent-cat-heart.png', color: '#FFA500' },
      { id: 'dog', name: 'Dog', emoji: '🐶', pngFile: 'fluent-dog.png', color: '#D2691E' },
      { id: 'bear', name: 'Bear', emoji: '🐻', pngFile: 'fluent-bear.png', color: '#8B4513' },
      { id: 'bunny', name: 'Bunny', emoji: '🐰', pngFile: 'fluent-bunny.png', color: '#FFB6C1' },
      { id: 'panda', name: 'Panda', emoji: '🐼', pngFile: 'fluent-panda.png', color: '#000000' },
    ],
  },
};

// Legacy DECORATIONS array - auto-generated from STICKER_CATEGORIES
export const DECORATIONS = Object.entries(STICKER_CATEGORIES).flatMap(([categoryId, category]) =>
  category.stickers.map(sticker => ({
    ...sticker,
    category: categoryId,
    description: sticker.name,
  }))
);

// Legacy categories for backwards compatibility
export const DECORATION_CATEGORIES = [
  { id: 'all', label: 'All', icon: 'apps' },
  { id: 'party', label: 'Party', icon: 'balloon' },
  { id: 'faces', label: 'Faces', icon: 'happy' },
  { id: 'shapes', label: 'Hearts', icon: 'heart' },
  { id: 'nature', label: 'Nature', icon: 'sunny' },
];

// New sticker categories for the enhanced UI
export const getStickerCategories = () => {
  return Object.keys(STICKER_CATEGORIES).map(key => ({
    id: key,
    name: STICKER_CATEGORIES[key].name,
    icon: STICKER_CATEGORIES[key].icon,
  }));
};

/**
 * Get all stickers for a category
 * @param {string} categoryId - Category ID
 * @returns {Array} Array of sticker objects
 */
export const getStickersForCategory = (categoryId) => {
  const category = STICKER_CATEGORIES[categoryId];
  return category ? category.stickers : [];
};

/**
 * Get a sticker by ID (searches all categories)
 * @param {string} stickerId - Sticker ID
 * @returns {object|null} Sticker object or null
 */
export const getStickerById = (stickerId) => {
  for (const category of Object.values(STICKER_CATEGORIES)) {
    const sticker = category.stickers.find(s => s.id === stickerId);
    if (sticker) return sticker;
  }
  return null;
};

/**
 * Get all stickers as a flat array
 * @returns {Array} All stickers
 */
export const getAllStickers = () => {
  return Object.values(STICKER_CATEGORIES).flatMap(cat => cat.stickers);
};

/**
 * Get decorations by category (legacy support)
 */
export const getDecorationsByCategory = (category) => {
  if (category === 'all') return DECORATIONS;
  return DECORATIONS.filter(decoration => decoration.category === category);
};

/**
 * Get specific decoration by ID (legacy support)
 */
export const getDecorationById = (id) => {
  return DECORATIONS.find(decoration => decoration.id === id);
};

/**
 * Create a placed sticker instance with position and scale
 * Supports both PNG and emoji stickers
 * @param {string} stickerId - Sticker ID
 * @param {number} x - X position (0-100 percentage)
 * @param {number} y - Y position (0-100 percentage)
 * @param {number} scale - Scale factor (0.5 to 2.0)
 * @returns {object|null} Placed sticker object
 */
export const createPlacedSticker = (stickerId, x = 50, y = 50, scale = 1.0) => {
  const sticker = getStickerById(stickerId);
  if (!sticker) {
    // Try legacy decorations
    const decoration = getDecorationById(stickerId);
    if (!decoration) return null;

    return {
      id: `${stickerId}-${Date.now()}`,
      stickerId,
      decorationId: stickerId, // Legacy compatibility
      emoji: decoration.emoji,
      pngFile: decoration.pngFile || null,
      x,
      y,
      scale,
      rotation: 0,
    };
  }

  return {
    id: `${stickerId}-${Date.now()}`,
    stickerId,
    decorationId: stickerId, // Legacy compatibility
    emoji: sticker.emoji,
    pngFile: sticker.pngFile || null,
    x,
    y,
    scale,
    rotation: 0,
  };
};

/**
 * Create a placed decoration instance (legacy support)
 * @deprecated Use createPlacedSticker instead
 */
export const createPlacedDecoration = (decorationId, x = 50, y = 50, scale = 1.0) => {
  return createPlacedSticker(decorationId, x, y, scale);
};

/**
 * Validate sticker position is within bounds
 */
export const validatePosition = (x, y) => {
  return {
    x: Math.max(5, Math.min(95, x)),
    y: Math.max(5, Math.min(95, y)),
  };
};

/**
 * Validate sticker scale is within bounds
 */
export const validateScale = (scale) => {
  return Math.max(0.5, Math.min(2.0, scale));
};

/**
 * Check if a sticker has a PNG version available
 * @param {string} stickerId - Sticker ID
 * @returns {boolean}
 */
export const hasPngVersion = (stickerId) => {
  const sticker = getStickerById(stickerId);
  return sticker?.pngFile != null;
};

/**
 * Get sticker for compositing (returns emoji - server looks up PNG by emoji)
 * @param {object} placedSticker - Placed sticker object
 * @returns {object} Sticker data for compositing
 */
export const getStickerForCompositing = (placedSticker) => {
  return {
    emoji: placedSticker.emoji,
    pngFile: placedSticker.pngFile,
    x: placedSticker.x,
    y: placedSticker.y,
    scale: placedSticker.scale,
    rotation: placedSticker.rotation,
  };
};

export default {
  // New sticker API
  STICKER_CATEGORIES,
  getStickerCategories,
  getStickersForCategory,
  getStickerById,
  getAllStickers,
  createPlacedSticker,
  hasPngVersion,
  getStickerForCompositing,
  // Legacy API (backwards compatibility)
  DECORATIONS,
  DECORATION_CATEGORIES,
  getDecorationsByCategory,
  getDecorationById,
  createPlacedDecoration,
  validatePosition,
  validateScale,
};
