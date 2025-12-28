// Supabase Edge Function to trigger video compositing via Trigger.dev
// This function is called via database webhook when a new compositing job is inserted

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TRIGGER_SECRET_KEY = Deno.env.get("TRIGGER_API_KEY") || Deno.env.get("TRIGGER_SECRET_KEY");

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: {
    id: string;
    video_path: string;
    frame_png_path?: string;
    custom_text?: string;
    custom_text_position?: string;
    custom_text_color?: string;
    stickers?: unknown;
    filter_id?: string;
    status: string;
  };
  old_record?: unknown;
}

serve(async (req: Request) => {
  try {
    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload: WebhookPayload = await req.json();
    console.log("Received webhook:", JSON.stringify(payload, null, 2));

    // Only process INSERT events for pending jobs
    if (payload.type !== "INSERT" || payload.record.status !== "pending") {
      return new Response(JSON.stringify({ message: "Skipped - not a new pending job" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const job = payload.record;

    // Trigger the Trigger.dev task
    // v3 API format: POST /api/v1/tasks/{taskId}/trigger
    // Authorization: Bearer <secret_key>
    console.log("Triggering Trigger.dev task with key:", TRIGGER_SECRET_KEY?.substring(0, 10) + "...");
    const triggerResponse = await fetch(
      `https://api.trigger.dev/api/v1/tasks/composite-video/trigger`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${TRIGGER_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payload: {
            jobId: job.id,
            videoPath: job.video_path,
            framePngPath: job.frame_png_path,
            customText: job.custom_text,
            customTextPosition: job.custom_text_position || "bottom",
            customTextColor: job.custom_text_color || "#FFFFFF",
            stickers: job.stickers || [],
            filterId: job.filter_id,
          },
        }),
      }
    );

    if (!triggerResponse.ok) {
      const errorText = await triggerResponse.text();
      console.error("Trigger.dev error:", {
        status: triggerResponse.status,
        statusText: triggerResponse.statusText,
        body: errorText,
      });
      throw new Error(`Trigger.dev API error: ${triggerResponse.status} - ${errorText}`);
    }

    const triggerResult = await triggerResponse.json();
    console.log("Trigger.dev task started:", triggerResult);

    return new Response(
      JSON.stringify({
        success: true,
        taskId: triggerResult.id,
        jobId: job.id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
