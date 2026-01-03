// Track video view and redirect to actual video
// COPPA compliant - only records that video was viewed, no personal data

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req: Request) => {
  try {
    // Get tracking token from URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const trackingToken = pathParts[pathParts.length - 1];

    if (!trackingToken || trackingToken === "track-video-view") {
      return new Response("Missing tracking token", { status: 400 });
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Call the database function to record view and get video URL
    const { data, error } = await supabase.rpc("record_video_view", {
      p_tracking_token: trackingToken,
    });

    if (error) {
      console.error("Error recording view:", error);
      return new Response("Error processing request", { status: 500 });
    }

    if (!data || data.length === 0 || !data[0].success) {
      console.error("Video not found for token:", trackingToken);
      return new Response("Video not found", { status: 404 });
    }

    const videoUrl = data[0].video_url;

    if (!videoUrl) {
      console.error("Video URL is null for token:", trackingToken);
      return new Response("Video not available", { status: 404 });
    }

    // Redirect to actual video URL
    return new Response(null, {
      status: 302,
      headers: {
        Location: videoUrl,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error in track-video-view:", error);
    return new Response("Internal server error", { status: 500 });
  }
});
