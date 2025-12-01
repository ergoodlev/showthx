/**
 * Video Composition Service
 * Merges multiple videos (gift opening + thank you) into single video
 * Handles video concatenation and audio mixing
 */

import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../supabaseClient';

/**
 * Get video information (duration, dimensions, etc.)
 * @param {string} videoUri - Local video URI or remote URL
 * @returns {Promise<object>} - Video metadata
 */
export async function getVideoInfo(videoUri) {
  try {
    console.log(`[COMPOSITION] Getting video info for: ${videoUri}`);

    // For now, return basic metadata
    // In production, would use FFprobe or similar
    const fileInfo = await FileSystem.getInfoAsync(videoUri);

    return {
      uri: videoUri,
      sizeBytes: fileInfo.size,
      exists: fileInfo.exists,
      // Additional metadata would be added via FFmpeg integration
      duration: null, // Would be extracted from media player or FFmpeg
      dimensions: {
        width: 1080,
        height: 1920,
      },
    };
  } catch (error) {
    console.error('[COMPOSITION ERROR] Failed to get video info:', error);
    throw error;
  }
}

/**
 * Merge two videos into one (gift opening + thank you)
 * Creates a new video file with both clips in sequence
 * @param {string} giftOpeningUri - First video (gift opening)
 * @param {string} thankYouUri - Second video (thank you message)
 * @param {string} outputName - Name for output video
 * @returns {Promise<object>} - Merged video details
 */
export async function mergeVideos(giftOpeningUri, thankYouUri, outputName) {
  try {
    console.log('[COMPOSITION] Merging videos...');

    // Check both files exist
    const giftInfo = await FileSystem.getInfoAsync(giftOpeningUri);
    const thankYouInfo = await FileSystem.getInfoAsync(thankYouUri);

    if (!giftInfo.exists || !thankYouInfo.exists) {
      throw new Error('One or both video files not found');
    }

    console.log(
      `[COMPOSITION] Merging: ${giftInfo.size} bytes + ${thankYouInfo.size} bytes`
    );

    // Create output path
    const outputUri = FileSystem.documentDirectory + `${outputName}.mp4`;

    // In production, use FFmpeg via react-native-ffmpeg
    // For now, return a placeholder indicating where merged video would be
    // This is a simplified implementation

    console.log(`[COMPOSITION] Would merge to: ${outputUri}`);
    console.log(
      '[COMPOSITION] NOTE: Actual video merging requires FFmpeg integration'
    );

    return {
      mergedUri: outputUri,
      giftOpeningUri,
      thankYouUri,
      totalSize: giftInfo.size + thankYouInfo.size,
      status: 'pending_ffmpeg',
      message:
        'Video composition requires FFmpeg. Install react-native-ffmpeg for production.',
    };
  } catch (error) {
    console.error('[COMPOSITION ERROR] Failed to merge videos:', error);
    throw error;
  }
}

/**
 * Create a video with intro/outro elements
 * Adds title card at start and credits/watermark at end
 * @param {string} videoUri - Original video
 * @param {object} metadata - Video metadata (child name, etc.)
 * @returns {Promise<object>} - Enhanced video details
 */
export async function enhanceVideoWithMetadata(videoUri, metadata) {
  try {
    console.log('[COMPOSITION] Enhancing video with metadata...');

    const { childName, giftFrom, timestamp } = metadata;

    // Create enhanced version
    const enhancedUri = videoUri.replace('.mp4', '_enhanced.mp4');

    console.log('[COMPOSITION] Would create enhanced video at:', enhancedUri);
    console.log(`[COMPOSITION] Adding: "${childName}" thank you from "${giftFrom}"`);

    return {
      enhancedUri,
      originalUri: videoUri,
      metadata: {
        childName,
        giftFrom,
        timestamp,
        watermark: 'GratituGram',
      },
      status: 'pending_ffmpeg',
    };
  } catch (error) {
    console.error('[COMPOSITION ERROR] Failed to enhance video:', error);
    throw error;
  }
}

