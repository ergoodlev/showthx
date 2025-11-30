/**
 * Decoration Service
 * Manages simple decorations that kids can place on their videos
 * These are simple icon stickers (stars, hearts, etc.) - NOT full frames
 *
 * NOTE: Currently using emoji-based decorations
 * Can be upgraded to Lottie animations later
 */

// Simple decorations for kids to place on videos
export const DECORATIONS = [
  {
    id: 'star',
    name: 'Star',
    emoji: '⭐',
    category: 'shapes',
    color: '#FFD700',
    description: 'Golden star',
  },
  {
    id: 'heart',
    name: 'Heart',
    emoji: '❤️',
    category: 'shapes',
    color: '#FF6B6B',
    description: 'Red heart',
  },
  {
    id: 'balloon',
    name: 'Balloon',
    emoji: '🎈',
    category: 'party',
    color: '#FF6B9D',
    description: 'Party balloon',
  },
  {
    id: 'confetti',
    name: 'Confetti',
    emoji: '🎊',
    category: 'party',
    color: '#FF69B4',
    description: 'Confetti popper',
  },
  {
    id: 'sparkle',
    name: 'Sparkle',
    emoji: '✨',
    category: 'shapes',
    color: '#FFD93D',
    description: 'Sparkles',
  },
  {
    id: 'gift',
    name: 'Gift',
    emoji: '🎁',
    category: 'party',
    color: '#FF6347',
    description: 'Gift box',
  },
  {
    id: 'smile',
    name: 'Smile',
    emoji: '😊',
    category: 'faces',
    color: '#FFD700',
    description: 'Smiley face',
  },
  {
    id: 'rainbow',
    name: 'Rainbow',
    emoji: '🌈',
    category: 'nature',
    color: '#FF69B4',
    description: 'Rainbow',
  },
  {
    id: 'flower',
    name: 'Flower',
    emoji: '🌸',
    category: 'nature',
    color: '#FFB6C1',
    description: 'Pretty flower',
  },
  {
    id: 'sun',
    name: 'Sun',
    emoji: '☀️',
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
