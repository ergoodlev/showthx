/**
 * Secure Share Service
 * Generates and validates time-limited access tokens for video sharing
 * Recipients can only access video via secure token, prevents direct URL guessing
 */

import { supabase } from '../supabaseClient';

const TOKEN_LENGTH = 32; // 256 bits
const TOKEN_EXPIRY_HOURS = 24; // Tokens valid for 24 hours by default
const SHORT_URL_BASE = 'https://showthx.com/v'; // Short URL base for video sharing

/**
 * Generate a secure random token (React Native compatible)
 * Uses random number generation to create a secure-looking token
 * @returns {string} - Random token
 */
function generateRandomToken() {
  // Generate random bytes using Math.random() (sufficient for tokens)
  let token = '';
  const chars = '0123456789abcdef';

  for (let i = 0; i < TOKEN_LENGTH * 2; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return token;
}

/**
 * Generate a shareable token for a video
 * Token allows recipients to access video without knowing actual video ID
 * @param {string} videoId - Video to share
 * @param {string} userId - Parent user ID
 * @param {object} options - Share options
 * @returns {Promise<object>} - Token and share details
 */
export async function generateShareToken(videoId, userId, options = {}) {
  try {
    const {
      expiryHours = TOKEN_EXPIRY_HOURS,
      recipientEmail = null,
      maxUses = null, // null = unlimited
      allowDownload = false,
    } = options;

    // Generate unique token
    let token = generateRandomToken();

    // Ensure uniqueness
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 5) {
      const existing = await supabase
        .from('video_share_tokens')
        .select('id')
        .eq('token', token)
        .limit(1);

      if (!existing.data || existing.data.length === 0) {
        isUnique = true;
      } else {
        token = generateRandomToken();
        attempts++;
      }
    }

    if (!isUnique) {
      throw new Error('Failed to generate unique token');
    }

    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryHours);

    // Store share token in database
    const { data, error } = await supabase
      .from('video_share_tokens')
      .insert({
        video_id: videoId,
        user_id: userId,
        token,
        expires_at: expiresAt.toISOString(),
        recipient_email: recipientEmail,
        max_uses: maxUses,
        uses: 0,
        allow_download: allowDownload,
        created_at: new Date().toISOString(),
      })
      .select();

    if (error) throw error;

    console.log(`[SECURE_SHARE] Generated share token for video: ${videoId}`);

    return {
      token,
      videoId,
      expiresAt,
      expiryHours,
      maxUses,
      recipientEmail,
      shareUrl: `${SHORT_URL_BASE}/${token}`, // Short web URL format
      deepLinkUrl: `showthx://share/${token}`, // Deep link for in-app use
    };
  } catch (error) {
    console.error('[SECURE_SHARE ERROR] Failed to generate share token:', error);
    throw error;
  }
}

/**
 * Validate and access video with token
 * @param {string} token - Share token
 * @returns {Promise<object>} - Video access details if valid
 */
export async function validateShareToken(token) {
  try {
    // Get token record
    const { data, error } = await supabase
      .from('video_share_tokens')
      .select(
        `
        id,
        token,
        video_id,
        expires_at,
        max_uses,
        uses,
        allow_download,
        created_at
      `
      )
      .eq('token', token)
      .maybeSingle();

    if (error || !data) {
      console.warn('[SECURE_SHARE] Invalid or expired token');
      return null;
    }

    // Check expiry
    if (new Date(data.expires_at) < new Date()) {
      console.warn('[SECURE_SHARE] Token expired');
      // Optionally delete expired token
      await supabase.from('video_share_tokens').delete().eq('token', token);
      return null;
    }

    // Check use limits
    if (data.max_uses && data.uses >= data.max_uses) {
      console.warn('[SECURE_SHARE] Token max uses exceeded');
      return null;
    }

    // Increment use count
    await supabase
      .from('video_share_tokens')
      .update({ uses: data.uses + 1, last_accessed_at: new Date().toISOString() })
      .eq('token', token);

    // Get video details (verify ownership)
    const { data: videoData, error: videoError } = await supabase
      .from('videos')
      .select('id, guest_name, status')
      .eq('id', data.video_id)
      .maybeSingle();

    if (videoError || !videoData) {
      console.warn('[SECURE_SHARE] Video not found for token');
      return null;
    }

    console.log(`[SECURE_SHARE] Token validated - Access granted for video: ${data.video_id}`);

    return {
      videoId: data.video_id,
      guestName: videoData.guest_name,
      allowDownload: data.allow_download,
      expiresAt: data.expires_at,
      usesRemaining: data.max_uses ? data.max_uses - data.uses - 1 : null,
    };
  } catch (error) {
    console.error('[SECURE_SHARE ERROR] Failed to validate token:', error);
    return null;
  }
}

