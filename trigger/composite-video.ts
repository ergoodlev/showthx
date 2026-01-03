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
  // Frame style properties for non-AI frames (when no PNG exists)
  frameShape?: string;
  primaryColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  customText?: string;
  customTextPosition?: "top" | "center" | "bottom";
  customTextColor?: string;
  stickers?: Array<{
    emoji: string;
    pngFile?: string;  // Direct PNG filename (e.g., "fluent-balloon.png")
    x: number;
    y: number;
    scale?: number;
  }>;
  filterId?: string;
}

// FFmpeg border commands for non-AI frame shapes
const FRAME_SHAPE_COMMANDS: Record<string, (color: string, width: number) => string> = {
  // Bold classic - thick solid border
  "bold-classic": (color, width) => `drawbox=x=0:y=0:w=${width}:h=ih:color=${color}:t=fill,drawbox=x=iw-${width}:y=0:w=${width}:h=ih:color=${color}:t=fill,drawbox=x=0:y=0:w=iw:h=${width}:color=${color}:t=fill,drawbox=x=0:y=ih-${width}:w=iw:h=${width}:color=${color}:t=fill`,
  // Rounded thick - same as bold but will have rounded corners in preview (FFmpeg can't do rounded easily)
  "rounded-thick": (color, width) => `drawbox=x=0:y=0:w=${width}:h=ih:color=${color}:t=fill,drawbox=x=iw-${width}:y=0:w=${width}:h=ih:color=${color}:t=fill,drawbox=x=0:y=0:w=iw:h=${width}:color=${color}:t=fill,drawbox=x=0:y=ih-${width}:w=iw:h=${width}:color=${color}:t=fill`,
  // Neon glow - glowing effect with blur
  "neon-glow": (color, width) => `drawbox=x=0:y=0:w=${width}:h=ih:color=${color}:t=fill,drawbox=x=iw-${width}:y=0:w=${width}:h=ih:color=${color}:t=fill,drawbox=x=0:y=0:w=iw:h=${width}:color=${color}:t=fill,drawbox=x=0:y=ih-${width}:w=iw:h=${width}:color=${color}:t=fill`,
  // Double line - two borders
  "double-line": (color, width) => {
    const inner = Math.floor(width * 0.6);
    const gap = Math.floor(width * 0.2);
    const outer = inner + gap + 4;
    return `drawbox=x=0:y=0:w=${outer}:h=ih:color=${color}:t=fill,drawbox=x=iw-${outer}:y=0:w=${outer}:h=ih:color=${color}:t=fill,drawbox=x=0:y=0:w=iw:h=${outer}:color=${color}:t=fill,drawbox=x=0:y=ih-${outer}:w=iw:h=${outer}:color=${color}:t=fill,drawbox=x=${gap}:y=${gap}:w=${inner}:h=ih-${gap}*2:color=black@0.3:t=fill,drawbox=x=iw-${gap}-${inner}:y=${gap}:w=${inner}:h=ih-${gap}*2:color=black@0.3:t=fill`;
  },
  // Scalloped - simple border (can't do scallops in FFmpeg easily)
  "scalloped-edge": (color, width) => `drawbox=x=0:y=0:w=${width}:h=ih:color=${color}:t=fill,drawbox=x=iw-${width}:y=0:w=${width}:h=ih:color=${color}:t=fill,drawbox=x=0:y=0:w=iw:h=${width}:color=${color}:t=fill,drawbox=x=0:y=ih-${width}:w=iw:h=${width}:color=${color}:t=fill`,
  // Dashed - simple border (can't do dashes in FFmpeg easily)
  "dashed-fun": (color, width) => `drawbox=x=0:y=0:w=${width}:h=ih:color=${color}:t=fill,drawbox=x=iw-${width}:y=0:w=${width}:h=ih:color=${color}:t=fill,drawbox=x=0:y=0:w=iw:h=${width}:color=${color}:t=fill,drawbox=x=0:y=ih-${width}:w=iw:h=${width}:color=${color}:t=fill`,
  // Gradient - simple border (gradient not possible without complex filter)
  "gradient-glow": (color, width) => `drawbox=x=0:y=0:w=${width}:h=ih:color=${color}:t=fill,drawbox=x=iw-${width}:y=0:w=${width}:h=ih:color=${color}:t=fill,drawbox=x=0:y=0:w=iw:h=${width}:color=${color}:t=fill,drawbox=x=0:y=ih-${width}:w=iw:h=${width}:color=${color}:t=fill`,
  // AI-generated frame - decorative double border (since DALL-E PNGs have no transparency)
  // We create a fancy double-border effect to represent the AI frame visually
  "ai-generated": (color, width) => {
    const outer = Math.max(width, 20);
    const inner = Math.floor(outer * 0.5);
    const gap = Math.floor(outer * 0.3);
    return `drawbox=x=0:y=0:w=${outer}:h=ih:color=${color}:t=fill,drawbox=x=iw-${outer}:y=0:w=${outer}:h=ih:color=${color}:t=fill,drawbox=x=0:y=0:w=iw:h=${outer}:color=${color}:t=fill,drawbox=x=0:y=ih-${outer}:w=iw:h=${outer}:color=${color}:t=fill,drawbox=x=${gap}:y=${gap}:w=${inner}:h=ih-${gap}*2:color=black@0.2:t=fill,drawbox=x=iw-${gap}-${inner}:y=${gap}:w=${inner}:h=ih-${gap}*2:color=black@0.2:t=fill,drawbox=x=${gap}:y=${gap}:w=iw-${gap}*2:h=${inner}:color=black@0.2:t=fill,drawbox=x=${gap}:y=ih-${gap}-${inner}:w=iw-${gap}*2:h=${inner}:color=black@0.2:t=fill`;
  },
};

