/**
 * Decoration Service
 * Manages stickers that kids can place on their videos
 * Supports PNG stickers (for baking into video) with emoji fallback
 *
 * PNG stickers are composited directly into video via FFmpeg
 * Emoji stickers are rendered via drawtext filter as fallback
 */

// Sticker categories with PNG and emoji options
// pngPath: null means PNG not yet available, will use emoji
// When PNG assets are added, update pngPath to require() the asset

export const STICKER_CATEGORIES = {
  party: {
    name: 'Party',
    icon: '🎉',
    stickers: [
      {
        id: 'balloon',
        name: 'Balloon',
        emoji: '🎈',
        pngPath: null, // TODO: require('../assets/stickers/party/balloon.png')
        color: '#FF6B9D',
      },
      {
        id: 'confetti',
        name: 'Confetti',
        emoji: '🎊',
        pngPath: null,
        color: '#FF69B4',
      },
      {
        id: 'gift',
        name: 'Gift',
        emoji: '🎁',
        pngPath: null,
        color: '#FF6347',
      },
      {
        id: 'cake',
        name: 'Cake',
        emoji: '🎂',
        pngPath: null,
        color: '#FFB6C1',
      },
      {
        id: 'party-popper',
        name: 'Party Popper',
        emoji: '🎉',
        pngPath: null,
        color: '#FFD700',
      },
      {
        id: 'fireworks',
        name: 'Fireworks',
        emoji: '🎆',
        pngPath: null,
        color: '#FFD93D',
      },
    ],
  },
  emotions: {
    name: 'Emotions',
    icon: '😊',
    stickers: [
      {
        id: 'smile',
        name: 'Smile',
        emoji: '😊',
        pngPath: null,
        color: '#FFD700',
      },
      {
        id: 'love',
        name: 'Love',
        emoji: '😍',
        pngPath: null,
        color: '#FF6B6B',
      },
      {
        id: 'excited',
        name: 'Excited',
        emoji: '🤩',
        pngPath: null,
        color: '#FFD93D',
      },
      {
        id: 'grateful',
        name: 'Grateful',
        emoji: '🥹',
        pngPath: null,
        color: '#FFB6C1',
      },
      {
        id: 'cool',
        name: 'Cool',
        emoji: '😎',
        pngPath: null,
        color: '#06B6D4',
      },
      {
        id: 'laugh',
        name: 'Laugh',
        emoji: '😂',
        pngPath: null,
        color: '#FFD700',
      },
    ],
  },
  nature: {
    name: 'Nature',
    icon: '🌸',
    stickers: [
      {
        id: 'flower',
        name: 'Flower',
        emoji: '🌸',
        pngPath: null,
        color: '#FFB6C1',
      },
      {
        id: 'rainbow',
        name: 'Rainbow',
        emoji: '🌈',
        pngPath: null,
        color: '#FF69B4',
      },
      {
        id: 'sun',
        name: 'Sun',
        emoji: '☀️',
        pngPath: null,
        color: '#FFD700',
      },
      {
        id: 'cloud',
        name: 'Cloud',
        emoji: '☁️',
        pngPath: null,
        color: '#87CEEB',
      },
      {
        id: 'butterfly',
        name: 'Butterfly',
        emoji: '🦋',
        pngPath: null,
        color: '#9B59B6',
      },
      {
        id: 'star',
        name: 'Star',
        emoji: '⭐',
        pngPath: null,
        color: '#FFD700',
      },
    ],
  },
  animals: {
    name: 'Animals',
    icon: '🐱',
    stickers: [
      {
        id: 'cat',
        name: 'Cat',
        emoji: '🐱',
        pngPath: null,
        color: '#FFA500',
      },
      {
        id: 'dog',
        name: 'Dog',
        emoji: '🐶',
        pngPath: null,
        color: '#8B4513',
      },
      {
        id: 'bunny',
        name: 'Bunny',
        emoji: '🐰',
        pngPath: null,
        color: '#FFB6C1',
      },
      {
        id: 'bear',
        name: 'Bear',
        emoji: '🐻',
        pngPath: null,
        color: '#8B4513',
      },
      {
        id: 'unicorn',
        name: 'Unicorn',
        emoji: '🦄',
        pngPath: null,
        color: '#FF69B4',
      },
      {
        id: 'dinosaur',
        name: 'Dinosaur',
        emoji: '🦕',
        pngPath: null,
        color: '#2ECC71',
      },
    ],
  },
  food: {
    name: 'Food',
    icon: '🍕',
    stickers: [
      {
        id: 'cupcake',
        name: 'Cupcake',
        emoji: '🧁',
        pngPath: null,
        color: '#FFB6C1',
      },
      {
        id: 'ice-cream',
        name: 'Ice Cream',
        emoji: '🍦',
        pngPath: null,
        color: '#FFD700',
      },
      {
        id: 'candy',
        name: 'Candy',
        emoji: '🍬',
        pngPath: null,
        color: '#FF69B4',
      },
      {
        id: 'pizza',
        name: 'Pizza',
        emoji: '🍕',
        pngPath: null,
        color: '#FF6347',
      },
      {
        id: 'donut',
        name: 'Donut',
        emoji: '🍩',
        pngPath: null,
        color: '#FFB6C1',
      },
      {
        id: 'cookie',
        name: 'Cookie',
        emoji: '🍪',
        pngPath: null,
        color: '#D2691E',
      },
    ],
  },
  sports: {
    name: 'Sports',
    icon: '⚽',
    stickers: [
      {
        id: 'soccer',
        name: 'Soccer',
        emoji: '⚽',
        pngPath: null,
        color: '#2ECC71',
      },
      {
        id: 'basketball',
        name: 'Basketball',
        emoji: '🏀',
        pngPath: null,
        color: '#FF6347',
      },
      {
        id: 'trophy',
        name: 'Trophy',
        emoji: '🏆',
        pngPath: null,
        color: '#FFD700',
      },
      {
        id: 'medal',
        name: 'Medal',
        emoji: '🥇',
        pngPath: null,
        color: '#FFD700',
      },
      {
        id: 'skateboard',
        name: 'Skateboard',
        emoji: '🛹',
        pngPath: null,
        color: '#9B59B6',
      },
      {
        id: 'baseball',
        name: 'Baseball',
        emoji: '⚾',
        pngPath: null,
        color: '#FFFFFF',
      },
    ],
  },
  seasonal: {
    name: 'Seasonal',
    icon: '❄️',
    stickers: [
      {
        id: 'heart',
        name: 'Heart',
        emoji: '❤️',
        pngPath: null,
        color: '#FF6B6B',
      },
      {
        id: 'sparkle',
        name: 'Sparkle',
        emoji: '✨',
        pngPath: null,
        color: '#FFD93D',
      },
      {
        id: 'snowflake',
        name: 'Snowflake',
        emoji: '❄️',
        pngPath: null,
        color: '#87CEEB',
      },
      {
        id: 'pumpkin',
        name: 'Pumpkin',
        emoji: '🎃',
        pngPath: null,
        color: '#FF6347',
      },
      {
        id: 'christmas-tree',
        name: 'Christmas Tree',
        emoji: '🎄',
        pngPath: null,
        color: '#2ECC71',
      },
      {
        id: 'clover',
        name: 'Clover',
        emoji: '☘️',
        pngPath: null,
        color: '#2ECC71',
      },
    ],
  },
};