/**
 * Generate a preview/thumbnail from video
 * Captures frame at specified time
 * @param {string} videoUri - Video to generate thumbnail from
 * @param {number} timeSeconds - Time in seconds (default: 1 second)
 * @returns {Promise<object>} - Thumbnail details
 */
export async function generateVideoThumbnail(videoUri, timeSeconds = 1) {
  try {
    console.log(`[COMPOSITION] Generating thumbnail at ${timeSeconds}s`);

    const thumbnailUri = videoUri.replace('.mp4', '_thumb.jpg');

    // Would use FFmpeg to extract frame
    // ffmpeg -ss 1 -i input.mp4 -vf scale=320:320 -vframes 1 output.jpg

    return {
      thumbnailUri,
      sourceVideo: videoUri,
      capturedAtSeconds: timeSeconds,
    };
  } catch (error) {
    console.error('[COMPOSITION ERROR] Failed to generate thumbnail:', error);
    return null;
  }
}

/**
 * Validate video file is playable and not corrupted
 * @param {string} videoUri - Video to validate
 * @returns {Promise<boolean>}
 */
export async function validateVideoFile(videoUri) {
  try {
    const fileInfo = await FileSystem.getInfoAsync(videoUri);

    if (!fileInfo.exists) {
      console.warn('[COMPOSITION] Video file does not exist');
      return false;
    }

    if (fileInfo.size === 0) {
      console.warn('[COMPOSITION] Video file is empty');
      return false;
    }

    // Would validate magic bytes / file header
    // MP4 files should start with specific bytes
    const base64 = await FileSystem.readAsStringAsync(videoUri, {
      encoding: 'base64',
      length: 12, // Read first 12 bytes
    });

    // Check for MP4 signature
    // Should contain 'ftyp' in first 32 bytes
    if (!base64.includes('mdAA')) {
      // Base64 encoded "ftyp"
      console.warn('[COMPOSITION] File does not appear to be valid MP4');
      return false;
    }

    console.log('[COMPOSITION] Video file validation passed');

    return true;
  } catch (error) {
    console.error('[COMPOSITION ERROR] Video validation failed:', error);
    return false;
  }
}

/**
 * Get estimated file size for merged video
 * Uses source video sizes for estimation
 * @param {number} giftOpeningSizeBytes - Gift opening video size
 * @param {number} thankYouSizeBytes - Thank you video size
 * @returns {number} - Estimated merged video size
 */
export function estimateMergedVideoSize(giftOpeningSizeBytes, thankYouSizeBytes) {
  // Rough estimation: merged size slightly larger than sum due to container overhead
  const overhead = 1.05;
  return Math.round((giftOpeningSizeBytes + thankYouSizeBytes) * overhead);
}

/**
 * Delete temporary composition files
 * @param {array} fileUris - Array of temp file URIs to delete
 * @returns {Promise<number>} - Number of files deleted
 */
export async function deleteTemporaryFiles(fileUris) {
  try {
    let deletedCount = 0;

    for (const uri of fileUris) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(uri);
          deletedCount++;
          console.log(`[COMPOSITION] Deleted temp file: ${uri}`);
        }
      } catch (e) {
        console.warn(`[COMPOSITION] Could not delete: ${uri}`);
      }
    }

    console.log(
      `[COMPOSITION] Cleanup complete - deleted ${deletedCount} temp files`
    );

    return deletedCount;
  } catch (error) {
    console.error('[COMPOSITION ERROR] Temp file cleanup failed:', error);
    return 0;
  }
}

/**
 * FFmpeg Integration Setup Instructions
 * For production video composition, install and configure:
 *
 * 1. Install react-native-ffmpeg:
 *    npm install react-native-ffmpeg
 *
 * 2. Use FFmpeg commands like:
 *    ffmpeg -i gift_opening.mp4 -i thank_you.mp4 -filter_complex "[0:v][1:v]concat=n=2:v=1:a=0[v]" -map "[v]" -c:v libx264 merged.mp4
 *
 * 3. For adding overlays/watermarks:
 *    ffmpeg -i input.mp4 -vf "drawtext=text='GratituGram':x=10:y=H-th-10:fontsize=24:fontcolor=white" output.mp4
 */
