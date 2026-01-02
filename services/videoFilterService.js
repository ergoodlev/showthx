/**
 * Video Filter Service
 * Defines video filters and their FFmpeg commands for compositing
 */

/**
 * Video filter categories and definitions
 * Each filter has an id, display name, icon, and FFmpeg filter command
 */
export const VIDEO_FILTERS = {
  color: [
    {
      id: 'warm',
      name: 'Warm',
      icon: '🌅',
      description: 'Adds a warm, cozy orange tint',
      ffmpeg: 'colortemperature=8000',
      preview: { temperature: 8000 },
    },
    {
      id: 'cool',
      name: 'Cool',
      icon: '❄️',
      description: 'Adds a cool, calm blue tint',
      ffmpeg: 'colortemperature=4000',
      preview: { temperature: 4000 },
    },
    {
      id: 'vintage',
      name: 'Vintage',
      icon: '📷',
      description: 'Faded retro look with muted colors',
      ffmpeg: 'eq=saturation=0.7:brightness=0.05:contrast=1.1,colorbalance=rs=0.1:gs=-0.05:bs=-0.1',
      preview: { saturation: 0.7, sepia: 0.2 },
    },
    {
      id: 'sepia',
      name: 'Sepia',
      icon: '🎞️',
      description: 'Classic brown-toned photo look',
      ffmpeg: 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131',
      preview: { sepia: 1 },
    },
    {
      id: 'bw',
      name: 'B&W',
      icon: '⬛',
      description: 'Black and white film style',
      ffmpeg: 'hue=s=0,eq=contrast=1.2',
      preview: { grayscale: 1 },
    },
  ],
  effects: [
    {
      id: 'vignette',
      name: 'Vignette',
      icon: '🔲',
      description: 'Dark edges with spotlight center',
      ffmpeg: 'vignette=PI/4',
      preview: { vignette: true },
    },
    {
      id: 'bright',
      name: 'Bright',
      icon: '☀️',
      description: 'Makes video brighter and lighter',
      ffmpeg: 'eq=brightness=0.15:gamma=1.1',
      preview: { brightness: 1.15 },
    },
    {
      id: 'vivid',
      name: 'Vivid',
      icon: '🌈',
      description: 'Boosts color saturation for pop',
      ffmpeg: 'eq=saturation=1.5',
      preview: { saturation: 1.5 },
    },
    {
      id: 'pop',
      name: 'Pop',
      icon: '💥',
      description: 'High contrast punch',
      ffmpeg: 'eq=contrast=1.3:saturation=1.2',
      preview: { contrast: 1.3 },
    },
  ],
  fun: [
    {
      id: 'dreamy',
      name: 'Dreamy',
      icon: '✨',
      description: 'Soft glow with warm tones',
      ffmpeg: 'gblur=sigma=1.5,eq=brightness=0.08:saturation=0.9',
      preview: { blur: 1.5, brightness: 1.08 },
    },
    {
      id: 'pixel',
      name: 'Pixel',
      icon: '👾',
      description: 'Retro 8-bit pixelated look',
      ffmpeg: 'scale=iw/8:ih/8,scale=iw*8:ih*8:flags=neighbor',
      preview: { pixelate: 8 },
    },
    {
      id: 'blur',
      name: 'Soft',
      icon: '🌸',
      description: 'Gentle soft focus effect',
      ffmpeg: 'gblur=sigma=3',
      preview: { blur: 3 },
    },
  ],
  creative: [
    {
      id: 'comic',
      name: 'Comic',
      icon: '💥',
      description: 'Bold comic book style with edge detection',
      ffmpeg: 'edgedetect=low=0.1:high=0.3,negate,eq=contrast=2:brightness=0.1',
      preview: { comic: true },
    },
    {
      id: 'cartoon',
      name: 'Cartoon',
      icon: '🎨',
      description: 'Vibrant cartoon-like colors',
      ffmpeg: 'hue=s=2,eq=saturation=1.8:contrast=1.4,unsharp=5:5:1.5',
      preview: { cartoon: true },
    },
    {
      id: 'sketch',
      name: 'Sketch',
      icon: '✏️',
      description: 'Pencil sketch drawing effect',
      ffmpeg: 'edgedetect=low=0.1:high=0.4,negate',
      preview: { sketch: true },
    },
    {
      id: 'noir',
      name: 'Noir',
      icon: '🎬',
      description: 'Classic film noir dramatic look',
      ffmpeg: 'hue=s=0,eq=contrast=1.5:brightness=-0.05,curves=m=0/0 0.25/0.15 0.5/0.5 0.75/0.85 1/1',
      preview: { noir: true },
    },
    {
      id: 'thermal',
      name: 'Thermal',
      icon: '🌡️',
      description: 'Heat vision thermal camera',
      ffmpeg: 'colorchannelmixer=rr=0:rg=0:rb=1:ra=0:gr=0:gg=1:gb=0:ga=0:br=1:bg=0:bb=0:ba=0,eq=saturation=2:contrast=1.3',
      preview: { thermal: true },
    },
    {
      id: 'xray',
      name: 'X-Ray',
      icon: '💀',
      description: 'Inverted X-ray effect',
      ffmpeg: 'negate,hue=s=0,eq=contrast=1.3:brightness=0.1',
      preview: { xray: true },
    },
    {
      id: 'glitch',
      name: 'Glitch',
      icon: '📺',
      description: 'Digital glitch art effect',
      ffmpeg: 'rgbashift=rh=-5:gh=3:bh=5,eq=saturation=1.2,noise=alls=20:allf=t',
      preview: { glitch: true },
    },
    {
      id: 'vhs',
      name: 'VHS',
      icon: '📼',
      description: 'Retro VHS tape look with noise',
      ffmpeg: 'curves=vintage,noise=alls=30:allf=t,eq=saturation=0.8:contrast=1.1,vignette=PI/3',
      preview: { vhs: true },
    },
    {
      id: 'sunset',
      name: 'Sunset',
      icon: '🌇',
      description: 'Warm golden hour glow',
      ffmpeg: 'colortemperature=3500,eq=saturation=1.3:brightness=0.05,vignette=PI/5',
      preview: { sunset: true },
    },
    {
      id: 'neon',
      name: 'Neon',
      icon: '💜',
      description: 'Vibrant neon glow effect',
      ffmpeg: 'eq=saturation=2.5:contrast=1.4:brightness=0.1,unsharp=5:5:2',
      preview: { neon: true },
    },
    {
      id: 'filmgrain',
      name: 'Film',
      icon: '🎥',
      description: 'Classic film grain texture',
      ffmpeg: 'noise=alls=25:allf=t,eq=saturation=0.9:contrast=1.1',
      preview: { filmgrain: true },
    },
  ],
};

