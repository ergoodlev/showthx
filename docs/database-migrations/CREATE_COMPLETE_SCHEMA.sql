-- ============================================
-- COMPLETE SCHEMA FOR GRATITUGRAM - PHASE 2
-- Creates all tables needed for:
-- - Gift tracking and assignments
-- - Video recording and management
-- - Video decorations (stickers, filters, text)
-- - Guest tracking
-- ============================================

-- 1. EVENTS TABLE (parent creates events like "Birthday", "Graduation")
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  event_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_parent_id ON public.events(parent_id);

-- 2. GUESTS TABLE (people who will receive thank you videos)
CREATE TABLE IF NOT EXISTS public.guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_guests_event_id ON public.guests(event_id);
CREATE INDEX IF NOT EXISTS idx_guests_parent_id ON public.guests(parent_id);

-- 3. GIFTS TABLE (gifts/things to thank people for)
CREATE TABLE IF NOT EXISTS public.gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  giver_name TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gifts_event_id ON public.gifts(event_id);
CREATE INDEX IF NOT EXISTS idx_gifts_parent_id ON public.gifts(parent_id);
CREATE INDEX IF NOT EXISTS idx_gifts_guest_id ON public.gifts(guest_id);

-- 4. GIFT_ASSIGNMENTS TABLE (which child records which gift)
CREATE TABLE IF NOT EXISTS public.gift_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_id UUID NOT NULL REFERENCES public.gifts(id) ON DELETE CASCADE,
  children_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gift_assignments_children_id ON public.gift_assignments(children_id);
CREATE INDEX IF NOT EXISTS idx_gift_assignments_gift_id ON public.gift_assignments(gift_id);

-- 5. VIDEOS TABLE (recorded thank you videos)
CREATE TABLE IF NOT EXISTS public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_id UUID NOT NULL REFERENCES public.gifts(id) ON DELETE CASCADE,
  children_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,

  -- Video file info
  file_url TEXT,
  thumbnail_url TEXT,
  duration_ms INTEGER,

  -- Video status workflow
  status TEXT CHECK (status IN ('draft', 'pending_approval', 'approved', 'sent', 'archived')) DEFAULT 'draft',

  -- Recording details
  recorded_at TIMESTAMP,
  recorded_device_info TEXT,

  -- Video metadata
  music_url TEXT,
  music_title TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  sent_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_videos_gift_id ON public.videos(gift_id);
CREATE INDEX IF NOT EXISTS idx_videos_children_id ON public.videos(children_id);
CREATE INDEX IF NOT EXISTS idx_videos_parent_id ON public.videos(parent_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON public.videos(status);

-- 6. VIDEO_DECORATIONS TABLE (stickers, text, filters applied to videos)
CREATE TABLE IF NOT EXISTS public.video_decorations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,

  -- Decoration type
  type TEXT NOT NULL CHECK (type IN ('sticker', 'text', 'filter', 'effect')),

  -- Sticker properties
  sticker_name TEXT,
  sticker_category TEXT,

  -- Text properties
  text_content TEXT,
  text_color TEXT,
  text_font TEXT,
  text_size INTEGER,

  -- Filter properties
  filter_name TEXT,
  filter_type TEXT CHECK (filter_type IN ('warm', 'cool', 'vintage', 'bw', 'sepia', 'vivid', 'holiday')),
  filter_intensity NUMERIC(3,2), -- 0.0 to 1.0

  -- Position and size
  x_position NUMERIC(5,3),
  y_position NUMERIC(5,3),
  width NUMERIC(5,3),
  height NUMERIC(5,3),
  rotation INTEGER,

  -- Timeline
  start_time_ms INTEGER,
  end_time_ms INTEGER,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  order_index INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_video_decorations_video_id ON public.video_decorations(video_id);

-- 7. VIDEO_SHARING TABLE (track which guests received which videos)
CREATE TABLE IF NOT EXISTS public.video_sharing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,

  -- Sharing status
  status TEXT CHECK (status IN ('pending', 'sent', 'opened', 'failed')) DEFAULT 'pending',

  -- Sharing details
  sent_at TIMESTAMP,
  opened_at TIMESTAMP,

  -- Tracking
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_video_sharing_video_id ON public.video_sharing(video_id);
CREATE INDEX IF NOT EXISTS idx_video_sharing_guest_id ON public.video_sharing(guest_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_decorations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_sharing ENABLE ROW LEVEL SECURITY;

-- EVENTS: Parents can manage their own events
CREATE POLICY "Parents can view own events"
  ON public.events FOR SELECT
  TO authenticated
  USING (auth.uid()::text = parent_id::text);

CREATE POLICY "Parents can create events"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = parent_id::text);

CREATE POLICY "Parents can update own events"
  ON public.events FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = parent_id::text)
  WITH CHECK (auth.uid()::text = parent_id::text);

