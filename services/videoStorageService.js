// Video cloud storage service using Supabase Storage
import { supabase } from '../supabaseClient';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Upload video to Supabase Storage and return public URL
 * @param {string} localVideoUri - Local file URI of the video
 * @param {string} guestId - Guest ID for unique naming
 * @returns {Promise<string>} - Public URL of uploaded video
 */
export async function uploadVideoToCloud(localVideoUri, guestId) {
  try {
    console.log('Starting video upload for guest:', guestId);
    console.log('Local URI:', localVideoUri);

    // Check if file exists
    const fileInfo = await FileSystem.getInfoAsync(localVideoUri);
    console.log('File info:', fileInfo);

    if (!fileInfo.exists) {
      throw new Error(`Video file not found at ${localVideoUri}`);
    }

    // Read video file as base64
    const videoBase64 = await FileSystem.readAsStringAsync(localVideoUri, {
      encoding: 'base64',
    });

    if (!videoBase64) {
      throw new Error('Failed to read video file as base64');
    }

    console.log('Base64 length:', videoBase64.length);

    // Convert base64 to blob
    const videoBlob = base64ToBlob(videoBase64, 'video/mp4');

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `videos/${guestId}_${timestamp}.mp4`;

    console.log('Uploading to Supabase Storage:', filename);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('gratitugram-videos')
      .upload(filename, videoBlob, {
        contentType: 'video/mp4',
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    console.log('Upload successful:', data);

    // Generate signed URL for private bucket (24 hour expiry)
    const { data: urlData, error: urlError } = await supabase.storage
      .from('gratitugram-videos')
      .createSignedUrl(filename, 86400); // 24 hours in seconds

    if (urlError) {
      console.error('Failed to create signed URL:', urlError);
      throw new Error(`Failed to create signed URL: ${urlError.message}`);
    }

    const signedUrl = urlData.signedUrl;
    console.log('Signed URL created (expires in 24 hours)');

    return signedUrl;
  } catch (error) {
    console.error('Failed to upload video:', error);
    throw error;
  }
}

/**
 * Convert base64 string to Blob
 */
function base64ToBlob(base64, mimeType) {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Delete video from cloud storage
 * @param {string} publicUrl - Public URL of the video to delete
 */
export async function deleteVideoFromCloud(publicUrl) {
  try {
    // Extract filename from URL
    const urlParts = publicUrl.split('/');
    const filename = urlParts[urlParts.length - 1];
    const path = `videos/${filename}`;

    const { error } = await supabase.storage
      .from('gratitugram-videos')
      .remove([path]);

    if (error) {
      console.error('Delete error:', error);
      throw error;
    }

    console.log('Video deleted successfully:', path);
  } catch (error) {
    console.error('Failed to delete video:', error);
    // Don't throw - deletion failures shouldn't block the app
  }
}
