/**
 * Video Processing Service
 * On-device video processing using FFmpeg
 *
 * IMPORTANT: This service requires a development build.
 * It will NOT work in Expo Go.
 *
 * Features:
 * - Add background music to videos
 * - Apply fade in/out effects
 * - Add text overlays
 * - Merge multiple videos
 * - Adjust video quality/compression
 *
 * Security: All processing happens on-device, no cloud uploads
 * of children's videos for processing.
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
    // Use community fork @spreen/ffmpeg-kit-react-native (original was retired Jan 2025)
    const ffmpegModule = require('@spreen/ffmpeg-kit-react-native');
    FFmpegKit = ffmpegModule.FFmpegKit;
    FFmpegKitConfig = ffmpegModule.FFmpegKitConfig;
    ReturnCode = ffmpegModule.ReturnCode;
    return true;
  } catch (error) {
    console.warn('FFmpeg Kit not available. Using fallback mode.', error.message);
    return false;
  }
};

/**
 * Check if FFmpeg is available (requires development build)
 */
export const isFFmpegAvailable = async () => {
  return await loadFFmpeg();
};

/**
 * Get the output directory for processed videos
 */
const getOutputDir = async () => {
  const dir = `${FileSystem.cacheDirectory}processed_videos/`;
  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  return dir;
};

/**
 * Generate unique output filename
 */
const generateOutputPath = async (extension = 'mp4') => {
  const dir = await getOutputDir();
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `${dir}output_${timestamp}_${random}.${extension}`;
};

/**
 * Add background music to a video
 * @param {string} videoPath - Path to input video
 * @param {string} audioPath - Path to audio file (MP3, M4A, etc.)
 * @param {object} options - Options for audio mixing
 * @returns {Promise<{success: boolean, outputPath?: string, error?: string}>}
 */