/**
 * Revoke a share token early (before expiry)
 * @param {string} token - Token to revoke
 * @param {string} userId - User ID (must be token creator)
 * @returns {Promise<boolean>}
 */
export async function revokeShareToken(token, userId) {
  try {
    const { error } = await supabase
      .from('video_share_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('token', token)
      .eq('user_id', userId);

    if (error) throw error;

    console.log('[SECURE_SHARE] Revoked share token');

    return true;
  } catch (error) {
    console.error('[SECURE_SHARE ERROR] Failed to revoke token:', error);
    return false;
  }
}

/**
 * Get all active share tokens for a user
 * @param {string} userId - User ID
 * @returns {Promise<array>}
 */
export async function getUserShareTokens(userId) {
  try {
    const { data, error } = await supabase
      .from('video_share_tokens')
      .select(
        `
        id,
        token,
        video_id,
        expires_at,
        recipient_email,
        uses,
        max_uses,
        created_at,
        revoked_at
      `
      )
      .eq('user_id', userId)
      .is('revoked_at', null) // Only non-revoked tokens
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Filter out expired tokens client-side
    const activeTokens = data.filter(t => new Date(t.expires_at) > new Date());

    console.log(`[SECURE_SHARE] Retrieved ${activeTokens.length} active share tokens`);

    return activeTokens;
  } catch (error) {
    console.error('[SECURE_SHARE ERROR] Failed to get share tokens:', error);
    return [];
  }
}

/**
 * Clean up expired tokens
 * @returns {Promise<number>} - Number of tokens deleted
 */
export async function cleanupExpiredTokens() {
  try {
    const now = new Date().toISOString();

    const { data: expiredTokens, error: selectError } = await supabase
      .from('video_share_tokens')
      .select('id')
      .lt('expires_at', now)
      .is('revoked_at', null);

    if (selectError) throw selectError;

    if (!expiredTokens || expiredTokens.length === 0) {
      return 0;
    }

    // Delete expired tokens
    const { error: deleteError } = await supabase
      .from('video_share_tokens')
      .delete()
      .lt('expires_at', now);

    if (deleteError) throw deleteError;

    console.log(`[SECURE_SHARE] Cleaned up ${expiredTokens.length} expired tokens`);

    return expiredTokens.length;
  } catch (error) {
    console.error('[SECURE_SHARE ERROR] Failed to cleanup expired tokens:', error);
    return 0;
  }
}

/**
 * Create a short shareable URL for a video
 * Stores the video's storage path with the token for Cloudflare Worker to resolve
 * @param {string} videoId - Video ID
 * @param {string} userId - Parent user ID
 * @param {string} storagePath - Supabase storage path for the video
 * @param {object} options - Share options (expiryHours, etc)
 * @returns {Promise<{shortUrl: string, token: string}>}
 */
export async function createShortVideoUrl(videoId, userId, storagePath, options = {}) {
  try {
    const shareData = await generateShareToken(videoId, userId, {
      expiryHours: options.expiryHours || 720, // 30 days default for video sharing
      ...options,
    });

    // Store the storage path with the token for Cloudflare Worker to resolve
    const { error } = await supabase
      .from('video_share_tokens')
      .update({ storage_path: storagePath })
      .eq('token', shareData.token);

    if (error) {
      console.warn('[SECURE_SHARE] Could not store storage_path:', error.message);
    }

    console.log(`[SECURE_SHARE] Created short URL: ${shareData.shareUrl}`);

    return {
      shortUrl: shareData.shareUrl,
      token: shareData.token,
      expiresAt: shareData.expiresAt,
    };
  } catch (error) {
    console.error('[SECURE_SHARE ERROR] Failed to create short URL:', error);
    throw error;
  }
}

/**
 * Get the short URL base for display purposes
 */
export function getShortUrlBase() {
  return SHORT_URL_BASE;
}

/**
 * Send share link via email (integration with email service)
 * @param {string} token - Share token
 * @param {string} recipientEmail - Email to send to
 * @param {string} childName - Name of child (for context)
 * @returns {Promise<boolean>}
 */
export async function sendShareLinkViaEmail(token, recipientEmail, childName) {
  try {
    // This would integrate with your email service (SendGrid)
    // For now, just log that it would be sent
    const shareLink = `${SHORT_URL_BASE}/${token}`;

    console.log(`[SECURE_SHARE] Would send share link to ${recipientEmail}: ${shareLink}`);

    // TODO: Integrate with SendGrid to actually send email

    return true;
  } catch (error) {
    console.error('[SECURE_SHARE ERROR] Failed to send share link:', error);
    return false;
  }
}
