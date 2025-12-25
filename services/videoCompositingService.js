/**
 * Video Compositing Service
 * Composites frame overlays and stickers onto videos using FFmpeg
 * Creates "baked-in" overlays that persist when video is shared
 *
 * IMPORTANT: Requires development build (FFmpeg Kit won't work in Expo Go)
 */

import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

// FFmpeg Kit imports - requires development build
let FFmpegKit = null;
let FFmpegKitConfig = null;
let ReturnCode = null;

// Lazy load FFmpeg to prevent crashes in Expo Go
const loadFFmpeg = async () => {
  if (FFmpegKit) return true;

  try {
    const ffmpegModule = require('@spreen/ffmpeg-kit-react-native');
    FFmpegKit = ffmpegModule.FFmpegKit;
    FFmpegKitConfig = ffmpegModule.FFmpegKitConfig;
    ReturnCode = ffmpegModule.ReturnCode;
    return true;
  } catch (error) {
    console.warn('[COMPOSITING] FFmpeg Kit not available:', error.message);
    return false;
  }
};

/**
 * Check if FFmpeg is available
 */
export const isCompositingAvailable = async () => {
  return await loadFFmpeg();
};

/**
 * Get output directory for composited videos
 */
const getOutputDir = async () => {
  const dir = `${FileSystem.cacheDirectory}composited_videos/`;
  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  return dir;
};

/**
 * Generate unique output path
 */
const generateOutputPath = async (extension = 'mp4') => {
  const dir = await getOutputDir();
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `${dir}composited_${timestamp}_${random}.${extension}`;
};

/**
 * Fix video rotation by normalizing orientation
 * Uses autorotate filter to correct rotation metadata
 * @param {string} inputPath - Input video path
 * @returns {Promise<{success: boolean, outputPath?: string, error?: string}>}
 */
