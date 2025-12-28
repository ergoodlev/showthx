/**
 * Video Compositing Service
 * Composites frame overlays and stickers onto videos using FFmpeg
 * Creates "baked-in" overlays that persist when video is shared
 *
 * NOTE: FFmpeg integration is currently disabled due to React Native 0.81 compatibility.
 * The service gracefully falls back to returning the original video.
 * Decorative frames are displayed via React Native UI components during recording/preview.
 *
 * To enable full compositing in the future:
 * 1. Wait for ffmpeg-kit-react-native to support RN 0.81
 * 2. Or implement server-side video processing with Supabase Edge Functions
 */

import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { getFilterCommand } from './videoFilterService';
import { supabase } from '../supabaseClient';

// FFmpeg Kit imports - currently disabled
let FFmpegKit = null;
let FFmpegKitConfig = null;
let ReturnCode = null;

// Lazy load FFmpeg - currently returns false (FFmpeg not available)
const loadFFmpeg = async () => {
  if (FFmpegKit) return true;

  try {
    // FFmpeg Kit is not currently installed due to RN 0.81 compatibility issues
    // When a compatible version becomes available, uncomment:
    // const ffmpegModule = require('ffmpeg-kit-react-native');
    // FFmpegKit = ffmpegModule.FFmpegKit;
    // FFmpegKitConfig = ffmpegModule.FFmpegKitConfig;
    // ReturnCode = ffmpegModule.ReturnCode;
    // return true;

    console.log('[COMPOSITING] FFmpeg not installed - using fallback mode');
    return false;
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
 * Download frame PNG from Supabase storage to local cache
 * Handles both 'videos' bucket (preset-frames/) and 'ai-frames' bucket paths
 * @param {string} storagePath - Supabase storage path (e.g., 'preset-frames/userId/frame.png')
 * @returns {Promise<string|null>} Local file path or null if download failed
 */
const downloadFramePNG = async (storagePath) => {
  if (!storagePath) return null;

  try {
    console.log('[COMPOSITING] Downloading frame PNG from storage:', storagePath);

    // Determine bucket based on path
    let bucket = 'videos';
    let path = storagePath;

    // Check if it's an AI frame in the ai-frames bucket
    if (storagePath.startsWith('ai-frames/') || !storagePath.startsWith('preset-frames/')) {
      // Try ai-frames bucket first for AI frames
      if (!storagePath.startsWith('preset-frames/')) {
        bucket = 'ai-frames';
      }
    }

    // Get signed URL
    let signedUrl = null;
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 3600); // 1 hour

    if (urlError || !signedUrlData?.signedUrl) {
      // Try fallback bucket
      console.log('[COMPOSITING] First bucket failed, trying fallback...');
      const fallbackBucket = bucket === 'videos' ? 'ai-frames' : 'videos';
      const fallbackPath = bucket === 'videos' ? path : `preset-frames/${path}`;

      const { data: fallbackData, error: fallbackError } = await supabase.storage
        .from(fallbackBucket)
        .createSignedUrl(fallbackPath, 3600);

      if (fallbackError || !fallbackData?.signedUrl) {
        console.error('[COMPOSITING] Failed to get signed URL for frame PNG:', urlError, fallbackError);
        return null;
      }

      signedUrl = fallbackData.signedUrl;
    } else {
      signedUrl = signedUrlData.signedUrl;
    }

    if (!signedUrl) {
      console.error('[COMPOSITING] No signed URL for frame PNG');
      return null;
    }

    // Download to local cache
    const localPath = `${FileSystem.cacheDirectory}frame_${Date.now()}.png`;
    const downloadResult = await FileSystem.downloadAsync(signedUrl, localPath);

    if (downloadResult.status !== 200) {
      console.error('[COMPOSITING] Failed to download frame PNG, status:', downloadResult.status);
      return null;
    }

    console.log('[COMPOSITING] Frame PNG downloaded to:', localPath);
    return localPath;
  } catch (error) {
    console.error('[COMPOSITING] Error downloading frame PNG:', error);
    return null;
  }
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

    // Position mapping - matches UI preview positioning
    // UI uses: top=20px from top, bottom=70px from bottom
    let positionStr = '';
    switch (position) {
      case 'top':
        positionStr = 'x=(w-text_w)/2:y=20';  // Match UI: 20px from top
        break;
      case 'center':
        positionStr = 'x=(w-text_w)/2:y=(h-text_h)/2';
        break;
      case 'bottom':
      default:
        positionStr = 'x=(w-text_w)/2:y=h-text_h-70';  // Match UI: 70px from bottom
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
    // Stickers have x, y as percentages (0-100) directly on the object
    const stickerFilters = stickers.map((sticker) => {
      const emoji = sticker.emoji || sticker.sticker || '⭐';
      // Handle both sticker.x/y (direct) and sticker.position.x/y (nested) formats
      const xPercent = sticker.x ?? sticker.position?.x ?? 50;
      const yPercent = sticker.y ?? sticker.position?.y ?? 50;
      const x = Math.round(xPercent * width / 100);
      const y = Math.round(yPercent * height / 100);
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
 * Apply video filter (color grading, effects)
 * @param {string} inputPath - Input video path
 * @param {string} filterId - Filter ID from videoFilterService
 * @returns {Promise<{success: boolean, outputPath?: string, error?: string}>}
 */
export const applyVideoFilter = async (inputPath, filterId) => {
  const ffmpegLoaded = await loadFFmpeg();
  if (!ffmpegLoaded) {
    return { success: true, outputPath: inputPath, fallback: true };
  }

  if (!filterId) {
    return { success: true, outputPath: inputPath };
  }

  try {
    const filterCommand = getFilterCommand(filterId);
    if (!filterCommand) {
      console.warn(`[COMPOSITING] Unknown filter: ${filterId}`);
      return { success: true, outputPath: inputPath };
    }

    const outputPath = await generateOutputPath();
    const command = `-i "${inputPath}" -vf "${filterCommand}" -c:v libx264 -preset fast -crf 23 -c:a copy -y "${outputPath}"`;

    console.log('[COMPOSITING] Applying video filter:', filterId);

    const session = await FFmpegKit.execute(command);
    const returnCode = await session.getReturnCode();

    if (ReturnCode.isSuccess(returnCode)) {
      console.log('[COMPOSITING] Video filter applied successfully');
      return { success: true, outputPath };
    } else {
      console.warn('[COMPOSITING] Video filter failed, returning original');
      return { success: true, outputPath: inputPath, fallback: true };
    }
  } catch (error) {
    console.error('[COMPOSITING] Error applying video filter:', error);
    return { success: true, outputPath: inputPath, fallback: true };
  }
};

/**
 * Overlay PNG frame onto video
 * Uses transparent PNG frame image
 * @param {string} inputPath - Input video path
 * @param {string} framePngPath - Path to PNG frame image
 * @returns {Promise<{success: boolean, outputPath?: string, error?: string}>}
 */
export const overlayFramePNG = async (inputPath, framePngPath) => {
  const ffmpegLoaded = await loadFFmpeg();
  if (!ffmpegLoaded) {
    return { success: true, outputPath: inputPath, fallback: true };
  }

  if (!framePngPath) {
    return { success: true, outputPath: inputPath };
  }

  try {
    // Check if PNG file exists
    const fileInfo = await FileSystem.getInfoAsync(framePngPath);
    if (!fileInfo.exists) {
      console.warn('[COMPOSITING] Frame PNG not found:', framePngPath);
      return { success: true, outputPath: inputPath };
    }

    const outputPath = await generateOutputPath();

    // Scale PNG to match video size and overlay
    // The PNG frame should have a transparent center
    const command = `-i "${inputPath}" -i "${framePngPath}" -filter_complex "[1:v]scale=iw:ih[frame];[0:v][frame]overlay=0:0" -c:v libx264 -preset fast -crf 23 -c:a copy -y "${outputPath}"`;

    console.log('[COMPOSITING] Overlaying PNG frame...');

    const session = await FFmpegKit.execute(command);
    const returnCode = await session.getReturnCode();

    if (ReturnCode.isSuccess(returnCode)) {
      console.log('[COMPOSITING] PNG frame overlay successful');
      return { success: true, outputPath };
    } else {
      const logs = await session.getAllLogs();
      console.warn('[COMPOSITING] PNG frame overlay failed:', logs?.slice(-3).map(l => l.getMessage()).join('\n'));
      return { success: true, outputPath: inputPath, fallback: true };
    }
  } catch (error) {
    console.error('[COMPOSITING] Error overlaying PNG frame:', error);
    return { success: true, outputPath: inputPath, fallback: true };
  }
};

/**
 * Overlay multiple PNG stickers onto video
 * @param {string} inputPath - Input video path
 * @param {Array} stickers - Array of sticker objects {pngPath, x, y, width, height, scale}
 * @param {object} videoDimensions - Video dimensions {width, height}
 * @returns {Promise<{success: boolean, outputPath?: string, error?: string}>}
 */
export const overlayPNGStickers = async (inputPath, stickers, videoDimensions = { width: 1080, height: 1920 }) => {
  const ffmpegLoaded = await loadFFmpeg();
  if (!ffmpegLoaded) {
    return { success: true, outputPath: inputPath, fallback: true };
  }

  if (!stickers || stickers.length === 0) {
    return { success: true, outputPath: inputPath };
  }

  // Filter to only PNG stickers (not emoji)
  const pngStickers = stickers.filter(s => s.pngPath);

  if (pngStickers.length === 0) {
    // Fall back to emoji stickers if no PNG stickers
    return await addStickerOverlays(inputPath, stickers, videoDimensions);
  }

  try {
    const outputPath = await generateOutputPath();
    const { width, height } = videoDimensions;

    // Build FFmpeg command for multiple PNG overlays
    // Input: video + all sticker PNGs
    const inputs = pngStickers.map(s => `-i "${s.pngPath}"`).join(' ');

    // Build filter_complex for scaling and positioning each sticker
    let filterComplex = '';
    let currentStream = '0:v';

    pngStickers.forEach((sticker, i) => {
      const inputIndex = i + 1; // Sticker inputs start at 1
      const outputLabel = i === pngStickers.length - 1 ? '' : `[v${i}]`;
      const nextStream = i === pngStickers.length - 1 ? '' : `v${i}`;

      // Calculate position and size
      const xPercent = sticker.x ?? sticker.position?.x ?? 50;
      const yPercent = sticker.y ?? sticker.position?.y ?? 50;
      const scale = sticker.scale || 1;
      const stickerSize = Math.round(80 * scale); // Base size 80px

      const x = Math.round((xPercent * width / 100) - (stickerSize / 2));
      const y = Math.round((yPercent * height / 100) - (stickerSize / 2));

      // Scale sticker and overlay
      filterComplex += `[${inputIndex}:v]scale=${stickerSize}:${stickerSize}[s${i}];`;
      filterComplex += `[${currentStream}][s${i}]overlay=${x}:${y}${outputLabel};`;

      currentStream = nextStream;
    });

    // Remove trailing semicolon
    filterComplex = filterComplex.slice(0, -1);

    const command = `-i "${inputPath}" ${inputs} -filter_complex "${filterComplex}" -c:v libx264 -preset fast -crf 23 -c:a copy -y "${outputPath}"`;

    console.log('[COMPOSITING] Overlaying PNG stickers...');

    const session = await FFmpegKit.execute(command);
    const returnCode = await session.getReturnCode();

    if (ReturnCode.isSuccess(returnCode)) {
      console.log('[COMPOSITING] PNG stickers overlay successful');
      return { success: true, outputPath };
    } else {
      console.warn('[COMPOSITING] PNG stickers overlay failed, trying emoji fallback');
      return await addStickerOverlays(inputPath, stickers, videoDimensions);
    }
  } catch (error) {
    console.error('[COMPOSITING] Error overlaying PNG stickers:', error);
    return await addStickerOverlays(inputPath, stickers, videoDimensions);
  }
};

/**
 * Full video compositing pipeline
 * Combines rotation fix, video filter, frame overlay/border, text overlay, and stickers
 * Order: rotation → filter → stickers → frame → text
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
    framePngPath = null, // PNG frame image path
    customText = null,
    customTextPosition = 'bottom',
    customTextColor = 'white',
    stickers = [],
    videoFilter = null, // Filter ID from videoFilterService
    fixRotation = true,
    onProgress = null,
  } = options;

  try {
    let currentPath = videoPath;
    let stepNum = 1;

    // Step 1: Fix rotation if needed
    if (fixRotation) {
      console.log(`[COMPOSITING] Step ${stepNum}: Normalizing rotation...`);
      if (onProgress) onProgress('Normalizing video orientation...');

      const rotationResult = await normalizeVideoRotation(currentPath);
      if (rotationResult.success && rotationResult.outputPath) {
        currentPath = rotationResult.outputPath;
      }
      stepNum++;
    }

    // Step 2: Apply video filter if provided (NEW)
    if (videoFilter) {
      console.log(`[COMPOSITING] Step ${stepNum}: Applying video filter...`);
      if (onProgress) onProgress('Applying filter...');

      const filterResult = await applyVideoFilter(currentPath, videoFilter);
      if (filterResult.success && filterResult.outputPath && !filterResult.fallback) {
        currentPath = filterResult.outputPath;
      }
      stepNum++;
    }

    // Step 3: Add stickers (PNG or emoji)
    if (stickers && stickers.length > 0) {
      console.log(`[COMPOSITING] Step ${stepNum}: Adding stickers...`);
      if (onProgress) onProgress('Adding stickers...');

      // Use PNG stickers if available, otherwise emoji fallback
      const stickerResult = await overlayPNGStickers(currentPath, stickers);
      if (stickerResult.success && stickerResult.outputPath && !stickerResult.fallback) {
        currentPath = stickerResult.outputPath;
      }
      stepNum++;
    }

    // Step 4: Add frame (PNG overlay preferred, color border fallback)
    let pngFramePath = framePngPath || frameTemplate?.frame_png_path;
    let downloadedFramePath = null; // Track if we downloaded from storage

    if (pngFramePath) {
      // Check if this is a storage path (not a local file)
      // Storage paths are like: preset-frames/userId/file.png or userId/timestamp_frame.png
      const isLocalFile = pngFramePath.startsWith('file://') || pngFramePath.startsWith('/');

      if (!isLocalFile) {
        // Download frame PNG from Supabase storage
        console.log(`[COMPOSITING] Step ${stepNum}: Downloading frame PNG from storage...`);
        if (onProgress) onProgress('Downloading frame...');

        downloadedFramePath = await downloadFramePNG(pngFramePath);
        if (downloadedFramePath) {
          pngFramePath = downloadedFramePath;
          console.log('[COMPOSITING] Frame PNG downloaded successfully');
        } else {
          console.warn('[COMPOSITING] Failed to download frame PNG, will try color border fallback');
          pngFramePath = null;
        }
      }
    }

    if (pngFramePath) {
      // Use PNG frame overlay (decorative shapes)
      console.log(`[COMPOSITING] Step ${stepNum}: Overlaying PNG frame...`);
      if (onProgress) onProgress('Adding decorative frame...');

      const frameResult = await overlayFramePNG(currentPath, pngFramePath);
      if (frameResult.success && frameResult.outputPath && !frameResult.fallback) {
        currentPath = frameResult.outputPath;
      }

      // Clean up downloaded frame if we downloaded it
      if (downloadedFramePath) {
        await FileSystem.deleteAsync(downloadedFramePath, { idempotent: true });
      }
      stepNum++;
    } else if (frameTemplate && frameTemplate.primary_color) {
      // Fallback to simple color border
      console.log(`[COMPOSITING] Step ${stepNum}: Adding frame border...`);
      if (onProgress) onProgress('Adding frame...');

      const frameResult = await addFrameBorder(currentPath, frameTemplate);
      if (frameResult.success && frameResult.outputPath && !frameResult.fallback) {
        currentPath = frameResult.outputPath;
      }
      stepNum++;
    }

    // Step 5: Add custom text if provided
    const textToAdd = customText || frameTemplate?.custom_text;
    if (textToAdd && textToAdd.trim() !== '') {
      console.log(`[COMPOSITING] Step ${stepNum}: Adding custom text...`);
      if (onProgress) onProgress('Adding text overlay...');

      const textResult = await addTextOverlay(currentPath, textToAdd, {
        position: customTextPosition || frameTemplate?.custom_text_position || 'bottom',
        color: customTextColor || frameTemplate?.custom_text_color || 'white',
      });
      if (textResult.success && textResult.outputPath && !textResult.fallback) {
        currentPath = textResult.outputPath;
      }
      stepNum++;
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
 * Full compositing with rotation fix, filter, frame, text, and stickers
 * @param {string} videoPath - Input video path
 * @param {object} options - Sharing options
 * @param {object} options.frameTemplate - Frame template (optional)
 * @param {string} options.framePngPath - PNG frame path (optional)
 * @param {string} options.customText - Custom text (optional)
 * @param {Array} options.stickers - Stickers array (optional)
 * @param {string} options.videoFilter - Filter ID (optional)
 * @returns {Promise<{success: boolean, outputPath?: string, error?: string}>}
 */
export const prepareVideoForSharing = async (videoPath, options = {}) => {
  // Handle legacy signature: prepareVideoForSharing(path, frameTemplate, customText, stickers)
  let opts = options;
  if (options && typeof options === 'object' && !options.frameTemplate && !options.stickers) {
    // Old signature - convert to new format
    const [frameTemplate, customText, stickers] = [options, arguments[2], arguments[3]];
    opts = { frameTemplate, customText, stickers };
  }

  const {
    frameTemplate = null,
    framePngPath = null,
    customText = null,
    stickers = [],
    videoFilter = null,
  } = opts;

  console.log('[COMPOSITING] Preparing video for sharing...');
  console.log('[COMPOSITING] Input:', {
    videoPath,
    hasFrame: !!frameTemplate,
    hasPngFrame: !!framePngPath || !!frameTemplate?.frame_png_path,
    hasText: !!customText || !!frameTemplate?.custom_text,
    stickerCount: stickers?.length || 0,
    filter: videoFilter,
  });

  return await compositeVideo(videoPath, {
    frameTemplate,
    framePngPath: framePngPath || frameTemplate?.frame_png_path,
    customText: customText || frameTemplate?.custom_text,
    customTextPosition: frameTemplate?.custom_text_position || 'bottom',
    customTextColor: frameTemplate?.custom_text_color || 'white',
    stickers,
    videoFilter,
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

/**
 * Generate a thumbnail image from video
 * Extracts a frame from the video at specified time
 * @param {string} videoPath - Input video path
 * @param {number} timeSeconds - Time in seconds to extract frame (default: 0.5)
 * @returns {Promise<{success: boolean, thumbnailPath?: string, error?: string}>}
 */
export const generateThumbnail = async (videoPath, timeSeconds = 0.5) => {
  const ffmpegLoaded = await loadFFmpeg();
  if (!ffmpegLoaded) {
    console.log('[COMPOSITING] FFmpeg not available for thumbnail generation');
    return { success: false, error: 'FFmpeg not available' };
  }

  try {
    const thumbnailPath = await generateOutputPath('jpg');

    // Extract single frame at specified time
    // -ss: seek to time, -vframes 1: extract one frame, -q:v 2: high quality JPEG
    const command = `-ss ${timeSeconds} -i "${videoPath}" -vframes 1 -q:v 2 -y "${thumbnailPath}"`;

    console.log('[COMPOSITING] Generating thumbnail...');

    const session = await FFmpegKit.execute(command);
    const returnCode = await session.getReturnCode();

    if (ReturnCode.isSuccess(returnCode)) {
      // Verify thumbnail was created
      const fileInfo = await FileSystem.getInfoAsync(thumbnailPath);
      if (fileInfo.exists) {
        console.log('[COMPOSITING] Thumbnail generated:', thumbnailPath);
        return { success: true, thumbnailPath };
      }
    }

    console.warn('[COMPOSITING] Thumbnail generation failed');
    return { success: false, error: 'Failed to generate thumbnail' };
  } catch (error) {
    console.error('[COMPOSITING] Error generating thumbnail:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Poll for server-side compositing job completion
 * @param {string} jobId - Job ID to poll
 * @param {object} options - Polling options
 * @param {number} options.timeout - Timeout in ms (default: 300000 = 5 minutes)
 * @param {number} options.interval - Poll interval in ms (default: 2000 = 2 seconds)
 * @param {function} options.onProgress - Progress callback
 * @returns {Promise<{success: boolean, outputPath?: string, error?: string}>}
 */
const pollForCompletion = async (jobId, options = {}) => {
  const {
    timeout = 300000, // 5 minutes
    interval = 2000,  // 2 seconds
    onProgress = null,
  } = options;

  const startTime = Date.now();
  let lastStatus = 'pending';

  while (Date.now() - startTime < timeout) {
    try {
      const { data, error } = await supabase
        .from('video_compositing_jobs')
        .select('status, output_path, error_message')
        .eq('id', jobId)
        .single();

      if (error) {
        console.error('[COMPOSITING] Error polling job status:', error);
        // Continue polling despite errors
        await new Promise(r => setTimeout(r, interval));
        continue;
      }

      if (data.status !== lastStatus) {
        lastStatus = data.status;
        console.log(`[COMPOSITING] Job ${jobId} status: ${data.status}`);

        if (onProgress) {
          switch (data.status) {
            case 'processing':
              onProgress('Processing video on server...');
              break;
            case 'completed':
              onProgress('Processing complete!');
              break;
            case 'failed':
              onProgress('Processing failed');
              break;
          }
        }
      }

      if (data.status === 'completed') {
        console.log('[COMPOSITING] Job completed, output:', data.output_path);
        return { success: true, outputPath: data.output_path };
      }

      if (data.status === 'failed') {
        console.error('[COMPOSITING] Job failed:', data.error_message);
        return { success: false, error: data.error_message || 'Video processing failed' };
      }

      // Wait before next poll
      await new Promise(r => setTimeout(r, interval));
    } catch (pollError) {
      console.error('[COMPOSITING] Poll error:', pollError);
      await new Promise(r => setTimeout(r, interval));
    }
  }

  // Timeout reached
  console.error('[COMPOSITING] Job timed out after', timeout, 'ms');
  return { success: false, error: 'Video processing timed out. Please try again.' };
};

/**
 * Server-side video compositing using Trigger.dev
 * Creates a job in the database and calls Edge Function to trigger Trigger.dev
 *
 * @param {object} options - Compositing options
 * @param {string} options.videoStoragePath - Path to video in Supabase storage (required)
 * @param {object} options.frameTemplate - Frame template object (optional)
 * @param {string} options.framePngPath - Path to frame PNG in storage (optional)
 * @param {string} options.customText - Custom text overlay (optional)
 * @param {string} options.customTextPosition - Text position: 'top', 'center', 'bottom' (optional)
 * @param {string} options.customTextColor - Text color in hex (optional)
 * @param {Array} options.stickers - Array of sticker objects (optional)
 * @param {string} options.filterId - Video filter ID (optional)
 * @param {string} options.parentId - Parent user ID for tracking (optional)
 * @param {string} options.videoId - Video record ID (optional)
 * @param {string} options.giftId - Gift ID (optional)
 * @param {function} options.onProgress - Progress callback (optional)
 * @returns {Promise<{success: boolean, outputPath?: string, jobId?: string, error?: string}>}
 */
export const compositeVideoServerSide = async (options) => {
  const {
    videoStoragePath,
    frameTemplate = null,
    framePngPath = null,
    customText = null,
    customTextPosition = 'bottom',
    customTextColor = '#FFFFFF',
    stickers = [],
    filterId = null,
    parentId = null,
    videoId = null,
    giftId = null,
    onProgress = null,
  } = options;

  if (!videoStoragePath) {
    console.error('[COMPOSITING] videoStoragePath is required for server-side compositing');
    return { success: false, error: 'Video storage path is required' };
  }

  console.log('[COMPOSITING] Starting server-side compositing...');
  console.log('[COMPOSITING] Options:', {
    videoStoragePath,
    hasFrame: !!frameTemplate,
    framePngPath: framePngPath || frameTemplate?.frame_png_path,
    hasText: !!customText || !!frameTemplate?.custom_text,
    stickerCount: stickers?.length || 0,
    filterId,
  });

  if (onProgress) {
    onProgress('Creating processing job...');
  }

  try {
    // Determine the frame PNG path
    const effectiveFramePngPath = framePngPath || frameTemplate?.frame_png_path || null;

    // Determine custom text from options or template
    const effectiveCustomText = customText || frameTemplate?.custom_text || null;
    const effectiveTextPosition = customTextPosition || frameTemplate?.custom_text_position || 'bottom';
    const effectiveTextColor = customTextColor || frameTemplate?.custom_text_color || '#FFFFFF';

    // Create job in database
    const { data: job, error: insertError } = await supabase
      .from('video_compositing_jobs')
      .insert({
        video_path: videoStoragePath,
        frame_png_path: effectiveFramePngPath,
        custom_text: effectiveCustomText,
        custom_text_position: effectiveTextPosition,
        custom_text_color: effectiveTextColor,
        stickers: stickers && stickers.length > 0 ? stickers : null,
        filter_id: filterId,
        parent_id: parentId,
        video_id: videoId,
        gift_id: giftId,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('[COMPOSITING] Failed to create job:', insertError);
      return { success: false, error: `Failed to create processing job: ${insertError.message}` };
    }

    console.log('[COMPOSITING] Job created:', job.id);

    if (onProgress) {
      onProgress('Triggering video processor...');
    }

    // Call Edge Function directly to trigger Trigger.dev
    // (pg_net can't resolve Supabase hostnames from within the database)
    const { data: triggerData, error: triggerError } = await supabase.functions.invoke(
      'trigger-composite',
      {
        body: {
          type: 'INSERT',
          table: 'video_compositing_jobs',
          record: job,
        },
      }
    );

    if (triggerError) {
      console.error('[COMPOSITING] Failed to trigger Edge Function:', triggerError);
      // Update job status to failed
      await supabase
        .from('video_compositing_jobs')
        .update({ status: 'failed', error_message: triggerError.message })
        .eq('id', job.id);
      return { success: false, error: `Failed to trigger processor: ${triggerError.message}`, jobId: job.id };
    }

    console.log('[COMPOSITING] Edge Function triggered:', triggerData);

    if (onProgress) {
      onProgress('Waiting for server to start processing...');
    }

    // Poll for completion
    const result = await pollForCompletion(job.id, {
      timeout: 300000, // 5 minutes
      interval: 2000,  // 2 seconds
      onProgress,
    });

    if (result.success) {
      return {
        success: true,
        outputPath: result.outputPath,
        jobId: job.id,
      };
    } else {
      return {
        success: false,
        error: result.error,
        jobId: job.id,
      };
    }
  } catch (error) {
    console.error('[COMPOSITING] Server-side compositing error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get the public URL for a composited video from storage
 * @param {string} storagePath - Path in Supabase storage (e.g., 'composited/jobId.mp4')
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export const getCompositedVideoUrl = async (storagePath) => {
  if (!storagePath) {
    return { success: false, error: 'Storage path is required' };
  }

  try {
    // Get signed URL valid for 1 hour
    const { data, error } = await supabase.storage
      .from('videos')
      .createSignedUrl(storagePath, 3600);

    if (error) {
      console.error('[COMPOSITING] Failed to get signed URL:', error);
      return { success: false, error: error.message };
    }

    return { success: true, url: data.signedUrl };
  } catch (error) {
    console.error('[COMPOSITING] Error getting composited video URL:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if server-side compositing is available
 * Tests database connection and returns true if jobs table exists
 * @returns {Promise<boolean>}
 */
export const isServerCompositingAvailable = async () => {
  try {
    // Simple query to check if the table exists and is accessible
    const { error } = await supabase
      .from('video_compositing_jobs')
      .select('id')
      .limit(1);

    if (error) {
      console.log('[COMPOSITING] Server compositing not available:', error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.log('[COMPOSITING] Server compositing check failed:', error.message);
    return false;
  }
};

/**
 * Queue a video for server-side compositing and auto-send
 * This function returns immediately after creating the job - it doesn't wait for completion
 * The Trigger.dev task will handle compositing and auto-sending the email
 *
 * @param {object} options - Compositing and recipient options
 * @returns {Promise<{success: boolean, jobId?: string, error?: string}>}
 */
export const queueVideoForSending = async (options) => {
  const {
    videoStoragePath,
    frameTemplate,
    framePngPath,
    customText,
    customTextPosition,
    customTextColor,
    stickers = [],
    filterId,
    parentId,
    videoId,
    giftId,
    // Recipient info for auto-send
    recipientEmail,
    recipientName,
    sendMethod = 'email',
    emailSubject,
    emailBody,
    childName,
    giftName,
    eventName,
  } = options;

  console.log('[QUEUE] Creating video processing job with recipient info...', {
    videoStoragePath,
    recipientEmail,
    recipientName,
    sendMethod,
  });

  try {
    // Determine the frame PNG path
    const effectiveFramePngPath = framePngPath || frameTemplate?.frame_png_path || null;

    // Determine custom text from options or template
    const effectiveCustomText = customText || frameTemplate?.custom_text || null;
    const effectiveTextPosition = customTextPosition || frameTemplate?.custom_text_position || 'bottom';
    const effectiveTextColor = customTextColor || frameTemplate?.custom_text_color || '#FFFFFF';

    // Create job in database with recipient info
    const { data: job, error: insertError } = await supabase
      .from('video_compositing_jobs')
      .insert({
        video_path: videoStoragePath,
        frame_png_path: effectiveFramePngPath,
        custom_text: effectiveCustomText,
        custom_text_position: effectiveTextPosition,
        custom_text_color: effectiveTextColor,
        stickers: stickers && stickers.length > 0 ? stickers : null,
        filter_id: filterId,
        parent_id: parentId,
        video_id: videoId,
        gift_id: giftId,
        status: 'pending',
        // Recipient info for auto-send
        recipient_email: recipientEmail,
        recipient_name: recipientName,
        send_method: sendMethod,
        email_subject: emailSubject,
        email_body: emailBody,
        child_name: childName,
        gift_name: giftName,
        event_name: eventName,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[QUEUE] Failed to create job:', insertError);
      return { success: false, error: `Failed to create processing job: ${insertError.message}` };
    }

    console.log('[QUEUE] Job created:', job.id);

    // Call Edge Function to trigger Trigger.dev (non-blocking)
    const { data: triggerData, error: triggerError } = await supabase.functions.invoke(
      'trigger-composite',
      {
        body: {
          type: 'INSERT',
          table: 'video_compositing_jobs',
          record: job,
        },
      }
    );

    if (triggerError) {
      console.error('[QUEUE] Failed to trigger Edge Function:', triggerError);
      // Update job status to failed
      await supabase
        .from('video_compositing_jobs')
        .update({ status: 'failed', error_message: triggerError.message })
        .eq('id', job.id);
      return { success: false, error: `Failed to trigger processor: ${triggerError.message}`, jobId: job.id };
    }

    console.log('[QUEUE] Edge Function triggered, job queued successfully:', job.id);

    // Return immediately - don't wait for completion
    return {
      success: true,
      jobId: job.id,
      message: 'Video queued for processing',
    };
  } catch (error) {
    console.error('[QUEUE] Error creating job:', error);
    return { success: false, error: error.message };
  }
};

export default {
  isCompositingAvailable,
  isServerCompositingAvailable,
  compositeVideoServerSide,
  queueVideoForSending,
  getCompositedVideoUrl,
  fixVideoRotation,
  normalizeVideoRotation,
  addFrameBorder,
  overlayImage,
  addTextOverlay,
  addStickerOverlays,
  applyVideoFilter,
  overlayFramePNG,
  overlayPNGStickers,
  compositeVideo,
  prepareVideoForSharing,
  cleanupCompositedVideos,
  generateThumbnail,
};
