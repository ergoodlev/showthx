/**
 * Frame Service
 * Manages both static and animated Lottie frames for video overlays
 *
 * STATIC FRAMES: Work immediately, no downloads required
 * LOTTIE FRAMES: Animated, require JSON files from LottieFiles.com
 * See LOTTIE_DOWNLOAD_INSTRUCTIONS.md for Lottie download instructions
 */

// Frame library with both static and Lottie animations
export const FRAME_LIBRARY = [
  {
    id: 'none',
    name: 'No Frame',
    category: 'basic',
    frameType: 'none',
    lottieSource: null,
    staticFrameId: null,
    description: 'Video without frame overlay',
    preview: null,
  },
  // STATIC FRAMES (ready to use immediately)
  {
    id: 'rainbow-gradient',
    name: 'Rainbow Gradient',
    category: 'celebration',
    frameType: 'static',
    staticFrameId: 'rainbow-gradient',
    lottieSource: null,
    description: 'Vibrant rainbow border',
    preview: 'Colorful gradient frame',
  },
  {
    id: 'confetti-static',
    name: 'Confetti Dots',
    category: 'celebration',
    frameType: 'static',
    staticFrameId: 'confetti-static',
    lottieSource: null,
    description: 'Colorful confetti pattern',
    preview: 'Confetti dots around edges',
  },
  {
    id: 'star-burst',
    name: 'Star Burst',
    category: 'elegant',
    frameType: 'static',
    staticFrameId: 'star-burst',
    lottieSource: null,
    description: 'Golden stars',
    preview: 'Stars in corners',
  },
  {
    id: 'heart-corners',
    name: 'Heart Corners',
    category: 'love',
    frameType: 'static',
    staticFrameId: 'heart-corners',
    lottieSource: null,
    description: 'Lovely pink hearts',
    preview: 'Hearts around video',
  },
  {
    id: 'neon-glow',
    name: 'Neon Glow',
    category: 'celebration',
    frameType: 'static',
    staticFrameId: 'neon-glow',
    lottieSource: null,
    description: 'Glowing neon border',
    preview: 'Neon cyan glow',
  },
  {
    id: 'sparkle-border',
    name: 'Sparkle Border',
    category: 'elegant',
    frameType: 'static',
    staticFrameId: 'sparkle-border',
    lottieSource: null,
    description: 'Sparkly gold border',
    preview: 'Sparkles around edges',
  },
  {
    id: 'bubble-party',
    name: 'Bubble Party',
    category: 'kids',
    frameType: 'static',
    staticFrameId: 'bubble-party',
    lottieSource: null,
    description: 'Colorful bubbles',
    preview: 'Fun bubble overlay',
  },
  {
    id: 'geometric-modern',
    name: 'Geometric',
    category: 'elegant',
    frameType: 'static',
    staticFrameId: 'geometric-modern',
    lottieSource: null,
    description: 'Modern geometric shapes',
    preview: 'Colorful triangles',
  },
  {
    id: 'flower-power',
    name: 'Flower Power',
    category: 'elegant',
    frameType: 'static',
    staticFrameId: 'flower-power',
    lottieSource: null,
    description: 'Beautiful flowers',
    preview: 'Flower decorations',
  },
  {
    id: 'celebration-blast',
    name: 'Celebration',
    category: 'celebration',
    frameType: 'static',
    staticFrameId: 'celebration-blast',
    lottieSource: null,
    description: 'Party elements',
    preview: 'Balloons, gifts & smiles',
  },
  // LOTTIE FRAMES (require downloads)
  {
    id: 'birthday-balloons',
    name: 'Birthday Balloons',
    category: 'celebration',
    frameType: 'lottie',
    staticFrameId: null,
    lottieSource: () => require('../assets/lottie/birthday-balloons.json'),
    description: 'Colorful floating birthday balloons',
    preview: 'Animated balloons around video edges',
  },
  {
    id: 'confetti-celebration',
    name: 'Confetti Party (Animated)',
    category: 'celebration',
    frameType: 'lottie',
    staticFrameId: null,
    lottieSource: () => require('../assets/lottie/confetti-celebration.json'),
    description: 'Celebration confetti shower',
    preview: 'Confetti falling animation',
  },
  {
    id: 'sparkle-stars',
    name: 'Sparkle Stars (Animated)',
    category: 'elegant',
    frameType: 'lottie',
    staticFrameId: null,
    lottieSource: () => require('../assets/lottie/sparkle-stars.json'),
    description: 'Twinkling stars border',
    preview: 'Sparkling stars around edges',
  },
  {
    id: 'floating-hearts',
    name: 'Floating Hearts (Animated)',
    category: 'love',
    frameType: 'lottie',
    staticFrameId: null,
    lottieSource: () => require('../assets/lottie/floating-hearts.json'),
    description: 'Romantic floating hearts',
    preview: 'Hearts float up from bottom',
  },
  {
    id: 'fireworks-burst',
    name: 'Fireworks (Animated)',
    category: 'celebration',
    frameType: 'lottie',
    staticFrameId: null,
    lottieSource: () => require('../assets/lottie/fireworks-burst.json'),
    description: 'Exciting fireworks display',
    preview: 'Fireworks bursting',
  },
  {
    id: 'rainbow-border-animated',
    name: 'Rainbow Frame (Animated)',
    category: 'kids',
    frameType: 'lottie',
    staticFrameId: null,
    lottieSource: () => require('../assets/lottie/rainbow-border.json'),
    description: 'Colorful rainbow border',
    preview: 'Animated rainbow colors',
  },
  {
    id: 'cute-dinosaurs',
    name: 'Dino Friends (Animated)',
    category: 'kids',
    frameType: 'lottie',
    staticFrameId: null,
    lottieSource: () => require('../assets/lottie/cute-dinosaurs.json'),
    description: 'Cute friendly dinosaurs',
    preview: 'Dinosaurs peek in from corners',
  },
  {
    id: 'magic-unicorn',
    name: 'Magic Unicorn (Animated)',
    category: 'kids',
    frameType: 'lottie',
    staticFrameId: null,
    lottieSource: () => require('../assets/lottie/magic-unicorn.json'),
    description: 'Magical unicorn with sparkles',
    preview: 'Unicorn and magic effects',
  },
  {
    id: 'space-rockets',
    name: 'Space Adventure (Animated)',
    category: 'kids',
    frameType: 'lottie',
    staticFrameId: null,
    lottieSource: () => require('../assets/lottie/space-rockets.json'),
    description: 'Rockets and planets',
    preview: 'Space themed animations',
  },
  {
    id: 'flower-garden-animated',
    name: 'Flower Garden (Animated)',
    category: 'elegant',
    frameType: 'lottie',
    staticFrameId: null,
    lottieSource: () => require('../assets/lottie/flower-garden.json'),
    description: 'Beautiful blooming flowers',
    preview: 'Flowers bloom around edges',
  },
  {
    id: 'thank-you-sparkle',
    name: 'Thank You Sparkle (Animated)',
    category: 'elegant',
    frameType: 'lottie',
    staticFrameId: null,
    lottieSource: () => require('../assets/lottie/thank-you-sparkle.json'),
    description: 'Elegant thank you animation',
    preview: 'Sparkles and elegant effects',
  },
];

