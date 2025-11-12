/**
 * ThankCast Kids - Minimal Supabase Schema
 *
 * INSTRUCTIONS:
 * 1. Go to Supabase SQL Editor
 * 2. Copy ONLY the section you need (see sections below)
 * 3. Paste and run ONE section at a time
 * 4. Wait for it to complete before moving to next section
 * 5. Do NOT run everything at once
 */

-- ============================================
-- RUN THIS FIRST: Drop existing tables (if any)
-- ============================================
-- Uncomment these lines if tables already exist and you want to start fresh
-- DROP TABLE IF EXISTS public.parental_settings CASCADE;
-- DROP TABLE IF EXISTS public.guests CASCADE;
-- DROP TABLE IF EXISTS public.videos CASCADE;
-- DROP TABLE IF EXISTS public.gifts CASCADE;
-- DROP TABLE IF EXISTS public.events CASCADE;
-- DROP TABLE IF EXISTS public.children CASCADE;
-- DROP TABLE IF EXISTS public.parents CASCADE;

-- ============================================
-- SECTION 1: Create Parents Table
-- ============================================
-- Copy and run this section first
CREATE TABLE IF NOT EXISTS public.parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC'::text, NOW())
);

-- ============================================
-- SECTION 2: Create Children Table
-- ============================================
-- Copy and run this section AFTER Section 1 completes
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

-- ============================================
-- SECTION 3: Create Events Table
-- ============================================
-- Copy and run this section AFTER Section 2 completes
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

-- ============================================
-- SECTION 4: Create Gifts Table
-- ============================================
-- Copy and run this section AFTER Section 3 completes
CREATE TABLE IF NOT EXISTS public.gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.children(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  recipient_name VARCHAR(255),
  recipient_email VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC'::text, NOW())
);

-- ============================================
-- SECTION 5: Create Videos Table
-- ============================================
-- Copy and run this section AFTER Section 4 completes
CREATE TABLE IF NOT EXISTS public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_id UUID NOT NULL REFERENCES public.gifts(id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.children(id) ON DELETE SET NULL,
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  video_url VARCHAR(500),
  video_duration INTEGER,
  music_url VARCHAR(500),
  music_title VARCHAR(255),
  customization_data JSONB,
  status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC'::text, NOW())
);

-- ============================================
-- SECTION 6: Create Guests Table
-- ============================================
-- Copy and run this section AFTER Section 5 completes
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

-- ============================================
-- SECTION 7: Create Parental Settings Table
-- ============================================
-- Copy and run this section AFTER Section 6 completes
CREATE TABLE IF NOT EXISTS public.parental_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID UNIQUE NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  max_video_duration INTEGER DEFAULT 60,
  require_email_approval BOOLEAN DEFAULT FALSE,
  allow_guest_sharing BOOLEAN DEFAULT TRUE,
  max_shared_guests INTEGER DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC'::text, NOW())
);

-- ============================================
-- SECTION 8: Enable Row Level Security
-- ============================================
-- Copy and run this section AFTER Section 7 completes
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parental_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SECTION 9: Create Indexes
-- ============================================
-- Copy and run this section AFTER Section 8 completes
CREATE INDEX IF NOT EXISTS idx_parents_email ON public.parents(email);
CREATE INDEX IF NOT EXISTS idx_children_parent_id ON public.children(parent_id);
CREATE INDEX IF NOT EXISTS idx_events_parent_id ON public.events(parent_id);
CREATE INDEX IF NOT EXISTS idx_gifts_event_id ON public.gifts(event_id);
CREATE INDEX IF NOT EXISTS idx_gifts_parent_id ON public.gifts(parent_id);
CREATE INDEX IF NOT EXISTS idx_gifts_status ON public.gifts(status);
CREATE INDEX IF NOT EXISTS idx_videos_gift_id ON public.videos(gift_id);
CREATE INDEX IF NOT EXISTS idx_videos_parent_id ON public.videos(parent_id);
CREATE INDEX IF NOT EXISTS idx_guests_video_id ON public.guests(video_id);
CREATE INDEX IF NOT EXISTS idx_guests_parent_id ON public.guests(parent_id);
CREATE INDEX IF NOT EXISTS idx_parental_settings_parent_id ON public.parental_settings(parent_id);

