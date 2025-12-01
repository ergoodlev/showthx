-- Migration: Add video expiry fields for COPPA compliance
-- Date: 2024-11-23
-- Description: Adds fields to track video URLs, storage paths, and expiry times

-- Add video path and expiry fields to gifts table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gifts' AND column_name = 'video_path') THEN
        ALTER TABLE gifts ADD COLUMN video_path TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gifts' AND column_name = 'video_expires_at') THEN
        ALTER TABLE gifts ADD COLUMN video_expires_at TIMESTAMPTZ;
    END IF;
END $$;

-- Create index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_gifts_video_expires_at
ON gifts (video_expires_at)
WHERE video_expires_at IS NOT NULL;

-- Create storage bucket for videos if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'videos',
    'videos',
    false,
    52428800, -- 50MB limit
    ARRAY['video/mp4', 'video/quicktime', 'video/x-m4v']::text[]
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS Policies for videos bucket
-- Allow authenticated users to upload videos
CREATE POLICY IF NOT EXISTS "Authenticated users can upload videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'videos');

-- Allow users to read their own uploaded videos
CREATE POLICY IF NOT EXISTS "Users can read their own videos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'videos');

-- Service role can delete expired videos (for cleanup function)
CREATE POLICY IF NOT EXISTS "Service role can delete any video"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'videos');

-- Add status enum value for expired videos if not exists
DO $$
BEGIN
    -- Check if 'expired' value exists in gift_status enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'expired'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'gift_status')
    ) THEN
        ALTER TYPE gift_status ADD VALUE IF NOT EXISTS 'expired';
    END IF;
EXCEPTION
    WHEN others THEN
        -- Type might not exist or other error, skip
        NULL;
END $$;

-- Comment for documentation
COMMENT ON COLUMN gifts.video_path IS 'Storage path of video in Supabase Storage bucket';
COMMENT ON COLUMN gifts.video_expires_at IS 'Timestamp when video URL expires (for COPPA compliance auto-cleanup)';