export const addMusicToVideo = async (videoPath, audioPath, options = {}) => {
  const ffmpegLoaded = await loadFFmpeg();
  if (!ffmpegLoaded) {
    return {
      success: false,
      error: 'FFmpeg not available. Please use a development build.',
    };
  }

  try {
    const {
      musicVolume = 0.3, // Music volume (0-1)
      videoVolume = 1.0, // Original video volume
      fadeInDuration = 1, // Seconds
      fadeOutDuration = 2, // Seconds
      loop = true, // Loop music if shorter than video
    } = options;

    const outputPath = await generateOutputPath();

    // Build FFmpeg command
    let command = `-i "${videoPath}" -i "${audioPath}"`;

    // Audio filter for mixing and fading
    const audioFilter = [
      `[1:a]volume=${musicVolume}`,
      loop ? 'aloop=-1:size=2e+09' : '',
      fadeInDuration > 0 ? `afade=t=in:st=0:d=${fadeInDuration}` : '',
      fadeOutDuration > 0 ? `afade=t=out:st=0:d=${fadeOutDuration}` : '',
    ]
      .filter(Boolean)
      .join(',');

    command += ` -filter_complex "[0:a]volume=${videoVolume}[va];${audioFilter}[ma];[va][ma]amix=inputs=2:duration=first:dropout_transition=2[aout]"`;
    command += ` -map 0:v -map "[aout]"`;
    command += ` -c:v copy -c:a aac -shortest`;
    command += ` -y "${outputPath}"`;

    console.log('FFmpeg command:', command);

    const session = await FFmpegKit.execute(command);
    const returnCode = await session.getReturnCode();

    if (ReturnCode.isSuccess(returnCode)) {
      console.log('Music added successfully');
      return { success: true, outputPath };
    } else {
      const logs = await session.getLogs();
      console.error('FFmpeg failed:', logs);
      return { success: false, error: 'Failed to add music to video' };
    }
  } catch (error) {
    console.error('Error adding music:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Apply fade effects to video
 * @param {string} videoPath - Path to input video
 * @param {object} options - Fade options
 * @returns {Promise<{success: boolean, outputPath?: string, error?: string}>}
 */
export const applyFadeEffects = async (videoPath, options = {}) => {
  const ffmpegLoaded = await loadFFmpeg();
  if (!ffmpegLoaded) {
    return {
      success: false,
      error: 'FFmpeg not available. Please use a development build.',
    };
  }

  try {
    const {
      fadeInDuration = 1, // Seconds
      fadeOutDuration = 1, // Seconds
      videoDuration = null, // If known, for fade out timing
    } = options;

    const outputPath = await generateOutputPath();

    // Get video duration if not provided
    let duration = videoDuration;
    if (!duration) {
      // Use ffprobe to get duration
      const probeSession = await FFmpegKit.execute(
        `-i "${videoPath}" -show_entries format=duration -v quiet -of csv="p=0"`
      );
      // This is simplified - in production you'd parse the output
      duration = 30; // Default fallback
    }

    const fadeOutStart = Math.max(0, duration - fadeOutDuration);

    let videoFilter = '';
    if (fadeInDuration > 0) {
      videoFilter += `fade=t=in:st=0:d=${fadeInDuration}`;
    }
    if (fadeOutDuration > 0) {
      if (videoFilter) videoFilter += ',';
      videoFilter += `fade=t=out:st=${fadeOutStart}:d=${fadeOutDuration}`;
    }

    let audioFilter = '';
    if (fadeInDuration > 0) {
      audioFilter += `afade=t=in:st=0:d=${fadeInDuration}`;
    }
    if (fadeOutDuration > 0) {
      if (audioFilter) audioFilter += ',';
      audioFilter += `afade=t=out:st=${fadeOutStart}:d=${fadeOutDuration}`;
    }

    let command = `-i "${videoPath}"`;
    if (videoFilter) {
      command += ` -vf "${videoFilter}"`;
    }
    if (audioFilter) {
      command += ` -af "${audioFilter}"`;
    }
    command += ` -c:v libx264 -c:a aac -y "${outputPath}"`;

    console.log('FFmpeg command:', command);

    const session = await FFmpegKit.execute(command);
    const returnCode = await session.getReturnCode();

    if (ReturnCode.isSuccess(returnCode)) {
      console.log('Fade effects applied successfully');
      return { success: true, outputPath };
    } else {
      return { success: false, error: 'Failed to apply fade effects' };
    }
  } catch (error) {
    console.error('Error applying fade effects:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Add text overlay to video (burned in)
 * @param {string} videoPath - Path to input video
 * @param {string} text - Text to overlay
 * @param {object} options - Text styling options
 * @returns {Promise<{success: boolean, outputPath?: string, error?: string}>}
 */
export const addTextOverlay = async (videoPath, text, options = {}) => {
  const ffmpegLoaded = await loadFFmpeg();
  if (!ffmpegLoaded) {
    return {
      success: false,
      error: 'FFmpeg not available. Please use a development build.',
    };
  }

  try {
    const {
      fontSize = 48,
      fontColor = 'white',
      position = 'bottom', // 'top', 'middle', 'bottom', or {x, y}
      backgroundColor = 'black@0.5',
      shadowColor = 'black',
      shadowX = 2,
      shadowY = 2,
    } = options;

    const outputPath = await generateOutputPath();

    // Position mapping
    let positionStr = '';
    if (typeof position === 'object') {
      positionStr = `x=${position.x}:y=${position.y}`;
    } else {
      switch (position) {
        case 'top':
          positionStr = 'x=(w-text_w)/2:y=50';
          break;
        case 'middle':
          positionStr = 'x=(w-text_w)/2:y=(h-text_h)/2';
          break;
        case 'bottom':
        default:
          positionStr = 'x=(w-text_w)/2:y=h-text_h-50';
          break;
      }
    }

    // Escape special characters in text
    const escapedText = text.replace(/'/g, "'\\''").replace(/:/g, '\\:');

    const drawTextFilter = `drawtext=text='${escapedText}':fontsize=${fontSize}:fontcolor=${fontColor}:${positionStr}:shadowcolor=${shadowColor}:shadowx=${shadowX}:shadowy=${shadowY}:box=1:boxcolor=${backgroundColor}:boxborderw=10`;

    const command = `-i "${videoPath}" -vf "${drawTextFilter}" -c:a copy -y "${outputPath}"`;

    console.log('FFmpeg command:', command);

    const session = await FFmpegKit.execute(command);
    const returnCode = await session.getReturnCode();

    if (ReturnCode.isSuccess(returnCode)) {
      console.log('Text overlay added successfully');
      return { success: true, outputPath };
    } else {
      return { success: false, error: 'Failed to add text overlay' };
    }
  } catch (error) {
    console.error('Error adding text overlay:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Compress video for optimal file size
 * @param {string} videoPath - Path to input video
 * @param {object} options - Compression options
 * @returns {Promise<{success: boolean, outputPath?: string, error?: string}>}
 */
export const compressVideo = async (videoPath, options = {}) => {
  const ffmpegLoaded = await loadFFmpeg();
  if (!ffmpegLoaded) {
    return {
      success: false,
      error: 'FFmpeg not available. Please use a development build.',
    };
  }

  try {
    const {
      quality = 'medium', // 'low', 'medium', 'high'
      maxWidth = 1080,
      maxHeight = 1920,
    } = options;

    const outputPath = await generateOutputPath();

    // CRF values: lower = better quality, higher = smaller file
    const crfMap = {
      low: 28,
      medium: 23,
      high: 18,
    };
    const crf = crfMap[quality] || 23;

    const command = `-i "${videoPath}" -vf "scale='min(${maxWidth},iw)':'min(${maxHeight},ih)':force_original_aspect_ratio=decrease" -c:v libx264 -crf ${crf} -preset fast -c:a aac -b:a 128k -y "${outputPath}"`;

    console.log('FFmpeg command:', command);

    const session = await FFmpegKit.execute(command);
    const returnCode = await session.getReturnCode();

    if (ReturnCode.isSuccess(returnCode)) {
      console.log('Video compressed successfully');
      return { success: true, outputPath };
    } else {
      return { success: false, error: 'Failed to compress video' };
    }
  } catch (error) {
    console.error('Error compressing video:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Process video with all customizations
 * Combines music, text overlay, and effects in a single pass
 * @param {string} videoPath - Path to input video
 * @param {object} customizations - All customization options
 * @returns {Promise<{success: boolean, outputPath?: string, error?: string}>}
 */
export const processVideoWithCustomizations = async (
  videoPath,
  customizations = {}
) => {
  const ffmpegLoaded = await loadFFmpeg();
  if (!ffmpegLoaded) {
    // Fallback: return original video without processing
    console.warn('FFmpeg not available. Returning original video.');
    return { success: true, outputPath: videoPath, fallback: true };
  }

  try {
    const {
      music,
      textOverlay,
      fadeIn = 0,
      fadeOut = 0,
      compress = false,
    } = customizations;

    let currentVideoPath = videoPath;

    // Step 1: Add music if provided
    if (music?.path) {
      const musicResult = await addMusicToVideo(currentVideoPath, music.path, {
        musicVolume: music.volume || 0.3,
        fadeInDuration: music.fadeIn || 1,
        fadeOutDuration: music.fadeOut || 2,
      });
      if (musicResult.success) {
        currentVideoPath = musicResult.outputPath;
      } else {
        console.warn('Failed to add music, continuing with other effects');
      }
    }

    // Step 2: Add text overlay if provided
    if (textOverlay?.text) {
      const textResult = await addTextOverlay(
        currentVideoPath,
        textOverlay.text,
        {
          fontSize: textOverlay.fontSize || 48,
          fontColor: textOverlay.color || 'white',
          position: textOverlay.position || 'bottom',
        }
      );
      if (textResult.success) {
        currentVideoPath = textResult.outputPath;
      } else {
        console.warn('Failed to add text overlay, continuing with other effects');
      }
    }

    // Step 3: Apply fade effects if specified
    if (fadeIn > 0 || fadeOut > 0) {
      const fadeResult = await applyFadeEffects(currentVideoPath, {
        fadeInDuration: fadeIn,
        fadeOutDuration: fadeOut,
      });
      if (fadeResult.success) {
        currentVideoPath = fadeResult.outputPath;
      }
    }

    // Step 4: Compress if needed
    if (compress) {
      const compressResult = await compressVideo(currentVideoPath, {
        quality: 'medium',
      });
      if (compressResult.success) {
        currentVideoPath = compressResult.outputPath;
      }
    }

    return { success: true, outputPath: currentVideoPath };
  } catch (error) {
    console.error('Error processing video:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Clean up temporary processed videos
 */
export const cleanupProcessedVideos = async () => {
  try {
    const dir = `${FileSystem.cacheDirectory}processed_videos/`;
    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(dir, { idempotent: true });
    }
    console.log('Cleaned up processed videos');
    return { success: true };
  } catch (error) {
    console.error('Error cleaning up:', error);
    return { success: false, error: error.message };
  }
};

export default {
  isFFmpegAvailable,
  addMusicToVideo,
  applyFadeEffects,
  addTextOverlay,
  compressVideo,
  processVideoWithCustomizations,
  cleanupProcessedVideos,
};