-- ============================================
-- SECTION 10: Create RLS Policies
-- ============================================
-- Copy and run this section AFTER Section 9 completes
-- PARENTS POLICIES
CREATE POLICY "Parents can view own record" ON public.parents FOR SELECT USING (auth.uid()::text = id::text);
CREATE POLICY "Parents can update own record" ON public.parents FOR UPDATE USING (auth.uid()::text = id::text);

-- CHILDREN POLICIES
CREATE POLICY "Parents can view own children" ON public.children FOR SELECT USING (auth.uid()::text = parent_id::text);
CREATE POLICY "Parents can insert own children" ON public.children FOR INSERT WITH CHECK (auth.uid()::text = parent_id::text);
CREATE POLICY "Parents can update own children" ON public.children FOR UPDATE USING (auth.uid()::text = parent_id::text);
CREATE POLICY "Parents can delete own children" ON public.children FOR DELETE USING (auth.uid()::text = parent_id::text);

-- EVENTS POLICIES
CREATE POLICY "Parents can view own events" ON public.events FOR SELECT USING (auth.uid()::text = parent_id::text);
CREATE POLICY "Parents can insert own events" ON public.events FOR INSERT WITH CHECK (auth.uid()::text = parent_id::text);
CREATE POLICY "Parents can update own events" ON public.events FOR UPDATE USING (auth.uid()::text = parent_id::text);
CREATE POLICY "Parents can delete own events" ON public.events FOR DELETE USING (auth.uid()::text = parent_id::text);

-- GIFTS POLICIES
CREATE POLICY "Parents can view own gifts" ON public.gifts FOR SELECT USING (auth.uid()::text = parent_id::text);
CREATE POLICY "Parents can insert own gifts" ON public.gifts FOR INSERT WITH CHECK (auth.uid()::text = parent_id::text);
CREATE POLICY "Parents can update own gifts" ON public.gifts FOR UPDATE USING (auth.uid()::text = parent_id::text);
CREATE POLICY "Parents can delete own gifts" ON public.gifts FOR DELETE USING (auth.uid()::text = parent_id::text);

-- VIDEOS POLICIES
CREATE POLICY "Parents can view own videos" ON public.videos FOR SELECT USING (auth.uid()::text = parent_id::text);
CREATE POLICY "Parents can insert own videos" ON public.videos FOR INSERT WITH CHECK (auth.uid()::text = parent_id::text);
CREATE POLICY "Parents can update own videos" ON public.videos FOR UPDATE USING (auth.uid()::text = parent_id::text);
CREATE POLICY "Parents can delete own videos" ON public.videos FOR DELETE USING (auth.uid()::text = parent_id::text);

-- GUESTS POLICIES
CREATE POLICY "Parents can view own guests" ON public.guests FOR SELECT USING (auth.uid()::text = parent_id::text);
CREATE POLICY "Parents can insert own guests" ON public.guests FOR INSERT WITH CHECK (auth.uid()::text = parent_id::text);
CREATE POLICY "Parents can update own guests" ON public.guests FOR UPDATE USING (auth.uid()::text = parent_id::text);
CREATE POLICY "Parents can delete own guests" ON public.guests FOR DELETE USING (auth.uid()::text = parent_id::text);

-- PARENTAL_SETTINGS POLICIES
CREATE POLICY "Parents can view own settings" ON public.parental_settings FOR SELECT USING (auth.uid()::text = parent_id::text);
CREATE POLICY "Parents can insert own settings" ON public.parental_settings FOR INSERT WITH CHECK (auth.uid()::text = parent_id::text);
CREATE POLICY "Parents can update own settings" ON public.parental_settings FOR UPDATE USING (auth.uid()::text = parent_id::text);
CREATE POLICY "Parents can delete own settings" ON public.parental_settings FOR DELETE USING (auth.uid()::text = parent_id::text);

-- ============================================
-- DONE!
-- ============================================
-- All tables created and secured.
-- You can now test the app.