// Category definitions
export const FRAME_CATEGORIES = [
  { id: 'all', label: 'All Frames', icon: 'apps' },
  { id: 'celebration', label: 'Celebration', icon: 'balloon' },
  { id: 'kids', label: 'Kids', icon: 'happy' },
  { id: 'elegant', label: 'Elegant', icon: 'star' },
  { id: 'love', label: 'Love', icon: 'heart' },
];

/**
 * Get frames by category
 */
export const getFramesByCategory = (category) => {
  if (category === 'all') return FRAME_LIBRARY;
  return FRAME_LIBRARY.filter(frame => frame.category === category);
};

/**
 * Get specific frame by ID
 */
export const getFrameById = (id) => {
  return FRAME_LIBRARY.find(frame => frame.id === id);
};

/**
 * Check if frame is available (static frames are always available)
 */
export const isFrameAvailable = (frameId) => {
  const frame = getFrameById(frameId);
  if (!frame || frameId === 'none') return true;

  // Static frames are always available
  if (frame.frameType === 'static') return true;

  // Check if Lottie file exists
  if (frame.frameType === 'lottie') {
    try {
      frame.lottieSource();
      return true;
    } catch (error) {
      console.warn(`Frame ${frameId} Lottie file not found:`, error);
      return false;
    }
  }

  return false;
};

/**
 * Get all available frames (only those with Lottie files present)
 */
export const getAvailableFrames = () => {
  return FRAME_LIBRARY.filter(frame => isFrameAvailable(frame.id));
};

export default {
  FRAME_LIBRARY,
  FRAME_CATEGORIES,
  getFramesByCategory,
  getFrameById,
  isFrameAvailable,
  getAvailableFrames,
};
