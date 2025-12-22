-- ============================================
-- FIX: Add Missing Columns to Events, Gifts, and Videos Tables
-- ============================================
-- These columns were referenced in the app code but missing from schema

-- ADD MISSING COLUMN TO EVENTS TABLE
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS event_type VARCHAR(50) DEFAULT 'birthday';

-- ADD MISSING COLUMN TO GIFTS TABLE
ALTER TABLE public.gifts
ADD COLUMN IF NOT EXISTS giver_name VARCHAR(255);

-- ADD MISSING COLUMN TO VIDEOS TABLE (alternative timestamp)
ALTER TABLE public.videos
ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC'::text, NOW());

-- Verify the columns were added
-- SELECT column_name FROM information_schema.columns WHERE table_name='events';
-- SELECT column_name FROM information_schema.columns WHERE table_name='gifts';
-- SELECT column_name FROM information_schema.columns WHERE table_name='videos';
