/**
 * AI Frame Service
 * Generates custom video frames using OpenAI DALL-E 3
 * Frames are PNG images with transparent centers for video overlay
 */

import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../supabaseClient';
import Constants from 'expo-constants';

// Get API key from environment
const OPENAI_API_KEY = Constants.expoConfig?.extra?.OPENAI_API_KEY ||
  process.env.OPENAI_API_KEY ||
  process.env.EXPO_PUBLIC_OPENAI_API_KEY;

const AI_FRAMES_BUCKET = 'ai-frames';
const FRAME_WIDTH = 1024;
const FRAME_HEIGHT = 1792; // Portrait 9:16 aspect ratio

/**
 * Color schemes available for AI frames
 */
export const FRAME_COLOR_SCHEMES = [
  { id: 'teal', name: 'Teal', hex: '#06B6D4', description: 'Cool teal blue-green' },
  { id: 'purple', name: 'Purple', hex: '#8B5CF6', description: 'Vibrant purple' },
  { id: 'coral', name: 'Coral', hex: '#FF6B6B', description: 'Warm coral pink' },
  { id: 'gold', name: 'Gold', hex: '#F59E0B', description: 'Sunny golden yellow' },
  { id: 'green', name: 'Green', hex: '#10B981', description: 'Fresh emerald green' },
  { id: 'pink', name: 'Pink', hex: '#EC4899', description: 'Bright playful pink' },
  { id: 'rainbow', name: 'Rainbow', hex: null, description: 'Colorful rainbow mix' },
];

/**
 * Frame style presets for quick generation
 */
export const FRAME_STYLE_PRESETS = [
  {
    id: 'birthday',
    name: 'Birthday Party',
    prompt: 'birthday celebration with balloons, confetti, cake, and party decorations',
    icon: '🎂',
  },
  {
    id: 'thank-you',
    name: 'Thank You',
    prompt: 'grateful thank you theme with hearts, flowers, and appreciation symbols',
    icon: '💝',
  },
  {
    id: 'holiday',
    name: 'Holiday',
    prompt: 'festive winter holiday theme with snowflakes, ornaments, and sparkles',
    icon: '🎄',
  },
  {
    id: 'underwater',
    name: 'Under the Sea',
    prompt: 'underwater ocean theme with bubbles, fish, seaweed, and coral',
    icon: '🐠',
  },
  {
    id: 'space',
    name: 'Space Adventure',
    prompt: 'outer space theme with stars, planets, rockets, and galaxies',
    icon: '🚀',
  },
  {
    id: 'princess',
    name: 'Princess',
    prompt: 'magical princess theme with crowns, castles, wands, and sparkles',
    icon: '👑',
  },
  {
    id: 'dinosaur',
    name: 'Dinosaurs',
    prompt: 'prehistoric dinosaur theme with friendly dinosaurs, volcanoes, and palm trees',
    icon: '🦕',
  },
  {
    id: 'sports',
    name: 'Sports',
    prompt: 'athletic sports theme with balls, trophies, medals, and stars',
    icon: '⚽',
  },
];

/**
 * Build the DALL-E prompt for frame generation
 * @param {string} userDescription - User's description of desired frame
 * @param {string} colorScheme - Color scheme ID
 * @returns {string} Complete prompt for DALL-E
 */
const buildFramePrompt = (userDescription, colorScheme = 'rainbow') => {
  const colorInfo = FRAME_COLOR_SCHEMES.find(c => c.id === colorScheme);
  const colorText = colorInfo?.hex
    ? `Primary color: ${colorInfo.name} (${colorInfo.hex}).`
    : 'Use a colorful rainbow palette.';

  return `Create a decorative video frame border for a children's thank-you video app.

Theme: ${userDescription}

Design requirements:
- The frame should be a BORDER/FRAME design that goes around the edges of the image
- The CENTER of the image MUST be completely empty/transparent - this is where the video will show through
- Portrait orientation (9:16 aspect ratio)
- Kid-friendly, colorful, playful design with rounded shapes
- Frame elements should only be on the outer edges, NOT blocking the center
- ${colorText}
- High quality, vibrant colors, no text or words
- Style: Modern vector illustration, flat design with subtle gradients
- The decorative elements should frame the empty center like a picture frame

Output: A decorative frame border with a completely empty/transparent center area.`;
};