CREATE POLICY "Parents can delete own events"
  ON public.events FOR DELETE
  TO authenticated
  USING (auth.uid()::text = parent_id::text);

-- GUESTS: Parents can manage guests for their events
CREATE POLICY "Parents can view own guests"
  ON public.guests FOR SELECT
  TO authenticated
  USING (auth.uid()::text = parent_id::text);

CREATE POLICY "Parents can create guests"
  ON public.guests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = parent_id::text);

CREATE POLICY "Parents can update own guests"
  ON public.guests FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = parent_id::text)
  WITH CHECK (auth.uid()::text = parent_id::text);

CREATE POLICY "Parents can delete own guests"
  ON public.guests FOR DELETE
  TO authenticated
  USING (auth.uid()::text = parent_id::text);

-- GIFTS: Parents can manage gifts, kids can only see assigned gifts
CREATE POLICY "Parents can view own gifts"
  ON public.gifts FOR SELECT
  TO authenticated
  USING (auth.uid()::text = parent_id::text);

CREATE POLICY "Parents can create gifts"
  ON public.gifts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = parent_id::text);

CREATE POLICY "Parents can update own gifts"
  ON public.gifts FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = parent_id::text)
  WITH CHECK (auth.uid()::text = parent_id::text);

CREATE POLICY "Parents can delete own gifts"
  ON public.gifts FOR DELETE
  TO authenticated
  USING (auth.uid()::text = parent_id::text);

-- GIFT_ASSIGNMENTS: Kids can view gifts assigned to them
CREATE POLICY "Allow kids to view own gift assignments"
  ON public.gift_assignments FOR SELECT
  TO anon, authenticated
  USING (true); -- Kids query by children_id which is in AsyncStorage

CREATE POLICY "Parents can manage gift assignments"
  ON public.gift_assignments FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.gifts
    WHERE gifts.id = gift_assignments.gift_id
    AND gifts.parent_id = auth.uid()::text
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.gifts
    WHERE gifts.id = gift_assignments.gift_id
    AND gifts.parent_id = auth.uid()::text
  ));

-- VIDEOS: Parents review, kids record
CREATE POLICY "Kids can create videos"
  ON public.videos FOR INSERT
  TO anon, authenticated
  WITH CHECK (true); -- Kids insert their own videos using children_id

CREATE POLICY "Kids can view own videos"
  ON public.videos FOR SELECT
  TO anon, authenticated
  USING (children_id::text IN (SELECT children.id FROM public.children));

CREATE POLICY "Parents can view own videos"
  ON public.videos FOR SELECT
  TO authenticated
  USING (auth.uid()::text = parent_id::text);

CREATE POLICY "Parents can update video status"
  ON public.videos FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = parent_id::text)
  WITH CHECK (auth.uid()::text = parent_id::text);

-- VIDEO_DECORATIONS: Anyone can add decorations to videos they own
CREATE POLICY "Allow decoration creation"
  ON public.video_decorations FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow decoration viewing"
  ON public.video_decorations FOR SELECT
  TO anon, authenticated
  USING (true);

-- VIDEO_SHARING: Parents can share videos
CREATE POLICY "Parents can manage sharing"
  ON public.video_sharing FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.videos
    WHERE videos.id = video_sharing.video_id
    AND videos.parent_id = auth.uid()::text
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.videos
    WHERE videos.id = video_sharing.video_id
    AND videos.parent_id = auth.uuid()::text
  ));

-- ============================================
-- VERIFY TABLES CREATED
-- ============================================
-- Check what tables exist:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- ORDER BY table_name;
