/**
 * Supabase Edge Function: cleanup-expired-videos
 *
 * COPPA-Compliant Automatic Cleanup:
 * - Run via cron job (daily) or triggered manually
 * - Deletes videos that have passed their expiry time
 * - Ensures no child-generated content is stored long-term
 *
 * Deploy: supabase functions deploy cleanup-expired-videos
 * Schedule: Set up a cron trigger in Supabase dashboard
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    console.log('[COPPA CLEANUP] Starting expired video cleanup...');

    // Find all gifts with expired videos
    const { data: expiredGifts, error: fetchError } = await supabaseClient
      .from('gifts')
      .select('id, video_path, video_expires_at')
      .not('video_path', 'is', null)
      .lt('video_expires_at', new Date().toISOString());

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch expired videos', details: fetchError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[COPPA CLEANUP] Found ${expiredGifts?.length || 0} expired videos`);

    let deletedCount = 0;
    let errorCount = 0;

    // Delete each expired video
    for (const gift of expiredGifts || []) {
      try {
        // Delete from storage
        const { error: deleteError } = await supabaseClient.storage
          .from('videos')
          .remove([gift.video_path]);

        if (deleteError) {
          console.error(`Failed to delete video ${gift.video_path}:`, deleteError);
          errorCount++;
          continue;
        }

        // Clear video fields from gift record
        const { error: updateError } = await supabaseClient
          .from('gifts')
          .update({
            video_url: null,
            video_path: null,
            video_expires_at: null,
            status: 'expired',
            updated_at: new Date().toISOString(),
          })
          .eq('id', gift.id);

        if (updateError) {
          console.error(`Failed to update gift ${gift.id}:`, updateError);
          errorCount++;
          continue;
        }

        deletedCount++;
        console.log(`[COPPA CLEANUP] Deleted: ${gift.video_path}`);
      } catch (err) {
        console.error(`Error processing gift ${gift.id}:`, err);
        errorCount++;
      }
    }

    console.log(`[COPPA CLEANUP] Completed. Deleted: ${deletedCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: expiredGifts?.length || 0,
        deleted: deletedCount,
        errors: errorCount,
        timestamp: new Date().toISOString(),
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
