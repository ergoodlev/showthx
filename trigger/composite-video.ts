import { task, logger } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const execAsync = promisify(exec);

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CompositingJobPayload {
  jobId: string;
  videoPath: string;
  framePngPath?: string;
  customText?: string;
  customTextPosition?: "top" | "center" | "bottom";
  customTextColor?: string;
  stickers?: Array<{
    emoji: string;
    x: number;
    y: number;
    scale?: number;
  }>;
  filterId?: string;
}

// Video filter mappings (matching videoFilterService.js)
const FILTER_COMMANDS: Record<string, string> = {
  none: "",
  noir: "colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3",
  chrome: "eq=saturation=1.4:contrast=1.1",
  fade: "curves=vintage",
  instant: "colortemperature=6500,eq=saturation=0.8",
  process: "colortemperature=8000",
  transfer: "colortemperature=5000,eq=saturation=1.1",
  sepia: "colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131",
  vivid: "eq=saturation=1.5:contrast=1.1:brightness=0.05",
  cool: "colortemperature=9000,eq=saturation=0.9",
  warm: "colortemperature=4500,eq=saturation=1.1",
};

export const compositeVideoTask = task({
  id: "composite-video",
  machine: {
    preset: "medium-2x",  // 2 vCPU, 4 GB RAM - needed for FFmpeg video processing
  },
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: CompositingJobPayload) => {
    const {
      jobId,
      videoPath,
      framePngPath,
      customText,
      customTextPosition = "bottom",
      customTextColor = "#FFFFFF",
      stickers = [],
      filterId,
    } = payload;

    // Validate environment variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    logger.info("Starting video compositing", {
      jobId,
      videoPath,
      framePngPath,
      hasSupabaseUrl: !!supabaseUrl,
      supabaseUrlPrefix: supabaseUrl?.substring(0, 30),
      hasServiceKey: !!supabaseKey,
      serviceKeyPrefix: supabaseKey?.substring(0, 20),
    });

    // Update job status to processing
    await supabase
      .from("video_compositing_jobs")
      .update({ status: "processing", started_at: new Date().toISOString() })
      .eq("id", jobId);

    // Clean up video path - remove bucket prefix or full URL if present
    let cleanVideoPath = videoPath;

    // Handle various path formats:
    // 1. Full URL: https://xxx.supabase.co/storage/v1/object/public/videos/path/file.mp4
    // 2. Bucket prefix: videos/path/file.mp4
    // 3. Just the path: path/file.mp4

    if (videoPath.includes("supabase.co/storage")) {
      // Extract path from full URL - handle both /public/ and /authenticated/ patterns
      const match = videoPath.match(/\/(?:public|authenticated)\/videos\/(.+)$/);
      if (match) {
        cleanVideoPath = match[1];
        logger.info("Extracted path from full URL", { extracted: cleanVideoPath });
      } else {
        // Try alternate pattern
        const altMatch = videoPath.match(/\/videos\/(.+)$/);
        if (altMatch) {
          cleanVideoPath = altMatch[1];
          logger.info("Extracted path from URL (alt pattern)", { extracted: cleanVideoPath });
        }
      }
    } else if (videoPath.startsWith("videos/")) {
      // Remove bucket prefix if included in path
      cleanVideoPath = videoPath.replace(/^videos\//, "");
      logger.info("Removed videos/ prefix", { cleaned: cleanVideoPath });
    }

    // Also handle any URL encoding
    cleanVideoPath = decodeURIComponent(cleanVideoPath);

    logger.info("Final video path for download", { original: videoPath, cleaned: cleanVideoPath });

    const tempDir = path.join(os.tmpdir(), `composite-${jobId}`);
    await fs.promises.mkdir(tempDir, { recursive: true });

    try {
      // 1. Download video from Supabase Storage
      logger.info("Downloading video...", { path: cleanVideoPath });
      const videoLocalPath = path.join(tempDir, "input.mp4");

      const { data: videoData, error: videoError } = await supabase.storage
        .from("videos")
        .download(cleanVideoPath);

      if (videoError) {
        logger.error("Video download error details", {
          error: videoError,
          errorStr: String(videoError),
          errorJSON: JSON.stringify(videoError),
          message: videoError?.message,
          name: (videoError as any)?.name,
          statusCode: (videoError as any)?.statusCode,
        });
        throw new Error(`Failed to download video from path "${cleanVideoPath}": ${JSON.stringify(videoError)}`);
      }

      if (!videoData) {
        throw new Error(`Video download returned no data for path "${cleanVideoPath}"`);
      }

      const videoBuffer = Buffer.from(await videoData.arrayBuffer());
      await fs.promises.writeFile(videoLocalPath, videoBuffer);
      logger.info("Video downloaded", { size: videoBuffer.length });

      // 2. Download frame PNG if provided
      let frameLocalPath: string | null = null;
      if (framePngPath) {
        logger.info("Downloading frame PNG...");
        frameLocalPath = path.join(tempDir, "frame.png");

        // Try different buckets
        let frameData;
        let frameError;

        if (framePngPath.startsWith("preset-frames/")) {
          // Preset frames are stored in ai-frames bucket
          const result = await supabase.storage.from("ai-frames").download(framePngPath);
          frameData = result.data;
          frameError = result.error;
        } else {
          // Try ai-frames bucket first
          let result = await supabase.storage.from("ai-frames").download(framePngPath);
          if (result.error) {
            // Try videos bucket as fallback
            result = await supabase.storage.from("videos").download(`ai-frames/${framePngPath}`);
          }
          frameData = result.data;
          frameError = result.error;
        }

        if (frameError) {
          logger.warn("Failed to download frame, continuing without", { error: frameError.message });
          frameLocalPath = null;
        } else if (frameData) {
          const frameBuffer = Buffer.from(await frameData.arrayBuffer());
          await fs.promises.writeFile(frameLocalPath, frameBuffer);
          logger.info("Frame downloaded", { size: frameBuffer.length });
        }
      }

      // 3. Build FFmpeg command
      const outputPath = path.join(tempDir, "output.mp4");
      const ffmpegFilters: string[] = [];

      // Apply video filter if specified
      if (filterId && FILTER_COMMANDS[filterId]) {
        ffmpegFilters.push(FILTER_COMMANDS[filterId]);
      }

      // Build the FFmpeg command
      let ffmpegCmd = `ffmpeg -y -i "${videoLocalPath}"`;

      // Add frame overlay if available
      if (frameLocalPath) {
        ffmpegCmd += ` -i "${frameLocalPath}"`;
      }

      // Build filter complex
      const filterComplexParts: string[] = [];
      let currentStream = "[0:v]";

      // Scale video to standard size
      filterComplexParts.push(`${currentStream}scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2[scaled]`);
      currentStream = "[scaled]";

      // Apply color filter if specified
      if (filterId && FILTER_COMMANDS[filterId]) {
        filterComplexParts.push(`${currentStream}${FILTER_COMMANDS[filterId]}[filtered]`);
        currentStream = "[filtered]";
      }

      // Overlay frame if available
      if (frameLocalPath) {
        filterComplexParts.push(`[1:v]scale=1080:1920[frame]`);
        filterComplexParts.push(`${currentStream}[frame]overlay=0:0[framed]`);
        currentStream = "[framed]";
      }

      // Add custom text if provided
      if (customText && customText.trim()) {
        const escapedText = customText
          .replace(/\\/g, "\\\\")
          .replace(/'/g, "'\\''")
          .replace(/:/g, "\\:")
          .replace(/\[/g, "\\[")
          .replace(/\]/g, "\\]");

        let textY: string;
        switch (customTextPosition) {
          case "top":
            textY = "20";
            break;
          case "center":
            textY = "(h-text_h)/2";
            break;
          case "bottom":
          default:
            textY = "h-text_h-70";
            break;
        }

        const hexColor = customTextColor.replace("#", "");
        filterComplexParts.push(
          `${currentStream}drawtext=text='${escapedText}':fontsize=32:fontcolor=0x${hexColor}:x=(w-text_w)/2:y=${textY}:box=1:boxcolor=black@0.5:boxborderw=10[texted]`
        );
        currentStream = "[texted]";
      }

      // Add sticker overlays (as emoji text)
      stickers.forEach((sticker, i) => {
        const { emoji, x, y, scale = 1 } = sticker;
        const pixelX = Math.round((x / 100) * 1080);
        const pixelY = Math.round((y / 100) * 1920);
        const fontSize = Math.round(40 * scale);
        const escapedEmoji = emoji.replace(/'/g, "'\\''");

        filterComplexParts.push(
          `${currentStream}drawtext=text='${escapedEmoji}':fontsize=${fontSize}:x=${pixelX}:y=${pixelY}[sticker${i}]`
        );
        currentStream = `[sticker${i}]`;
      });

      // Build final command
      if (filterComplexParts.length > 0) {
        const filterComplex = filterComplexParts.join(";");
        // Remove the stream label from the last filter
        const lastLabel = currentStream.replace(/\[|\]/g, "");
        ffmpegCmd += ` -filter_complex "${filterComplex}" -map "[${lastLabel}]" -map 0:a?`;
      }

      ffmpegCmd += ` -c:v libx264 -preset veryfast -crf 25 -threads 0 -c:a aac -movflags +faststart "${outputPath}"`;

      logger.info("Running FFmpeg", { command: ffmpegCmd });

      const { stdout, stderr } = await execAsync(ffmpegCmd, {
        maxBuffer: 50 * 1024 * 1024 // 50MB buffer
      });

      logger.info("FFmpeg completed", { stdout: stdout.slice(0, 500) });

      // 4. Upload result to Supabase Storage
      logger.info("Uploading composited video...");
      const outputBuffer = await fs.promises.readFile(outputPath);
      const outputStoragePath = `composited/${jobId}.mp4`;

      const { error: uploadError } = await supabase.storage
        .from("videos")
        .upload(outputStoragePath, outputBuffer, {
          contentType: "video/mp4",
          upsert: true,
        });

      if (uploadError) throw new Error(`Failed to upload: ${uploadError.message}`);

      logger.info("Upload complete", { outputStoragePath });

      // 5. Update job as completed
      await supabase
        .from("video_compositing_jobs")
        .update({
          status: "completed",
          output_path: outputStoragePath,
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      // 6. Fetch recipient info and auto-send email
      logger.info("Checking for recipient info to auto-send...");
      const { data: jobData, error: jobFetchError } = await supabase
        .from("video_compositing_jobs")
        .select("recipient_email, recipient_name, send_method, email_subject, email_body, child_name, gift_name, event_name")
        .eq("id", jobId)
        .single();

      if (jobFetchError) {
        logger.warn("Failed to fetch job data for auto-send", { error: jobFetchError.message });
      } else if (jobData?.recipient_email && jobData.send_method === 'email') {
        logger.info("Auto-sending email to recipient", {
          recipient: jobData.recipient_email,
          recipientName: jobData.recipient_name
        });

        try {
          // Generate a signed URL for the composited video (7 day expiration for COPPA compliance)
          const { data: signedUrlData, error: signedUrlError } = await supabase.storage
            .from("videos")
            .createSignedUrl(outputStoragePath, 60 * 60 * 24 * 7); // 7 days in seconds

          if (signedUrlError || !signedUrlData?.signedUrl) {
            throw new Error(`Failed to create signed URL: ${signedUrlError?.message || 'No URL returned'}`);
          }

          const videoUrl = signedUrlData.signedUrl;
          logger.info("Generated signed URL for video", { expiresIn: "7 days" });

          // Call the send-video-email Edge Function
          const response = await fetch(
            `${process.env.SUPABASE_URL}/functions/v1/send-video-email`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              },
              body: JSON.stringify({
                jobId,
                videoUrl: videoUrl,
                recipientEmail: jobData.recipient_email,
                recipientName: jobData.recipient_name,
                emailSubject: jobData.email_subject,
                emailBody: jobData.email_body,
                childName: jobData.child_name,
                giftName: jobData.gift_name,
                eventName: jobData.event_name,
              }),
            }
          );

          if (response.ok) {
            logger.info("Email sent successfully");
            // Update job status to 'sent'
            await supabase
              .from("video_compositing_jobs")
              .update({ status: "sent" })
              .eq("id", jobId);
          } else {
            const errorText = await response.text();
            logger.error("Failed to send email", { status: response.status, error: errorText });
            // Keep status as 'completed' so user can see it succeeded but email failed
          }
        } catch (emailError) {
          logger.error("Error sending email", { error: String(emailError) });
          // Keep status as 'completed' - compositing worked, just email failed
        }
      } else {
        logger.info("No auto-send configured for this job", {
          hasEmail: !!jobData?.recipient_email,
          sendMethod: jobData?.send_method
        });
      }

      // 7. Cleanup temp files
      await fs.promises.rm(tempDir, { recursive: true, force: true });

      return { success: true, outputPath: outputStoragePath };
    } catch (error) {
      logger.error("Compositing failed", { error: String(error) });

      // Update job as failed
      await supabase
        .from("video_compositing_jobs")
        .update({
          status: "failed",
          error_message: String(error),
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      // Cleanup temp files
      try {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
      } catch {}

      throw error;
    }
  },
});
