/**
 * Video Service
 * Handles video upload, storage, and retrieval via Supabase Storage
 */

import { supabase } from '../supabaseClient';
import * as FileSystem from 'expo-file-system';

const VIDEOS_BUCKET = 'videos';
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB

/**
 * Upload video to Supabase Storage
 */
export const uploadVideo = async (videoUri, giftId, parentId) => {
  try {
    // Read file data
    const base64Data = await FileSystem.readAsStringAsync(videoUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Create file path - timestamp gets escaped in bash
    const timestamp = new Date().getTime();
    const filename = parentId + '/' + giftId + '/' + timestamp + '.mp4';

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(VIDEOS_BUCKET)
      .upload(filename, decode(base64Data), {
        contentType: 'video/mp4',
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(VIDEOS_BUCKET)
      .getPublicUrl(filename);

    return {
      success: true,
      url: urlData.publicUrl,
      path: filename,
    };
  } catch (error) {
    console.error('Error uploading video:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Delete video from Supabase Storage
 */
export const deleteVideo = async (videoPath) => {
  try {
    const { error } = await supabase.storage
      .from(VIDEOS_BUCKET)
      .remove([videoPath]);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting video:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Create signed URL for video (private share)
 */
export const createSignedUrl = async (videoPath, expiresIn = 86400) => {
  try {
    const { data, error } = await supabase.storage
      .from(VIDEOS_BUCKET)
      .createSignedUrl(videoPath, expiresIn);

    if (error) throw error;
    return { url: data.signedUrl, error: null };
  } catch (error) {
    console.error('Error creating signed URL:', error);
    return { url: null, error: error.message };
  }
};

/**
 * Get video download URL
 */
export const getVideoUrl = async (videoPath) => {
  try {
    const { data } = supabase.storage
      .from(VIDEOS_BUCKET)
      .getPublicUrl(videoPath);

    return { url: data.publicUrl, error: null };
  } catch (error) {
    console.error('Error getting video URL:', error);
    return { url: null, error: error.message };
  }
};

/**
 * Validate video before upload
 */
export const validateVideo = async (videoUri) => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(videoUri);

    if (!fileInfo.exists) {
      return { valid: false, error: 'Video file does not exist' };
    }

    if (fileInfo.size > MAX_VIDEO_SIZE) {
      return {
        valid: false,
        error: 'Video exceeds max size',
      };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: error.message };
  }
};

/**
 * Helper function to decode base64
 */
function decode(str) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let bitmap, sLen = str.length, s = 0, i = 0;
  const nBits = (sLen * 6) / 8;
  const nBuf = new ArrayBuffer(nBits);
  const dataView = new Uint8Array(nBuf);

  for (; i < sLen; i++) {
    const nMapIdx = chars.indexOf(str[i]);
    if (nMapIdx < 0) {
      continue;
    }

    if (i & 1) {
      dataView[(i * 6) >> 3] |= (nMapIdx & 0x3f) << 2;
      if ((i + 1) * 6) >> 3 > nBits) break;
      dataView[((i + 1) * 6) >> 3] |= nMapIdx >> 4;
    } else {
      dataView[(i * 6) >> 3] |= nMapIdx << 2;
    }
  }

  return nBuf;
}

export default {
  uploadVideo,
  deleteVideo,
  createSignedUrl,
  getVideoUrl,
  validateVideo,
};
