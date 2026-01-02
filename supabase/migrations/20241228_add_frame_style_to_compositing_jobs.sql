-- Add frame style columns to video_compositing_jobs
-- These support non-AI frames that don't have a PNG file

ALTER TABLE video_compositing_jobs
ADD COLUMN IF NOT EXISTS frame_shape TEXT,
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#06B6D4',
ADD COLUMN IF NOT EXISTS border_width INTEGER DEFAULT 20;

COMMENT ON COLUMN video_compositing_jobs.frame_shape IS 'Frame shape type (e.g., bold-classic, neon-glow) for non-AI frames';
COMMENT ON COLUMN video_compositing_jobs.primary_color IS 'Primary border color for non-AI frames';
COMMENT ON COLUMN video_compositing_jobs.border_width IS 'Border width in pixels for non-AI frames';
