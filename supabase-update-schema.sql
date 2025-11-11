-- Update guests table to support video URLs and contact info
-- Run this in Supabase SQL Editor

-- Add new columns to guests table if they don't exist
ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS video_thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS customization_data JSONB DEFAULT '{}'::jsonb;

-- Update the guests table structure
COMMENT ON COLUMN guests.video_url IS 'URL to the recorded thank you video in Supabase Storage';
COMMENT ON COLUMN guests.video_thumbnail_url IS 'URL to video thumbnail';
COMMENT ON COLUMN guests.recorded_at IS 'Timestamp when video was recorded';
COMMENT ON COLUMN guests.customization_data IS 'JSON data for stickers, frames, text overlays, etc.';

-- Ensure phone can be NULL (some guests might only have email)
ALTER TABLE guests ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE guests ALTER COLUMN email DROP NOT NULL;
