/**
 * Decoration Service
 * Manages simple decorations that kids can place on their videos
 * These are simple icon stickers (stars, hearts, etc.) - NOT full frames
 *
 * Supports both emoji fallback and Lottie animations
 * If Lottie files exist in assets/lottie/decorations/, they will be used
 * Otherwise, falls back to emoji
 */

// Helper to safely load Lottie files
const getLottieSource = (filename) => {
  try {
    // Try to load the Lottie file - will fail gracefully if file doesn't exist
    return require(`../assets/lottie/decorations/${filename}`);
  } catch (e) {
    // File doesn't exist, return null to fallback to emoji
    return null;
  }
};

// Simple decorations for kids to place on videos
export const DECORATIONS = [
  {
    id: 'star',
    name: 'Star',
    emoji: '⭐',
    lottieFilename: 'star.json',
    lottieSource: getLottieSource('star.json'),
    category: 'shapes',
    color: '#FFD700',
    description: 'Golden star',
  },
  {
    id: 'heart',
    name: 'Heart',
    emoji: '❤️',
    lottieFilename: 'heart.json',
    lottieSource: getLottieSource('heart.json'),
    category: 'shapes',
    color: '#FF6B6B',
    description: 'Red heart',
  },
  {
    id: 'balloon',
    name: 'Balloon',
    emoji: '🎈',
    lottieFilename: 'balloon.json',
    lottieSource: getLottieSource('balloon.json'),
    category: 'party',
    color: '#FF6B9D',
    description: 'Party balloon',
  },
  {
    id: 'confetti',
    name: 'Confetti',
    emoji: '🎊',
    lottieFilename: 'confetti.json',
    lottieSource: getLottieSource('confetti.json'),
    category: 'party',
    color: '#FF69B4',
    description: 'Confetti popper',
  },
  {
    id: 'sparkle',
    name: 'Sparkle',
    emoji: '✨',
    lottieFilename: 'sparkle.json',
    lottieSource: getLottieSource('sparkle.json'),
    category: 'shapes',
    color: '#FFD93D',
    description: 'Sparkles',
  },
  {
    id: 'gift',
    name: 'Gift',
    emoji: '🎁',
    lottieFilename: 'gift.json',
    lottieSource: getLottieSource('gift.json'),
    category: 'party',
    color: '#FF6347',
    description: 'Gift box',
  },
  {
    id: 'smile',
    name: 'Smile',
    emoji: '😊',
    lottieFilename: 'smile.json',
    lottieSource: getLottieSource('smile.json'),
    category: 'faces',
    color: '#FFD700',
    description: 'Smiley face',
  },
  {
    id: 'rainbow',
    name: 'Rainbow',
    emoji: '🌈',
    lottieFilename: 'rainbow.json',
    lottieSource: getLottieSource('rainbow.json'),
    category: 'nature',
    color: '#FF69B4',
    description: 'Rainbow',
  },
  {
    id: 'flower',
    name: 'Flower',
    emoji: '🌸',
    lottieFilename: 'flower.json',
    lottieSource: getLottieSource('flower.json'),
    category: 'nature',
    color: '#FFB6C1',
    description: 'Pretty flower',
  },
  {
    id: 'sun',
    name: 'Sun',
    emoji: '☀️',
    lottieFilename: 'sun.json',
    lottieSource: getLottieSource('sun.json'),
    category: 'nature',
    color: '#FFD700',
    description: 'Sunny day',
  },
];

// Categories for organizing decorations
export const DECORATION_CATEGORIES = [
  { id: 'all', label: 'All', icon: 'apps' },
  { id: 'shapes', label: 'Shapes', icon: 'star' },
  { id: 'party', label: 'Party', icon: 'balloon' },
  { id: 'faces', label: 'Faces', icon: 'happy' },
  { id: 'nature', label: 'Nature', icon: 'sunny' },
];

/**
 * Get decorations by category
 */
export const getDecorationsByCategory = (category) => {
  if (category === 'all') return DECORATIONS;
  return DECORATIONS.filter(decoration => decoration.category === category);
};

/**
 * Get specific decoration by ID
 */
export const getDecorationById = (id) => {
  return DECORATIONS.find(decoration => decoration.id === id);
};

/**
 * Create a placed decoration instance with position and scale
 */
export const createPlacedDecoration = (decorationId, x = 50, y = 50, scale = 1.0) => {
  const decoration = getDecorationById(decorationId);
  if (!decoration) return null;

  return {
    id: `${decorationId}-${Date.now()}`, // Unique instance ID
    decorationId, // Reference to base decoration
    emoji: decoration.emoji,
    lottieSource: decoration.lottieSource, // Lottie animation source (or null for emoji fallback)
    x, // Position X (percentage 0-100)
    y, // Position Y (percentage 0-100)
    scale, // Size multiplier (0.5 to 2.0)
    rotation: 0, // Rotation in degrees (0-360)
  };
};

/**
 * Validate decoration position is within bounds
 */
export const validatePosition = (x, y) => {
  return {
    x: Math.max(5, Math.min(95, x)),
    y: Math.max(5, Math.min(95, y)),
  };
};

/**
 * Validate decoration scale is within bounds
 */
export const validateScale = (scale) => {
  return Math.max(0.5, Math.min(2.0, scale));
};

export default {
  DECORATIONS,
  DECORATION_CATEGORIES,
  getDecorationsByCategory,
  getDecorationById,
  createPlacedDecoration,
  validatePosition,
  validateScale,
};