/**
 * Generate an AI frame using DALL-E 3
 * @param {string} description - User's description or preset ID
 * @param {string} colorScheme - Color scheme ID
 * @param {string} parentId - Parent user ID
 * @returns {Promise<{success: boolean, framePath?: string, thumbnailUrl?: string, error?: string}>}
 */
export const generateAIFrame = async (description, colorScheme = 'rainbow', parentId) => {
  if (!OPENAI_API_KEY) {
    console.error('[AI_FRAME] OpenAI API key not configured');
    return { success: false, error: 'AI frame generation is not configured. Please add OPENAI_API_KEY to your environment.' };
  }

  try {
    console.log('[AI_FRAME] Starting frame generation...');
    console.log('[AI_FRAME] Description:', description);
    console.log('[AI_FRAME] Color scheme:', colorScheme);

    // Check if description is a preset ID
    const preset = FRAME_STYLE_PRESETS.find(p => p.id === description);
    const promptDescription = preset ? preset.prompt : description;

    // Build the prompt
    const prompt = buildFramePrompt(promptDescription, colorScheme);
    console.log('[AI_FRAME] Generated prompt length:', prompt.length);

    // Call OpenAI DALL-E 3 API
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1792', // Portrait
        quality: 'standard',
        response_format: 'url',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[AI_FRAME] OpenAI API error:', response.status, errorData);
      throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = data.data?.[0]?.url;

    if (!imageUrl) {
      throw new Error('No image URL returned from DALL-E');
    }

    console.log('[AI_FRAME] Image generated, downloading...');

    // Download the image
    const timestamp = Date.now();
    const localPath = `${FileSystem.cacheDirectory}ai_frame_${timestamp}.png`;

    const downloadResult = await FileSystem.downloadAsync(imageUrl, localPath);

    if (downloadResult.status !== 200) {
      throw new Error('Failed to download generated image');
    }

    console.log('[AI_FRAME] Image downloaded to:', localPath);

    // Upload to Supabase Storage
    const storagePath = `${parentId}/${timestamp}_frame.png`;

    // Read file as base64 for upload
    const base64Data = await FileSystem.readAsStringAsync(localPath, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert to bytes
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    console.log('[AI_FRAME] Uploading to Supabase Storage...');

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(AI_FRAMES_BUCKET)
      .upload(storagePath, bytes.buffer, {
        contentType: 'image/png',
        upsert: false,
      });

    if (uploadError) {
      // If bucket doesn't exist, try videos bucket as fallback
      console.warn('[AI_FRAME] Upload to ai-frames failed, trying videos bucket:', uploadError.message);

      const fallbackPath = `ai-frames/${storagePath}`;
      const { error: fallbackError } = await supabase.storage
        .from('videos')
        .upload(fallbackPath, bytes.buffer, {
          contentType: 'image/png',
          upsert: false,
        });

      if (fallbackError) {
        throw new Error(`Storage upload failed: ${fallbackError.message}`);
      }

      console.log('[AI_FRAME] Uploaded to videos bucket:', fallbackPath);

      // Clean up local file
      await FileSystem.deleteAsync(localPath, { idempotent: true });

      return {
        success: true,
        framePath: fallbackPath,
        bucket: 'videos',
        localPath: null,
      };
    }

    console.log('[AI_FRAME] Uploaded to ai-frames bucket:', storagePath);

    // Clean up local file
    await FileSystem.deleteAsync(localPath, { idempotent: true });

    return {
      success: true,
      framePath: storagePath,
      bucket: AI_FRAMES_BUCKET,
      localPath: null,
    };
  } catch (error) {
    console.error('[AI_FRAME] Error generating frame:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate AI frame',
    };
  }
};

/**
 * Get signed URL for an AI-generated frame
 * @param {string} framePath - Storage path
 * @param {string} bucket - Storage bucket name
 * @returns {Promise<string|null>}
 */
export const getFrameUrl = async (framePath, bucket = AI_FRAMES_BUCKET) => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(framePath, 86400 * 30); // 30 days

    if (error) {
      throw error;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('[AI_FRAME] Error getting frame URL:', error);
    return null;
  }
};

