/**
 * Video Merge Service
 * Merges gift opening video(s) with thank you video(s) with music and transitions
 * Runs on Supabase Edge Functions (calls backend FFmpeg service)
 * Designed for simplicity: one-click merging with beautiful default transitions
 */

import { supabase } from '../supabaseClient';

/**
 * Merge gift opening video with thank you video(s)
 * @param {object} mergeConfig - Merge configuration
 * @param {string} mergeConfig.giftOpeningVideoUrl - URL of gift opening video
 * @param {string[]} mergeConfig.thankYouVideoUrls - URLs of thank you videos (can be multiple)
 * @param {string} mergeConfig.musicTrackId - Music track UUID from music_library
 * @param {object} mergeConfig.customizations - Kid customizations (text, position, etc.)
 * @param {string} mergeConfig.layoutStyle - 'side_by_side', 'pip', 'split'
 * @param {string} mergeConfig.transitionStyle - 'fade', 'slide', 'zoom'
 * @returns {Promise<string>} - URL of merged video
 */
export async function mergeVideos(mergeConfig) {
  try {
    console.log('[VIDEO MERGE] Starting video merge with config:', mergeConfig);

    // Validate inputs
    if (!mergeConfig.giftOpeningVideoUrl) {
      throw new Error('Gift opening video URL required');
    }
    if (!mergeConfig.thankYouVideoUrls || mergeConfig.thankYouVideoUrls.length === 0) {
      throw new Error('At least one thank you video URL required');
    }

    // Call Supabase Edge Function (backend)
    const { data, error } = await supabase.functions.invoke('merge-videos', {
      body: {
        giftOpeningVideoUrl: mergeConfig.giftOpeningVideoUrl,
        thankYouVideoUrls: mergeConfig.thankYouVideoUrls,
        musicTrackId: mergeConfig.musicTrackId,
        customizations: mergeConfig.customizations,
        layoutStyle: mergeConfig.layoutStyle || 'side_by_side',
        transitionStyle: mergeConfig.transitionStyle || 'fade',
      },
    });

    if (error) {
      console.error('[VIDEO MERGE ERROR]', error);
      throw error;
    }

    console.log('[VIDEO MERGE] Merge completed successfully:', data);
    return data.mergedVideoUrl;
  } catch (error) {
    console.error('[VIDEO MERGE ERROR] Failed to merge videos:', error);
    throw error;
  }
}

/**
 * Get merge status (useful for long-running merges)
 * @param {string} mergeJobId - Job ID returned from initial merge request
 * @returns {Promise<object>} - Status object with progress, status, and URL if complete
 */
export async function getMergeStatus(mergeJobId) {
  try {
    const { data, error } = await supabase
      .from('merge_jobs')
      .select('*')
      .eq('id', mergeJobId)
      .single();

    if (error) throw error;

    return {
      status: data.status, // 'pending', 'processing', 'completed', 'failed'
      progress: data.progress, // 0-100
      mergedVideoUrl: data.merged_video_url,
      error: data.error_message,
    };
  } catch (error) {
    console.error('[VIDEO MERGE ERROR] Failed to get merge status:', error);
    throw error;
  }
}

/**
 * BACKEND FUNCTION TEMPLATE (runs on Supabase Edge Functions)
 * This would be in: supabase/functions/merge-videos/index.ts
 *
 * Uses FFmpeg to:
 * 1. Download gift opening and thank you videos from Supabase storage
 * 2. Download music track
 * 3. Create complex video composition with:
 *    - Side-by-side or picture-in-picture layout
 *    - Fade/slide transitions between videos
 *    - Music synced to video duration
 *    - Text overlays (optional kid message)
 *    - Professional transitions
 * 4. Upload merged video back to Supabase storage
 * 5. Return URL and update database
 */

/**
 * Helper: Simple merge (used for testing/demo without backend)
 * In production, replace with actual FFmpeg-based backend call
 * @param {object} config - Merge configuration
 * @returns {Promise<string>} - Merged video URL (stub)
 */
export async function simpleMergeVideos(config) {
  console.warn('[VIDEO MERGE] Using stub merge (production uses FFmpeg backend)');

  // In production:
  // 1. Call Supabase Edge Function with FFmpeg
  // 2. Wait for processing
  // 3. Return merged video URL

  // For now, just return a placeholder
  return `https://placeholder-merged-${Date.now()}.mp4`;
}

/**
 * Helper: List available merge presets
 * @returns {object[]} - Array of preset configurations
 */
export function getMergePresets() {
  return [
    {
      id: 'classic',
      name: 'Classic Side-by-Side',
      description: 'Gift opening on left, thank you on right',
      layoutStyle: 'side_by_side',
      transitionStyle: 'fade',
      duration: 'auto',
    },
    {
      id: 'pip',
      name: 'Picture in Picture',
      description: 'Thank you in floating window over gift opening',
      layoutStyle: 'pip',
      transitionStyle: 'slide',
      duration: 'auto',
    },
    {
      id: 'sequence',
      name: 'Sequential',
      description: 'Gift opening first, then thank you with transition',
      layoutStyle: 'split',
      transitionStyle: 'zoom',
      duration: 'auto',
    },
    {
      id: 'split',
      name: 'Split Screen',
      description: 'Videos split horizontally',
      layoutStyle: 'split',
      transitionStyle: 'fade',
      duration: 'auto',
    },
  ];
}

/**
 * Helper: Get recommended video duration based on layout
 * @param {string} layoutStyle - Layout style
 * @param {number} giftOpeningDuration - Gift opening video duration in seconds
 * @param {number[]} thankYouDurations - Thank you video durations in seconds
 * @returns {number} - Recommended total duration in seconds
 */
export function getRecommendedDuration(layoutStyle, giftOpeningDuration, thankYouDurations) {
  const maxThankYou = Math.max(...thankYouDurations);

  switch (layoutStyle) {
    case 'side_by_side':
      // Both play simultaneously
      return Math.max(giftOpeningDuration, maxThankYou) + 2; // +2s for transitions
    case 'pip':
      // Both play simultaneously
      return Math.max(giftOpeningDuration, maxThankYou) + 2;
    case 'split':
      // Sequential: gift opening then thank you
      return giftOpeningDuration + maxThankYou + 2;
    case 'sequence':
    default:
      return giftOpeningDuration + maxThankYou + 2;
  }
}
