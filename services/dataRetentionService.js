/**
 * Data Retention Service
 * Manages auto-delete policies, data expiry, and right-to-be-forgotten functionality
 * Ensures COPPA compliance with data minimization principles
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabaseClient';
import { logVideoDeleted } from './auditLogService';

/**
 * Retention policies (in days)
 */
export const RETENTION_POLICIES = {
  DRAFT_VIDEO: 7,        // Draft videos auto-delete after 7 days
  APPROVED_VIDEO: 90,    // Approved videos kept for 90 days
  EXPIRED_TOKEN: 1,      // Share tokens expire after 1 day
  AUDIT_LOG: 365,        // Audit logs kept for 1 year for compliance
};

/**
 * Check and delete expired draft videos
 * Should be called periodically (e.g., on app startup, daily)
 * @param {string} userId - Parent user ID
 * @returns {Promise<array>} - Array of deleted video IDs
 */
export async function deleteExpiredDraftVideos(userId) {
  try {
    const videos = await supabase
      .from('videos')
      .select('id, created_at, status')
      .eq('user_id', userId)
      .eq('status', 'draft');

    if (!videos.data) return [];

    const now = new Date();
    const deletedIds = [];

    for (const video of videos.data) {
      const createdDate = new Date(video.created_at);
      const ageInDays = (now - createdDate) / (1000 * 60 * 60 * 24);

      if (ageInDays > RETENTION_POLICIES.DRAFT_VIDEO) {
        // Delete video file from storage
        try {
          const fileName = `videos/${video.id}.mp4`;
          await supabase.storage.from('video-storage').remove([fileName]);
        } catch (e) {
          console.warn(`[RETENTION] Failed to delete video file: ${video.id}`);
        }

        // Delete video record
        await supabase.from('videos').delete().eq('id', video.id);

        await logVideoDeleted(video.id, userId, null, 'auto_expiry');

        deletedIds.push(video.id);
        console.log(`[RETENTION] Auto-deleted expired draft video: ${video.id}`);
      }
    }

    return deletedIds;
  } catch (error) {
    console.error('[RETENTION ERROR] Failed to delete expired draft videos:', error);
    return [];
  }
}

/**
 * Check and delete old approved videos (keep last 90 days)
 * @param {string} userId - Parent user ID
 * @returns {Promise<array>} - Array of deleted video IDs
 */
export async function deleteExpiredApprovedVideos(userId) {
  try {
    const videos = await supabase
      .from('videos')
      .select('id, created_at, status')
      .eq('user_id', userId)
      .eq('status', 'approved');

    if (!videos.data) return [];

    const now = new Date();
    const deletedIds = [];

    for (const video of videos.data) {
      const createdDate = new Date(video.created_at);
      const ageInDays = (now - createdDate) / (1000 * 60 * 60 * 24);

      if (ageInDays > RETENTION_POLICIES.APPROVED_VIDEO) {
        // Delete video file
        try {
          const fileName = `videos/${video.id}.mp4`;
          await supabase.storage.from('video-storage').remove([fileName]);
        } catch (e) {
          console.warn(`[RETENTION] Failed to delete video file: ${video.id}`);
        }

        // Delete video record
        await supabase.from('videos').delete().eq('id', video.id);

        await logVideoDeleted(video.id, userId, null, 'retention_policy');

        deletedIds.push(video.id);
        console.log(`[RETENTION] Auto-deleted old approved video: ${video.id}`);
      }
    }

    return deletedIds;
  } catch (error) {
    console.error('[RETENTION ERROR] Failed to delete expired approved videos:', error);
    return [];
  }
}

/**
 * Right-to-be-forgotten: Delete ALL child data
 * Permanently deletes all videos, photos, and records associated with child
 * Requires parental PIN verification
 * @param {string} userId - Parent user ID
 * @param {string} childId - Child ID
 * @returns {Promise<object>} - Deletion summary
 */
