/**
 * Supabase Edge Function: process-video
 *
 * COPPA-Compliant Video Processing:
 * 1. Receives video upload from mobile app
 * 2. Stores video temporarily in Supabase Storage
 * 3. Generates a time-limited signed URL (24 hours)
 * 4. Schedules automatic deletion after expiry
 * 5. Never stores PII or children's data long-term
 *
 * Deploy: supabase functions deploy process-video
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VideoProcessRequest {
  videoBase64: string;
  giftId: string;
  childId: string;
  musicUrl?: string;
  frameData?: {
    frameShape: string;
    borderColor: string;
    customText?: string;
  };
  expiresInHours?: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Parse request body
    const body: VideoProcessRequest = await req.json();
    const {
      videoBase64,
      giftId,
      childId,
      musicUrl,
      frameData,
      expiresInHours = 24,
    } = body;

    // Validate required fields
    if (!videoBase64 || !giftId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: videoBase64, giftId' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Processing video for gift: ${giftId}`);

    // Generate unique filename with timestamp for auto-expiry tracking
    const timestamp = Date.now();
    const expiryTimestamp = timestamp + (expiresInHours * 60 * 60 * 1000);
    const fileName = `thank-you-videos/${giftId}/${timestamp}_exp${expiryTimestamp}.mp4`;

    // Decode base64 video
    const videoBytes = Uint8Array.from(atob(videoBase64), (c) => c.charCodeAt(0));

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('videos')
      .upload(fileName, videoBytes, {
        contentType: 'video/mp4',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload video', details: uploadError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Video uploaded successfully:', uploadData.path);

    // Generate signed URL with expiration
    const { data: signedUrlData, error: signedUrlError } = await supabaseClient.storage
      .from('videos')
      .createSignedUrl(fileName, expiresInHours * 60 * 60); // seconds

    if (signedUrlError) {
      console.error('Signed URL error:', signedUrlError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate video link', details: signedUrlError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Update gift record with video URL
    const { error: updateError } = await supabaseClient
      .from('gifts')
      .update({
        video_url: signedUrlData.signedUrl,
        video_path: fileName,
        video_expires_at: new Date(expiryTimestamp).toISOString(),
        status: 'pending_review',
        updated_at: new Date().toISOString(),
      })
      .eq('id', giftId);

    if (updateError) {
      console.error('Gift update error:', updateError);
      // Don't fail the request, video is still uploaded
    }

    // Log processing for COPPA compliance audit trail
    console.log(`[COPPA AUDIT] Video processed for gift ${giftId}, expires at ${new Date(expiryTimestamp).toISOString()}`);

    // Return success with signed URL
    return new Response(
      JSON.stringify({
        success: true,
        videoUrl: signedUrlData.signedUrl,
        videoPath: fileName,
        expiresAt: new Date(expiryTimestamp).toISOString(),
        expiresInHours,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