export const fixVideoRotation = async (inputPath) => {
  const ffmpegLoaded = await loadFFmpeg();
  if (!ffmpegLoaded) {
    console.log('[COMPOSITING] FFmpeg not available, returning original video');
    return { success: true, outputPath: inputPath, fallback: true };
  }

  try {
    const outputPath = await generateOutputPath();

    // Use transpose filter based on rotation metadata
    // -vf "transpose=1" rotates 90 clockwise
    // -metadata:s:v rotate=0 clears rotation metadata after fixing
    const command = `-i "${inputPath}" -vf "transpose=1" -metadata:s:v rotate=0 -c:v libx264 -preset fast -crf 23 -c:a copy -y "${outputPath}"`;

    console.log('[COMPOSITING] Fixing rotation with command:', command);

    const session = await FFmpegKit.execute(command);
    const returnCode = await session.getReturnCode();

    if (ReturnCode.isSuccess(returnCode)) {
      console.log('[COMPOSITING] Rotation fixed successfully');
      return { success: true, outputPath };
    } else {
      // Try without rotation fix if it fails
      console.warn('[COMPOSITING] Rotation fix failed, trying without transpose');
      const fallbackCommand = `-i "${inputPath}" -metadata:s:v rotate=0 -c:v libx264 -preset fast -crf 23 -c:a copy -y "${outputPath}"`;
      const fallbackSession = await FFmpegKit.execute(fallbackCommand);
      const fallbackCode = await fallbackSession.getReturnCode();

      if (ReturnCode.isSuccess(fallbackCode)) {
        return { success: true, outputPath };
      }
      return { success: false, error: 'Failed to fix rotation' };
    }
  } catch (error) {
    console.error('[COMPOSITING] Error fixing rotation:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Normalize video rotation using autorotate
 * This is a safer approach that lets FFmpeg auto-detect and fix rotation
 * @param {string} inputPath - Input video path
 * @returns {Promise<{success: boolean, outputPath?: string, error?: string}>}
 */
export const normalizeVideoRotation = async (inputPath) => {
  const ffmpegLoaded = await loadFFmpeg();
  if (!ffmpegLoaded) {
    return { success: true, outputPath: inputPath, fallback: true };
  }

  try {
    const outputPath = await generateOutputPath();

    // Let FFmpeg auto-detect and apply rotation, then clear metadata
    // The scale filter with -2 ensures dimensions are even (required for H.264)
    const command = `-i "${inputPath}" -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -metadata:s:v:0 rotate=0 -c:v libx264 -preset fast -crf 23 -c:a aac -y "${outputPath}"`;

    console.log('[COMPOSITING] Normalizing rotation:', command);

    const session = await FFmpegKit.execute(command);
    const returnCode = await session.getReturnCode();

    if (ReturnCode.isSuccess(returnCode)) {
      console.log('[COMPOSITING] Rotation normalized successfully');
      return { success: true, outputPath };
    } else {
      const logs = await session.getAllLogs();
      console.error('[COMPOSITING] Rotation normalization failed:', logs?.map(l => l.getMessage()).join('\n'));
      return { success: false, error: 'Failed to normalize rotation' };
    }
  } catch (error) {
    console.error('[COMPOSITING] Error normalizing rotation:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Add a frame border to video using FFmpeg drawbox/pad filters
 * Creates a simple colored border around the video
 * @param {string} inputPath - Input video path
 * @param {object} frameTemplate - Frame template with color and width info
 * @returns {Promise<{success: boolean, outputPath?: string, error?: string}>}
 */
export const addFrameBorder = async (inputPath, frameTemplate) => {
  const ffmpegLoaded = await loadFFmpeg();
  if (!ffmpegLoaded) {
    return { success: true, outputPath: inputPath, fallback: true };
  }

  if (!frameTemplate) {
    return { success: true, outputPath: inputPath };
  }

  try {
    const {
      primary_color = '#06b6d4',
      border_width = 8,
    } = frameTemplate;

    // Convert hex color to FFmpeg format (remove # if present)
    const color = primary_color.replace('#', '');
    const borderPx = Math.max(4, Math.min(border_width * 2, 24)); // Clamp border size

    const outputPath = await generateOutputPath();

    // Use pad filter to add colored border around video
    // pad=width+2*border:height+2*border:border:border:color
    const command = `-i "${inputPath}" -vf "pad=iw+${borderPx * 2}:ih+${borderPx * 2}:${borderPx}:${borderPx}:0x${color}" -c:v libx264 -preset fast -crf 23 -c:a copy -y "${outputPath}"`;

    console.log('[COMPOSITING] Adding frame border:', command);

    const session = await FFmpegKit.execute(command);
    const returnCode = await session.getReturnCode();

    if (ReturnCode.isSuccess(returnCode)) {
      console.log('[COMPOSITING] Frame border added successfully');
      return { success: true, outputPath };
    } else {
      return { success: false, error: 'Failed to add frame border' };
    }
  } catch (error) {
    console.error('[COMPOSITING] Error adding frame border:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Overlay a PNG image (frame or sticker) onto video
 * @param {string} inputVideoPath - Input video path
 * @param {string} overlayImagePath - PNG image to overlay
 * @param {object} position - Position {x, y} for overlay (optional, default is full frame)
 * @param {object} size - Size {width, height} for overlay (optional)
 * @returns {Promise<{success: boolean, outputPath?: string, error?: string}>}
 */
export const overlayImage = async (inputVideoPath, overlayImagePath, position = null, size = null) => {
  const ffmpegLoaded = await loadFFmpeg();
  if (!ffmpegLoaded) {
    return { success: true, outputPath: inputVideoPath, fallback: true };
  }

  try {
    const outputPath = await generateOutputPath();

    let overlayFilter = '';

    if (position && size) {
      // Overlay at specific position with specific size
      overlayFilter = `[1:v]scale=${size.width}:${size.height}[scaled];[0:v][scaled]overlay=${position.x}:${position.y}`;
    } else if (position) {
      // Overlay at specific position with original size
      overlayFilter = `[0:v][1:v]overlay=${position.x}:${position.y}`;
    } else {
      // Full frame overlay (frame template)
      overlayFilter = `[1:v]scale=iw:ih[scaled];[0:v][scaled]overlay=0:0`;
    }

    const command = `-i "${inputVideoPath}" -i "${overlayImagePath}" -filter_complex "${overlayFilter}" -c:v libx264 -preset fast -crf 23 -c:a copy -y "${outputPath}"`;

    console.log('[COMPOSITING] Overlaying image:', command);

    const session = await FFmpegKit.execute(command);
    const returnCode = await session.getReturnCode();

    if (ReturnCode.isSuccess(returnCode)) {
      console.log('[COMPOSITING] Image overlay added successfully');
      return { success: true, outputPath };
    } else {
      const logs = await session.getAllLogs();
      console.error('[COMPOSITING] Image overlay failed:', logs?.slice(-5).map(l => l.getMessage()).join('\n'));
      return { success: false, error: 'Failed to overlay image' };
    }
  } catch (error) {
    console.error('[COMPOSITING] Error overlaying image:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Add text overlay (custom frame text) to video
 * @param {string} inputPath - Input video path
 * @param {string} text - Text to overlay
 * @param {object} options - Text options (position, color, size)
 * @returns {Promise<{success: boolean, outputPath?: string, error?: string}>}
 */
export const addTextOverlay = async (inputPath, text, options = {}) => {
  const ffmpegLoaded = await loadFFmpeg();
  if (!ffmpegLoaded) {
    return { success: true, outputPath: inputPath, fallback: true };
  }

  if (!text || text.trim() === '') {
    return { success: true, outputPath: inputPath };
  }

  try {
    const {
      position = 'bottom', // 'top', 'center', 'bottom'
      color = 'white',
      fontSize = 32,
      backgroundColor = 'black@0.5',
    } = options;

    const outputPath = await generateOutputPath();

    // Escape special characters for FFmpeg
    const escapedText = text
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "'\\''")
      .replace(/:/g, '\\:')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]');

    // Position mapping
    let positionStr = '';
    switch (position) {
      case 'top':
        positionStr = 'x=(w-text_w)/2:y=40';
        break;
      case 'center':
        positionStr = 'x=(w-text_w)/2:y=(h-text_h)/2';
        break;
      case 'bottom':
      default:
        positionStr = 'x=(w-text_w)/2:y=h-text_h-60';
        break;
    }

    const drawTextFilter = `drawtext=text='${escapedText}':fontsize=${fontSize}:fontcolor=${color}:${positionStr}:box=1:boxcolor=${backgroundColor}:boxborderw=10:shadowcolor=black:shadowx=2:shadowy=2`;

    const command = `-i "${inputPath}" -vf "${drawTextFilter}" -c:v libx264 -preset fast -crf 23 -c:a copy -y "${outputPath}"`;

    console.log('[COMPOSITING] Adding text overlay:', command);

    const session = await FFmpegKit.execute(command);
    const returnCode = await session.getReturnCode();

    if (ReturnCode.isSuccess(returnCode)) {
      console.log('[COMPOSITING] Text overlay added successfully');
      return { success: true, outputPath };
    } else {
      return { success: false, error: 'Failed to add text overlay' };
    }
  } catch (error) {
    console.error('[COMPOSITING] Error adding text overlay:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Add sticker/emoji overlay to video
 * For emojis, we use FFmpeg's drawtext with emoji fonts
 * @param {string} inputPath - Input video path
 * @param {Array} stickers - Array of sticker objects {emoji, x, y, scale}
 * @param {object} videoDimensions - Video {width, height}
 * @returns {Promise<{success: boolean, outputPath?: string, error?: string}>}
 */
export const addStickerOverlays = async (inputPath, stickers, videoDimensions = { width: 1080, height: 1920 }) => {
  const ffmpegLoaded = await loadFFmpeg();
  if (!ffmpegLoaded) {
    return { success: true, outputPath: inputPath, fallback: true };
  }

  if (!stickers || stickers.length === 0) {
    return { success: true, outputPath: inputPath };
  }

  try {
    const outputPath = await generateOutputPath();
    const { width, height } = videoDimensions;

    // Build drawtext filters for each sticker
    const stickerFilters = stickers.map((sticker) => {
      const emoji = sticker.emoji || sticker.sticker || '⭐';
      const x = Math.round((sticker.position?.x || 0) * width / 100) || 50;
      const y = Math.round((sticker.position?.y || 0) * height / 100) || 50;
      const fontSize = Math.round((sticker.size || 40) * (sticker.scale || 1));

      // Escape emoji for FFmpeg
      const escapedEmoji = emoji.replace(/'/g, "'\\''");

      return `drawtext=text='${escapedEmoji}':fontsize=${fontSize}:x=${x}:y=${y}:fontcolor=white`;
    }).join(',');

    const command = `-i "${inputPath}" -vf "${stickerFilters}" -c:v libx264 -preset fast -crf 23 -c:a copy -y "${outputPath}"`;

    console.log('[COMPOSITING] Adding sticker overlays:', command);

    const session = await FFmpegKit.execute(command);
    const returnCode = await session.getReturnCode();

    if (ReturnCode.isSuccess(returnCode)) {
      console.log('[COMPOSITING] Sticker overlays added successfully');
      return { success: true, outputPath };
    } else {
      // If sticker overlay fails, return original video
      console.warn('[COMPOSITING] Sticker overlay failed, returning original');
      return { success: true, outputPath: inputPath, fallback: true };
    }
  } catch (error) {
    console.error('[COMPOSITING] Error adding sticker overlays:', error);
    return { success: true, outputPath: inputPath, fallback: true };
  }
};

/**
 * Full video compositing pipeline
 * Combines rotation fix, frame border, text overlay, and stickers
 * @param {string} videoPath - Input video path
 * @param {object} options - Compositing options
 * @returns {Promise<{success: boolean, outputPath?: string, error?: string}>}
 */
export const compositeVideo = async (videoPath, options = {}) => {
  const ffmpegLoaded = await loadFFmpeg();
  if (!ffmpegLoaded) {
    console.log('[COMPOSITING] FFmpeg not available, returning original video');
    return { success: true, outputPath: videoPath, fallback: true };
  }

  const {
    frameTemplate = null,
    customText = null,
    customTextPosition = 'bottom',
    customTextColor = 'white',
    stickers = [],
    fixRotation = true,
    onProgress = null,
  } = options;

  try {
    let currentPath = videoPath;

    // Step 1: Fix rotation if needed
    if (fixRotation) {
      console.log('[COMPOSITING] Step 1: Normalizing rotation...');
      if (onProgress) onProgress('Normalizing video orientation...');

      const rotationResult = await normalizeVideoRotation(currentPath);
      if (rotationResult.success && rotationResult.outputPath) {
        currentPath = rotationResult.outputPath;
      }
    }

    // Step 2: Add frame border if template provided
    if (frameTemplate && frameTemplate.primary_color) {
      console.log('[COMPOSITING] Step 2: Adding frame border...');
      if (onProgress) onProgress('Adding frame...');

      const frameResult = await addFrameBorder(currentPath, frameTemplate);
      if (frameResult.success && frameResult.outputPath && !frameResult.fallback) {
        currentPath = frameResult.outputPath;
      }
    }

    // Step 3: Add custom text if provided
    if (customText && customText.trim() !== '') {
      console.log('[COMPOSITING] Step 3: Adding custom text...');
      if (onProgress) onProgress('Adding text overlay...');

      const textResult = await addTextOverlay(currentPath, customText, {
        position: customTextPosition,
        color: customTextColor,
      });
      if (textResult.success && textResult.outputPath && !textResult.fallback) {
        currentPath = textResult.outputPath;
      }
    }

    // Step 4: Add stickers if any
    if (stickers && stickers.length > 0) {
      console.log('[COMPOSITING] Step 4: Adding stickers...');
      if (onProgress) onProgress('Adding stickers...');

      const stickerResult = await addStickerOverlays(currentPath, stickers);
      if (stickerResult.success && stickerResult.outputPath && !stickerResult.fallback) {
        currentPath = stickerResult.outputPath;
      }
    }

    console.log('[COMPOSITING] Video compositing complete:', currentPath);
    if (onProgress) onProgress('Complete!');

    return { success: true, outputPath: currentPath };
  } catch (error) {
    console.error('[COMPOSITING] Error in compositing pipeline:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Prepare video for sharing
 * Quick compositing with rotation fix and basic frame
 * @param {string} videoPath - Input video path
 * @param {object} frameTemplate - Frame template (optional)
 * @param {string} customText - Custom text (optional)
 * @param {Array} stickers - Stickers array (optional)
 * @returns {Promise<{success: boolean, outputPath?: string, error?: string}>}
 */
export const prepareVideoForSharing = async (videoPath, frameTemplate = null, customText = null, stickers = []) => {
  console.log('[COMPOSITING] Preparing video for sharing...');
  console.log('[COMPOSITING] Input:', { videoPath, hasFrame: !!frameTemplate, hasText: !!customText, stickerCount: stickers?.length || 0 });

  return await compositeVideo(videoPath, {
    frameTemplate,
    customText: customText || frameTemplate?.custom_text,
    customTextPosition: frameTemplate?.custom_text_position || 'bottom',
    customTextColor: frameTemplate?.custom_text_color || 'white',
    stickers,
    fixRotation: true,
  });
};

/**
 * Clean up temporary composited videos
 */
export const cleanupCompositedVideos = async () => {
  try {
    const dir = `${FileSystem.cacheDirectory}composited_videos/`;
    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(dir, { idempotent: true });
    }
    console.log('[COMPOSITING] Cleaned up composited videos');
    return { success: true };
  } catch (error) {
    console.error('[COMPOSITING] Error cleaning up:', error);
    return { success: false, error: error.message };
  }
};

export default {
  isCompositingAvailable,
  fixVideoRotation,
  normalizeVideoRotation,
  addFrameBorder,
  overlayImage,
  addTextOverlay,
  addStickerOverlays,
  compositeVideo,
  prepareVideoForSharing,
  cleanupCompositedVideos,
};
