/**
 * ThankCast Kids - Supabase Database Schema
 *
 * Run this SQL in your Supabase project's SQL editor:
 * 1. Go to Supabase dashboard: https://app.supabase.com
 * 2. Select your project
 * 3. Go to SQL Editor
 * 4. Create new query
 * 5. Copy and paste this entire script
 * 6. Click "Run"
 */

-- ============================================
-- PARENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC'::text, NOW())
);

ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CHILDREN TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  age INTEGER,
  pin VARCHAR(4) NOT NULL,
  pin_attempts INTEGER DEFAULT 0,
  pin_lockout_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC'::text, NOW())
);

ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;

-- ============================================
-- EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  event_date DATE,
  location VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC'::text, NOW())
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- ============================================
-- GIFTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.children(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  recipient_name VARCHAR(255),
  recipient_email VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending', -- pending, assigned, completed, recorded
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC'::text, NOW())
);

ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- VIDEOS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_id UUID NOT NULL REFERENCES public.gifts(id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.children(id) ON DELETE SET NULL,
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  video_url VARCHAR(500),
  video_duration INTEGER, -- in seconds
  music_url VARCHAR(500),
  music_title VARCHAR(255),
  customization_data JSONB, -- stores effects, filters, etc.
  status VARCHAR(50) DEFAULT 'draft', -- draft, ready, processing, completed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC'::text, NOW())
);

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- ============================================
-- GUESTS TABLE (for sharing videos)
-- ============================================
CREATE TABLE IF NOT EXISTS public.guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  sent_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC'::text, NOW())
);

ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PARENTAL SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.parental_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID UNIQUE NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  max_video_duration INTEGER DEFAULT 60, -- in seconds
  require_email_approval BOOLEAN DEFAULT FALSE,
  allow_guest_sharing BOOLEAN DEFAULT TRUE,
  max_shared_guests INTEGER DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC'::text, NOW())
);

ALTER TABLE public.parental_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- PARENTS: Users can only see their own record
CREATE POLICY "Parents can view own record"
  ON public.parents FOR SELECT
  USING (auth.uid()::text = id::text);

CREATE POLICY "Parents can update own record"
  ON public.parents FOR UPDATE
  USING (auth.uid()::text = id::text);

-- CHILDREN: Users can only see their children
CREATE POLICY "Parents can view own children"
  ON public.children FOR SELECT
  USING (auth.uid()::text = parent_id::text);

CREATE POLICY "Parents can manage own children"
  ON public.children FOR ALL
  USING (auth.uid()::text = parent_id::text);

-- EVENTS: Users can only see their own events
CREATE POLICY "Parents can view own events"
  ON public.events FOR SELECT
  USING (auth.uid()::text = parent_id::text);

CREATE POLICY "Parents can manage own events"
  ON public.events FOR ALL
  USING (auth.uid()::text = parent_id::text);

-- GIFTS: Users can only see their own gifts
CREATE POLICY "Parents can view own gifts"
  ON public.gifts FOR SELECT
  USING (auth.uid()::text = parent_id::text);

CREATE POLICY "Parents can manage own gifts"
  ON public.gifts FOR ALL
  USING (auth.uid()::text = parent_id::text);

-- VIDEOS: Users can only see their own videos
CREATE POLICY "Parents can view own videos"
  ON public.videos FOR SELECT
  USING (auth.uid()::text = parent_id::text);

CREATE POLICY "Parents can manage own videos"
  ON public.videos FOR ALL
  USING (auth.uid()::text = parent_id::text);

-- GUESTS: Users can only manage guests for their videos
CREATE POLICY "Parents can view own guests"
  ON public.guests FOR SELECT
  USING (auth.uid()::text = parent_id::text);

CREATE POLICY "Parents can manage own guests"
  ON public.guests FOR ALL
  USING (auth.uid()::text = parent_id::text);

-- PARENTAL_SETTINGS: Users can only see their own settings
CREATE POLICY "Parents can view own settings"
  ON public.parental_settings FOR SELECT
  USING (auth.uid()::text = parent_id::text);

CREATE POLICY "Parents can manage own settings"
  ON public.parental_settings FOR ALL
  USING (auth.uid()::text = parent_id::text);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_children_parent_id ON public.children(parent_id);
CREATE INDEX IF NOT EXISTS idx_events_parent_id ON public.events(parent_id);
CREATE INDEX IF NOT EXISTS idx_gifts_event_id ON public.gifts(event_id);
CREATE INDEX IF NOT EXISTS idx_gifts_parent_id ON public.gifts(parent_id);
CREATE INDEX IF NOT EXISTS idx_gifts_status ON public.gifts(status);
CREATE INDEX IF NOT EXISTS idx_videos_gift_id ON public.videos(gift_id);
CREATE INDEX IF NOT EXISTS idx_videos_parent_id ON public.videos(parent_id);
CREATE INDEX IF NOT EXISTS idx_guests_video_id ON public.guests(video_id);
CREATE INDEX IF NOT EXISTS idx_guests_parent_id ON public.guests(parent_id);

-- ============================================
-- SETUP COMPLETE
-- ============================================
-- Your database is now ready!
-- Next steps:
-- 1. Enable Database Auth in Supabase Auth settings
-- 2. Create a Supabase Storage bucket named "videos"
-- 3. Set up RLS policies for the videos bucket
-- 4. Test signup in your app
