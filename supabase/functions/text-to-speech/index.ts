import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GOOGLE_API_KEY = Deno.env.get("GOOGLE_CLOUD_API_KEY");

interface TTSRequest {
  text: string;
  voiceName?: string;  // e.g., "en-US-Neural2-C" (child-friendly female)
  speakingRate?: number;  // 0.25 to 4.0, default 1.0
  pitch?: number;  // -20.0 to 20.0, default 0
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    if (!GOOGLE_API_KEY) {
      throw new Error("GOOGLE_CLOUD_API_KEY not configured");
    }

    const payload: TTSRequest = await req.json();

    if (!payload.text) {
      throw new Error("Missing 'text' in request body");
    }

    // Default to a friendly, child-appropriate voice
    // en-US-Neural2-C is a female child-friendly voice
    // en-US-Neural2-D is a male child-friendly voice
    const voiceName = payload.voiceName || "en-US-Neural2-C";
    const speakingRate = payload.speakingRate || 0.9;  // Slightly slower for kids
    const pitch = payload.pitch || 2.0;  // Slightly higher for friendlier tone

    // Call Google Cloud TTS API
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: { text: payload.text },
          voice: {
            languageCode: "en-US",
            name: voiceName,
          },
          audioConfig: {
            audioEncoding: "MP3",
            speakingRate: speakingRate,
            pitch: pitch,
            effectsProfileId: ["small-bluetooth-speaker-class-device"],  // Optimized for mobile
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google TTS API error:", errorText);
      throw new Error(`Google TTS API error: ${response.status}`);
    }

    const data = await response.json();

    // Return the base64-encoded audio
    return new Response(
      JSON.stringify({
        audioContent: data.audioContent,  // Base64 encoded MP3
        contentType: "audio/mpeg",
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("TTS Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "TTS failed" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