/**
 * Download frame to local file system for FFmpeg compositing
 * @param {string} framePath - Storage path
 * @param {string} bucket - Storage bucket
 * @returns {Promise<string|null>} Local file path or null
 */
export const downloadFrameForCompositing = async (framePath, bucket = AI_FRAMES_BUCKET) => {
  try {
    const signedUrl = await getFrameUrl(framePath, bucket);
    if (!signedUrl) {
      throw new Error('Could not get signed URL');
    }

    const localPath = `${FileSystem.cacheDirectory}frame_${Date.now()}.png`;
    const downloadResult = await FileSystem.downloadAsync(signedUrl, localPath);

    if (downloadResult.status !== 200) {
      throw new Error('Download failed');
    }

    console.log('[AI_FRAME] Frame downloaded for compositing:', localPath);
    return localPath;
  } catch (error) {
    console.error('[AI_FRAME] Error downloading frame:', error);
    return null;
  }
};

/**
 * Save AI frame as a frame template in the database
 * @param {object} params - Frame parameters
 * @returns {Promise<{success: boolean, templateId?: string, error?: string}>}
 */
export const saveAIFrameAsTemplate = async ({
  parentId,
  eventId,
  framePath,
  bucket,
  name,
  description,
  colorScheme,
  aiPrompt,
}) => {
  try {
    const { data, error } = await supabase
      .from('frame_templates')
      .insert({
        parent_id: parentId,
        event_id: eventId,
        name: name || 'AI Generated Frame',
        frame_shape: 'ai-generated',
        primary_color: FRAME_COLOR_SCHEMES.find(c => c.id === colorScheme)?.hex || '#06B6D4',
        frame_png_path: framePath,
        is_ai_generated: true,
        ai_prompt: aiPrompt || description,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log('[AI_FRAME] Frame template saved:', data.id);

    return {
      success: true,
      templateId: data.id,
      template: data,
    };
  } catch (error) {
    console.error('[AI_FRAME] Error saving frame template:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Get user's AI-generated frames
 * @param {string} parentId - Parent user ID
 * @returns {Promise<Array>}
 */
export const getUserAIFrames = async (parentId) => {
  try {
    const { data, error } = await supabase
      .from('frame_templates')
      .select('*')
      .eq('parent_id', parentId)
      .eq('is_ai_generated', true)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('[AI_FRAME] Error getting user frames:', error);
    return [];
  }
};

/**
 * Delete an AI-generated frame
 * @param {string} templateId - Frame template ID
 * @param {string} parentId - Parent user ID (for verification)
 * @returns {Promise<boolean>}
 */
export const deleteAIFrame = async (templateId, parentId) => {
  try {
    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('frame_templates')
      .update({ is_active: false })
      .eq('id', templateId)
      .eq('parent_id', parentId);

    if (error) {
      throw error;
    }

    console.log('[AI_FRAME] Frame deleted:', templateId);
    return true;
  } catch (error) {
    console.error('[AI_FRAME] Error deleting frame:', error);
    return false;
  }
};

/**
 * Check if AI frame generation is available
 * @returns {boolean}
 */
export const isAIFrameAvailable = () => {
  return !!OPENAI_API_KEY;
};

export default {
  FRAME_COLOR_SCHEMES,
  FRAME_STYLE_PRESETS,
  generateAIFrame,
  getFrameUrl,
  downloadFrameForCompositing,
  saveAIFrameAsTemplate,
  getUserAIFrames,
  deleteAIFrame,
  isAIFrameAvailable,
};