// Legacy DECORATIONS array for backwards compatibility
// Maps to the new STICKER_CATEGORIES structure
export const DECORATIONS = [
  // Shapes (from nature & seasonal)
  { id: 'star', name: 'Star', emoji: '⭐', lottieSource: null, category: 'shapes', color: '#FFD700', description: 'Golden star' },
  { id: 'heart', name: 'Heart', emoji: '❤️', lottieSource: null, category: 'shapes', color: '#FF6B6B', description: 'Red heart' },
  { id: 'sparkle', name: 'Sparkle', emoji: '✨', lottieSource: null, category: 'shapes', color: '#FFD93D', description: 'Sparkles' },
  // Party
  { id: 'balloon', name: 'Balloon', emoji: '🎈', lottieSource: null, category: 'party', color: '#FF6B9D', description: 'Party balloon' },
  { id: 'confetti', name: 'Confetti', emoji: '🎊', lottieSource: null, category: 'party', color: '#FF69B4', description: 'Confetti popper' },
  { id: 'gift', name: 'Gift', emoji: '🎁', lottieSource: null, category: 'party', color: '#FF6347', description: 'Gift box' },
  // Faces (from emotions)
  { id: 'smile', name: 'Smile', emoji: '😊', lottieSource: null, category: 'faces', color: '#FFD700', description: 'Smiley face' },
  // Nature
  { id: 'rainbow', name: 'Rainbow', emoji: '🌈', lottieSource: null, category: 'nature', color: '#FF69B4', description: 'Rainbow' },
  { id: 'flower', name: 'Flower', emoji: '🌸', lottieSource: null, category: 'nature', color: '#FFB6C1', description: 'Pretty flower' },
  { id: 'sun', name: 'Sun', emoji: '☀️', lottieSource: null, category: 'nature', color: '#FFD700', description: 'Sunny day' },
];

// Legacy categories for backwards compatibility
export const DECORATION_CATEGORIES = [
  { id: 'all', label: 'All', icon: 'apps' },
  { id: 'shapes', label: 'Shapes', icon: 'star' },
  { id: 'party', label: 'Party', icon: 'balloon' },
  { id: 'faces', label: 'Faces', icon: 'happy' },
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
      pngPath: null,
      lottieSource: decoration.lottieSource,
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
    pngPath: sticker.pngPath,
    lottieSource: null,
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
  return sticker?.pngPath != null;
};

/**
 * Get sticker for compositing (returns PNG path or emoji)
 * @param {object} placedSticker - Placed sticker object
 * @returns {object} Sticker data for compositing
 */
export const getStickerForCompositing = (placedSticker) => {
  return {
    pngPath: placedSticker.pngPath,
    emoji: placedSticker.emoji,
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