// Video filter mappings - must match IDs in videoFilterService.js exactly
// These are applied via FFmpeg during server-side compositing
const FILTER_COMMANDS: Record<string, string> = {
  // No filter
  none: "",

  // === COLOR FILTERS (from videoFilterService.js) ===
  warm: "colortemperature=8000",
  cool: "colortemperature=4000",
  vintage: "eq=saturation=0.7:brightness=0.05:contrast=1.1,colorbalance=rs=0.1:gs=-0.05:bs=-0.1",
  sepia: "colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131",
  bw: "hue=s=0,eq=contrast=1.2",

  // === EFFECT FILTERS (from videoFilterService.js) ===
  vignette: "vignette=PI/4",
  bright: "eq=brightness=0.15:gamma=1.1",
  vivid: "eq=saturation=1.5",
  pop: "eq=contrast=1.3:saturation=1.2",

  // === FUN FILTERS (from videoFilterService.js) ===
  dreamy: "gblur=sigma=1.5,eq=brightness=0.08:saturation=0.9",
  pixel: "scale=iw/8:ih/8,scale=iw*8:ih*8:flags=neighbor",
  blur: "gblur=sigma=3",

  // === CREATIVE FILTERS (iOS-inspired approximations) ===
  // Comic book / cartoon effect - edge detection + posterization
  comic: "edgedetect=low=0.1:high=0.3,negate,eq=contrast=2:brightness=0.1",

  // Cartoon/Toon effect - smoother with bold colors
  cartoon: "hue=s=2,eq=saturation=1.8:contrast=1.4,unsharp=5:5:1.5",

  // Sketch/pencil drawing effect
  sketch: "edgedetect=low=0.1:high=0.4,negate",

  // Noir/Film noir - high contrast B&W
  noir: "hue=s=0,eq=contrast=1.5:brightness=-0.05,curves=m=0/0 0.25/0.15 0.5/0.5 0.75/0.85 1/1",

  // Thermal/heat vision approximation
  thermal: "colorchannelmixer=rr=0:rg=0:rb=1:ra=0:gr=0:gg=1:gb=0:ga=0:br=1:bg=0:bb=0:ba=0,eq=saturation=2:contrast=1.3",

  // X-ray effect approximation
  xray: "negate,hue=s=0,eq=contrast=1.3:brightness=0.1",

  // Posterize - reduce colors
  posterize: "eq=saturation=1.5,hue=s=1.3,format=rgb24,split[a][b];[a]palettegen=max_colors=8[p];[b][p]paletteuse",

  // Glitch effect - color shift + slight distortion
  glitch: "rgbashift=rh=-5:gh=3:bh=5,eq=saturation=1.2,noise=alls=20:allf=t",

  // Retro VHS effect
  vhs: "curves=vintage,noise=alls=30:allf=t,eq=saturation=0.8:contrast=1.1,vignette=PI/3",

  // Sunset glow
  sunset: "colortemperature=3500,eq=saturation=1.3:brightness=0.05,vignette=PI/5",

  // Neon glow effect
  neon: "eq=saturation=2.5:contrast=1.4:brightness=0.1,unsharp=5:5:2",

  // Film grain
  filmgrain: "noise=alls=25:allf=t,eq=saturation=0.9:contrast=1.1",

  // === LEGACY IDs (for backwards compatibility) ===
  chrome: "eq=saturation=1.4:contrast=1.1",
  fade: "curves=vintage",
  instant: "colortemperature=6500,eq=saturation=0.8",
  process: "colortemperature=8000",
  transfer: "colortemperature=5000,eq=saturation=1.1",
};