export async function deleteAllChildData(userId, childId) {
  try {
    console.log(`[RETENTION] Starting right-to-be-forgotten for child: ${childId}`);

    const summary = {
      videosDeleted: 0,
      photosDeleted: 0,
      recordsDeleted: 0,
      errors: [],
    };

    // 1. Delete all videos for this child
    try {
      const videos = await supabase
        .from('videos')
        .select('id')
        .eq('user_id', userId)
        .eq('child_id', childId);

      if (videos.data) {
        for (const video of videos.data) {
          try {
            // Delete from storage
            const fileName = `videos/${video.id}.mp4`;
            await supabase.storage.from('video-storage').remove([fileName]);

            // Delete record
            await supabase.from('videos').delete().eq('id', video.id);

            await logVideoDeleted(video.id, userId, childId, 'right_to_be_forgotten');

            summary.videosDeleted++;
          } catch (e) {
            summary.errors.push(`Failed to delete video ${video.id}`);
          }
        }
      }
    } catch (e) {
      summary.errors.push('Failed to delete videos');
    }

    // 2. Delete all guest records (gift givers) for this child
    try {
      const guests = await supabase
        .from('guests')
        .select('id')
        .eq('child_id', childId);

      if (guests.data) {
        await supabase.from('guests').delete().eq('child_id', childId);
        summary.recordsDeleted += guests.data.length;
      }
    } catch (e) {
      summary.errors.push('Failed to delete guest records');
    }

    // 3. Delete child record
    try {
      await supabase.from('children').delete().eq('id', childId);
      summary.recordsDeleted++;
    } catch (e) {
      summary.errors.push('Failed to delete child record');
    }

    // 4. Clear related local data
    try {
      const keys = await AsyncStorage.getAllKeys();
      const childKeys = keys.filter(key => key.includes(childId));
      await AsyncStorage.multiRemove(childKeys);
    } catch (e) {
      summary.errors.push('Failed to clear local child data');
    }

    console.log('[RETENTION] Right-to-be-forgotten completed:', summary);

    return summary;
  } catch (error) {
    console.error('[RETENTION ERROR] Right-to-be-forgotten failed:', error);
    throw error;
  }
}

/**
 * Get data deletion progress
 * @param {string} userId - Parent user ID
 * @returns {Promise<object>} - Deletion status
 */
export async function getDataDeletionStatus(userId) {
  try {
    const videoCount = await supabase
      .from('videos')
      .select('id', { count: 'exact' })
      .eq('user_id', userId);

    const guestCount = await supabase
      .from('guests')
      .select('id', { count: 'exact' })
      .eq('user_id', userId);

    return {
      videosCount: videoCount.count || 0,
      guestsCount: guestCount.count || 0,
      totalRecords: (videoCount.count || 0) + (guestCount.count || 0),
    };
  } catch (error) {
    console.error('[RETENTION ERROR] Failed to get deletion status:', error);
    return { videosCount: 0, guestsCount: 0, totalRecords: 0 };
  }
}

/**
 * Schedule automatic cleanup (call on app startup)
 * @param {string} userId - Parent user ID
 * @returns {Promise<void>}
 */
export async function scheduleAutomaticCleanup(userId) {
  try {
    console.log('[RETENTION] Running scheduled cleanup');

    const draftDeleted = await deleteExpiredDraftVideos(userId);
    const approvedDeleted = await deleteExpiredApprovedVideos(userId);

    console.log(
      `[RETENTION] Cleanup complete - Deleted ${draftDeleted.length} draft videos, ${approvedDeleted.length} approved videos`
    );
  } catch (error) {
    console.error('[RETENTION ERROR] Scheduled cleanup failed:', error);
  }
}

/**
 * Get when a draft will auto-delete
 * @param {Date} createdDate - When the draft was created
 * @returns {Date} - Date when it will be auto-deleted
 */
export function getDraftExpiryDate(createdDate) {
  const expiryDate = new Date(createdDate);
  expiryDate.setDate(expiryDate.getDate() + RETENTION_POLICIES.DRAFT_VIDEO);
  return expiryDate;
}

/**
 * Get when an approved video will be removed
 * @param {Date} createdDate - When the video was created
 * @returns {Date} - Date when it will be removed
 */
export function getApprovedVideoExpiryDate(createdDate) {
  const expiryDate = new Date(createdDate);
  expiryDate.setDate(expiryDate.getDate() + RETENTION_POLICIES.APPROVED_VIDEO);
  return expiryDate;
}