/**
 * Get all filter categories
 * @returns {string[]} Array of category names
 */
export const getFilterCategories = () => {
  return Object.keys(VIDEO_FILTERS);
};

/**
 * Get filters for a specific category
 * @param {string} category - Category name (color, effects, fun)
 * @returns {Array} Array of filter objects
 */
export const getFiltersForCategory = (category) => {
  return VIDEO_FILTERS[category] || [];
};

/**
 * Get a filter by its ID
 * @param {string} filterId - Filter ID
 * @returns {object|null} Filter object or null
 */
export const getFilterById = (filterId) => {
  for (const category of Object.values(VIDEO_FILTERS)) {
    const filter = category.find(f => f.id === filterId);
    if (filter) return filter;
  }
  return null;
};

/**
 * Get FFmpeg command for a filter
 * @param {string} filterId - Filter ID
 * @returns {string|null} FFmpeg filter command or null
 */
export const getFilterCommand = (filterId) => {
  const filter = getFilterById(filterId);
  return filter?.ffmpeg || null;
};

/**
 * Get all filters as a flat array
 * @returns {Array} All filters
 */
export const getAllFilters = () => {
  return Object.values(VIDEO_FILTERS).flat();
};

/**
 * Combine multiple filter commands
 * @param {string[]} filterIds - Array of filter IDs
 * @returns {string} Combined FFmpeg filter string
 */
export const combineFilters = (filterIds) => {
  const commands = filterIds
    .map(id => getFilterCommand(id))
    .filter(Boolean);

  return commands.join(',');
};

/**
 * Filter presets - common combinations
 */
export const FILTER_PRESETS = {
  happy: ['warm', 'vivid'],
  calm: ['cool', 'vignette'],
  nostalgic: ['vintage', 'vignette'],
  dramatic: ['bw', 'pop'],
  magical: ['dreamy', 'vivid'],
};

/**
 * Get a preset by name
 * @param {string} presetName - Preset name
 * @returns {string[]} Array of filter IDs
 */
export const getPreset = (presetName) => {
  return FILTER_PRESETS[presetName] || [];
};

export default {
  VIDEO_FILTERS,
  getFilterCategories,
  getFiltersForCategory,
  getFilterById,
  getFilterCommand,
  getAllFilters,
  combineFilters,
  FILTER_PRESETS,
  getPreset,
};