// Emoji to PNG filename mapping (stored in Supabase stickers bucket)
// Legacy emoji to PNG mapping - used as fallback if pngFile not provided
// New stickers use Fluent 3D with fluent-{id}.png format
const EMOJI_TO_PNG: Record<string, string> = {
  // Party
  "🎈": "fluent-balloon.png",
  "🎊": "fluent-confetti.png",
  "🎁": "fluent-gift.png",
  "🎂": "fluent-cake.png",
  "🎉": "fluent-party-popper.png",
  "🧁": "fluent-cupcake.png",
  "🍬": "fluent-candy.png",
  "🍭": "fluent-lollipop.png",
  "🎀": "fluent-ribbon.png",
  // Faces
  "😊": "fluent-smile.png",
  "😍": "fluent-heart-eyes.png",
  "🤩": "fluent-star-eyes.png",
  "😀": "fluent-grin.png",
  "😂": "fluent-joy.png",
  "☺️": "fluent-blush.png",
  "😉": "fluent-wink.png",
  "🤗": "fluent-hug.png",
  // Hearts
  "❤️": "fluent-red-heart.png",
  "❤": "fluent-red-heart.png",
  "💖": "fluent-sparkling-heart.png",
  "💝": "fluent-heart-ribbon.png",
  "💗": "fluent-growing-heart.png",
  "💕": "fluent-two-hearts.png",
  "💟": "fluent-heart-decoration.png",
  "🩷": "fluent-pink-heart.png",
  "🧡": "fluent-orange-heart.png",
  // Stars
  "🌟": "fluent-glowing-star.png",
  "⭐": "fluent-star.png",
  "✨": "fluent-sparkles.png",
  "💫": "fluent-dizzy.png",
  "💥": "fluent-collision.png",
  "🔥": "fluent-fire.png",
  // Nature
  "🌈": "fluent-rainbow.png",
  "🌞": "fluent-sun.png",
  "🌻": "fluent-sunflower.png",
  "🌷": "fluent-tulip.png",
  "🍀": "fluent-four-leaf-clover.png",
  "🦋": "fluent-butterfly.png",
  "🦄": "fluent-unicorn.png",
  "👑": "fluent-crown.png",
  // Animals
  "😻": "fluent-cat-heart.png",
  "🐶": "fluent-dog.png",
  "🐻": "fluent-bear.png",
  "🐰": "fluent-bunny.png",
  "🐼": "fluent-panda.png",
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
      frameShape,
      primaryColor = "#06B6D4",
      borderWidth = 20,
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
      frameShape,
      primaryColor,
      borderWidth,
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
      const isAIFrame = frameShape === 'ai-generated';

      // For AI frames: Download PNG and use FFmpeg colorkey to make black center transparent
      // For regular frames with PNG: Use directly as overlay
      // For frames without PNG: Use FFmpeg drawbox

      if (framePngPath) {
        logger.info("=== FRAME DOWNLOAD START ===", {
          framePngPath,
          frameShape,
          isAIFrame,
          startsWithPreset: framePngPath.startsWith("preset-frames/")
        });
        frameLocalPath = path.join(tempDir, "frame.png");

        // Try different buckets based on path prefix
        let frameData;
        let frameError;

        if (framePngPath.startsWith("preset-frames/")) {
          // Preset frames are stored in ai-frames bucket
          logger.info("Downloading from ai-frames bucket (preset path)", {
            bucket: "ai-frames",
            path: framePngPath
          });
          const result = await supabase.storage.from("ai-frames").download(framePngPath);
          frameData = result.data;
          frameError = result.error;
          logger.info("Download result", {
            hasData: !!result.data,
            hasError: !!result.error,
            errorMessage: result.error?.message || "none"
          });
        } else {
          // Try ai-frames bucket first
          logger.info("Trying ai-frames bucket first (non-preset path)", {
            bucket: "ai-frames",
            path: framePngPath
          });
          let result = await supabase.storage.from("ai-frames").download(framePngPath);
          if (result.error) {
            // Try videos bucket as fallback
            logger.info("ai-frames bucket failed, trying videos bucket", {
              error: result.error.message,
              fallbackPath: `ai-frames/${framePngPath}`
            });
            result = await supabase.storage.from("videos").download(`ai-frames/${framePngPath}`);
          }
          frameData = result.data;
          frameError = result.error;
          logger.info("Download result", {
            hasData: !!result.data,
            hasError: !!result.error,
            errorMessage: result.error?.message || "none"
          });
        }

        if (frameError) {
          logger.error("=== FRAME DOWNLOAD FAILED ===", {
            error: frameError.message,
            framePngPath,
            errorDetails: JSON.stringify(frameError),
          });
          frameLocalPath = null;
        } else if (frameData) {
          const frameBuffer = Buffer.from(await frameData.arrayBuffer());
          await fs.promises.writeFile(frameLocalPath, frameBuffer);
          logger.info("=== FRAME DOWNLOAD SUCCESS ===", {
            size: frameBuffer.length,
            sizeKB: Math.round(frameBuffer.length / 1024),
            path: frameLocalPath,
            isAIFrame,
            willApplyColorkey: isAIFrame
          });
        } else {
          logger.warn("=== FRAME DOWNLOAD NO DATA ===", { framePngPath });
          frameLocalPath = null;
        }
      } else {
        logger.info("=== NO FRAME PNG PATH ===", {
          framePngPath: "null/undefined",
          frameShape,
          willUseFallback: !!(frameShape && FRAME_SHAPE_COMMANDS[frameShape])
        });
      }

      // 2b. Download sticker PNGs if any stickers are provided
      const stickerLocalPaths: Array<{ path: string; x: number; y: number; scale: number }> = [];
      if (stickers && stickers.length > 0) {
        logger.info("=== STICKERS TO PROCESS ===", {
          count: stickers.length,
          stickers: stickers.map((s, i) => ({
            index: i,
            emoji: s.emoji,
            pngFile: s.pngFile,
            x: s.x,
            y: s.y,
            scale: s.scale,
          })),
        });

        for (let i = 0; i < stickers.length; i++) {
          const sticker = stickers[i];
          // Use pngFile directly if provided, otherwise fall back to emoji lookup
          const pngFilename = sticker.pngFile || EMOJI_TO_PNG[sticker.emoji];

          if (!pngFilename) {
            logger.warn("No PNG mapping for sticker, skipping", {
              emoji: sticker.emoji,
              pngFile: sticker.pngFile
            });
            continue;
          }

          try {
            logger.info("Downloading sticker from Supabase", {
              emoji: sticker.emoji,
              pngFile: sticker.pngFile,
              filename: pngFilename,
              bucket: "stickers",
            });

            const { data: stickerData, error: stickerError } = await supabase.storage
              .from("stickers")
              .download(pngFilename);

            if (stickerError) {
              logger.error("Sticker download error", {
                emoji: sticker.emoji,
                filename: pngFilename,
                errorMessage: stickerError.message,
                errorName: (stickerError as any).name,
                errorDetails: JSON.stringify(stickerError),
              });
              continue;
            }

            if (!stickerData) {
              logger.warn("Sticker download returned no data", {
                emoji: sticker.emoji,
                filename: pngFilename,
              });
              continue;
            }

            const stickerLocalPath = path.join(tempDir, `sticker_${i}.png`);
            const stickerBuffer = Buffer.from(await stickerData.arrayBuffer());

            // Validate PNG file has reasonable size
            if (stickerBuffer.length < 100) {
              logger.warn("Sticker file suspiciously small, skipping", {
                emoji: sticker.emoji,
                filename: pngFilename,
                size: stickerBuffer.length,
              });
              continue;
            }

            await fs.promises.writeFile(stickerLocalPath, stickerBuffer);

            stickerLocalPaths.push({
              path: stickerLocalPath,
              x: sticker.x,
              y: sticker.y,
              scale: sticker.scale || 1,
            });

            logger.info("Sticker downloaded successfully", {
              emoji: sticker.emoji,
              filename: pngFilename,
              size: stickerBuffer.length,
              localPath: stickerLocalPath,
            });
          } catch (err) {
            logger.error("Exception downloading sticker", {
              emoji: sticker.emoji,
              pngFile: sticker.pngFile,
              filename: pngFilename,
              error: String(err),
              stack: (err as any).stack,
            });
          }
        }

        logger.info("Sticker downloads complete", { downloaded: stickerLocalPaths.length, requested: stickers.length });
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

      // Add sticker PNG inputs
      for (const stickerInfo of stickerLocalPaths) {
        ffmpegCmd += ` -i "${stickerInfo.path}"`;
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

      // Overlay frame if available (PNG frame)
      logger.info("=== FRAME OVERLAY DECISION ===", {
        hasFrameLocalPath: !!frameLocalPath,
        frameLocalPath: frameLocalPath || "null",
        isAIFrame,
        frameShape: frameShape || "null",
        hasFrameShapeCommand: !!(frameShape && FRAME_SHAPE_COMMANDS[frameShape])
      });

      if (frameLocalPath) {
        if (isAIFrame) {
          // AI frames: Use colorkey to make black center transparent before overlay
          // The prompt instructs DALL-E to create frames with pure black (#000000) centers
          // colorkey filter: colorkey=color:similarity:blend
          // - color: the color to make transparent (black)
          // - similarity: 0.1 means colors within 10% of black are affected
          // - blend: 0.1 adds slight feathering for smoother edges
          logger.info("=== APPLYING AI FRAME (colorkey) ===", { frameLocalPath });
          filterComplexParts.push(`[1:v]colorkey=black:0.1:0.1,scale=1080:1920[frame]`);
          filterComplexParts.push(`${currentStream}[frame]overlay=0:0[framed]`);
          currentStream = "[framed]";
        } else {
          // Regular PNG frame with existing transparency
          logger.info("=== APPLYING PNG FRAME OVERLAY ===", { frameLocalPath });
          filterComplexParts.push(`[1:v]scale=1080:1920[frame]`);
          filterComplexParts.push(`${currentStream}[frame]overlay=0:0[framed]`);
          currentStream = "[framed]";
        }
      } else if (frameShape && FRAME_SHAPE_COMMANDS[frameShape]) {
        // Draw border using FFmpeg drawbox for frames without PNG
        // This works for both preset frames (when PNG capture fails) and non-AI frames
        const colorHex = primaryColor.replace("#", "0x");
        const borderCmd = FRAME_SHAPE_COMMANDS[frameShape](colorHex, borderWidth);
        logger.info("=== APPLYING FFMPEG DRAWBOX FALLBACK ===", {
          frameShape,
          primaryColor,
          colorHex,
          borderWidth,
          command: borderCmd.substring(0, 150) + "...",
        });
        filterComplexParts.push(`${currentStream}${borderCmd}[framed]`);
        currentStream = "[framed]";
      } else if (frameShape) {
        // frameShape exists but no command found - log warning and skip
        logger.warn("=== FRAME SHAPE NOT SUPPORTED ===", {
          frameShape,
          availableShapes: Object.keys(FRAME_SHAPE_COMMANDS),
        });
      } else {
        logger.info("=== NO FRAME TO APPLY ===", {
          reason: "No PNG downloaded and no frameShape provided"
        });
      }

      // Add custom text if provided
      if (customText && customText.trim()) {
        // Text wrapping and sizing logic
        // Video is 1080px wide, leave 80px padding on each side = 920px usable width
        // At 72px font, roughly 0.5 chars per pixel = ~18 chars per line
        // Scale down font for longer text, minimum 48px
        const maxWidth = 920;
        const baseFontSize = 72;
        const minFontSize = 48;
        const charsPerPixelRatio = 0.6; // Approximate for sans-serif

        // Calculate characters per line at base font size
        const charsPerLine = Math.floor(maxWidth / (baseFontSize * charsPerPixelRatio));

        // Word-wrap the text
        const words = customText.trim().split(/\s+/);
        const lines: string[] = [];
        let currentLine = "";

        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          if (testLine.length <= charsPerLine) {
            currentLine = testLine;
          } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
          }
        }
        if (currentLine) lines.push(currentLine);

        // Calculate font size - reduce if too many lines
        // Max height for text: 1/4 of video = 480px
        // Each line at 72px needs ~90px height (with line spacing)
        const maxLines = Math.floor(480 / 90); // ~5 lines max at 72px
        let fontSize = baseFontSize;

        if (lines.length > maxLines) {
          // Scale down font to fit
          const scaleFactor = maxLines / lines.length;
          fontSize = Math.max(minFontSize, Math.floor(baseFontSize * scaleFactor));

          // Re-wrap at new font size if significantly smaller
          if (fontSize < baseFontSize * 0.8) {
            const newCharsPerLine = Math.floor(maxWidth / (fontSize * charsPerPixelRatio));
            lines.length = 0;
            currentLine = "";
            for (const word of words) {
              const testLine = currentLine ? `${currentLine} ${word}` : word;
              if (testLine.length <= newCharsPerLine) {
                currentLine = testLine;
              } else {
                if (currentLine) lines.push(currentLine);
                currentLine = word;
              }
            }
            if (currentLine) lines.push(currentLine);
          }
        }

        // Write text to a temp file to avoid shell escaping issues with newlines
        // This is the most reliable way to handle multi-line text in FFmpeg drawtext
        const textFilePath = path.join(tempDir, "overlay_text.txt");
        const wrappedText = lines.join("\n");  // Actual newlines in the file
        await fs.promises.writeFile(textFilePath, wrappedText, "utf-8");

        logger.info("Text file created for FFmpeg", {
          path: textFilePath,
          lines: lines.length,
          content: wrappedText,
        });

        // Position: bottom text should not go above 75% mark (1440px from top)
        // App preview uses: top='3%', bottom='8%' of container height
        let textY: string;
        switch (customTextPosition) {
          case "top":
            textY = "58";  // 3% of 1920 = 58px from top
            break;
          case "center":
            textY = "(h-text_h)/2";
            break;
          case "bottom":
          default:
            // Position from bottom, but ensure text doesn't go above 75% mark
            textY = "max(1440-text_h\\,h-text_h-154)";
            break;
        }

        const hexColor = customTextColor.replace("#", "");
        // Line height for multi-line text
        const lineHeight = Math.round(fontSize * 1.3);

        logger.info("Text overlay settings", {
          originalLength: customText.length,
          lines: lines.length,
          fontSize,
          wrappedText: wrappedText.substring(0, 100),
        });

        // Use textfile option instead of inline text - avoids all shell escaping issues
        // Text is centered via x=(w-text_w)/2 positioning
        filterComplexParts.push(
          `${currentStream}drawtext=textfile='${textFilePath}':fontsize=${fontSize}:fontcolor=0x${hexColor}:x=(w-text_w)/2:y=${textY}:box=1:boxcolor=black@0.5:boxborderw=20:line_spacing=${lineHeight - fontSize}[texted]`
        );
        currentStream = "[texted]";
      }

      // Add sticker PNG overlays (using downloaded PNGs instead of drawtext)
      // Calculate input stream index: 0=video, 1=frame (if exists), then stickers
      let stickerInputIndex = frameLocalPath ? 2 : 1;

      stickerLocalPaths.forEach((stickerInfo, i) => {
        const { x, y, scale } = stickerInfo;

        // Validate scale - must be positive and reasonable
        const validScale = Math.max(0.1, Math.min(3.0, scale || 1));

        // Convert percentage position to pixels (1080x1920 video)
        // Also center the sticker on the position (subtract half the size)
        const stickerSize = Math.round(240 * validScale);
        const halfSize = Math.round(stickerSize / 2);

        // Calculate position and clamp to valid range
        const rawPixelX = Math.round((x / 100) * 1080) - halfSize;
        const rawPixelY = Math.round((y / 100) * 1920) - halfSize;

        // Ensure sticker stays at least partially visible
        const pixelX = Math.max(-halfSize, Math.min(1080 - halfSize, rawPixelX));
        const pixelY = Math.max(-halfSize, Math.min(1920 - halfSize, rawPixelY));

        const inputIdx = stickerInputIndex + i;

        logger.info("Adding sticker overlay", {
          index: i,
          inputIdx,
          x, y, scale: validScale,
          stickerSize,
          pixelX, pixelY,
          path: stickerInfo.path,
        });

        // Scale the sticker PNG and overlay it at the specified position
        filterComplexParts.push(
          `[${inputIdx}:v]scale=${stickerSize}:${stickerSize}[sticker${i}]`
        );
        filterComplexParts.push(
          `${currentStream}[sticker${i}]overlay=${pixelX}:${pixelY}[stickered${i}]`
        );
        currentStream = `[stickered${i}]`;
      });

      // Build final command
      if (filterComplexParts.length > 0) {
        const filterComplex = filterComplexParts.join(";");
        // Remove the stream label from the last filter
        const lastLabel = currentStream.replace(/\[|\]/g, "");
        ffmpegCmd += ` -filter_complex "${filterComplex}" -map "[${lastLabel}]" -map 0:a?`;
      }

      ffmpegCmd += ` -c:v libx264 -preset veryfast -crf 25 -threads 0 -c:a aac -movflags +faststart "${outputPath}"`;

      logger.info("=== FFMPEG COMMAND ===", {
        commandLength: ffmpegCmd.length,
        hasFrameInput: ffmpegCmd.includes("frame.png"),
        filterComplexParts: filterComplexParts.length,
        command: ffmpegCmd
      });

      let stdout = "";
      let stderr = "";

      try {
        const result = await execAsync(ffmpegCmd, {
          maxBuffer: 50 * 1024 * 1024 // 50MB buffer
        });
        stdout = result.stdout;
        stderr = result.stderr;
      } catch (ffmpegError: any) {
        // FFmpeg can exit with errors but still produce output
        // Capture the error output for debugging
        stdout = ffmpegError.stdout || "";
        stderr = ffmpegError.stderr || "";

        logger.error("FFmpeg execution error", {
          errorMessage: ffmpegError.message,
          exitCode: ffmpegError.code,
          stderr: stderr.slice(-2000), // Last 2000 chars of stderr
          stdout: stdout.slice(-500),
        });

        // Check if output file exists anyway
        const outputExists = await fs.promises.stat(outputPath).then(() => true).catch(() => false);
        if (!outputExists) {
          throw new Error(`FFmpeg failed: ${stderr.slice(-500)}`);
        }
        logger.warn("FFmpeg reported error but output file exists, continuing...");
      }

      logger.info("FFmpeg completed", {
        stdoutLength: stdout.length,
        stderrLength: stderr.length,
        stderrSample: stderr.slice(-500), // Log last 500 chars of stderr
      });

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
        .select("video_id, recipient_email, recipient_name, send_method, email_subject, email_body, child_name, gift_name, event_name")
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

          // Fetch tracking token from videos table for view tracking
          let trackingToken: string | undefined;
          if (jobData.video_id) {
            const { data: videoData } = await supabase
              .from("videos")
              .select("tracking_token")
              .eq("id", jobData.video_id)
              .single();
            trackingToken = videoData?.tracking_token;
            logger.info("Fetched tracking token for video", { hasToken: !!trackingToken });
          }

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
                trackingToken: trackingToken, // Pass tracking token for view tracking
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

            // Also update the videos table status if we have a video_id
            if (jobData.video_id) {
              await supabase
                .from("videos")
                .update({ status: "sent" })
                .eq("id", jobData.video_id);
              logger.info("Updated video status to sent", { videoId: jobData.video_id });
            }
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
