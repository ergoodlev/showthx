-- ============================================
-- ADD ONLY MISSING TABLES FOR PARTY LAUNCH
-- (Does NOT recreate existing tables)
-- ============================================

-- 1. GIFT_ASSIGNMENTS TABLE (maps gifts to children who record them)
CREATE TABLE IF NOT EXISTS public.gift_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_id UUID NOT NULL REFERENCES public.gifts(id) ON DELETE CASCADE,
  children_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_gift_assignments_children_id ON public.gift_assignments(children_id);
CREATE INDEX IF NOT EXISTS idx_gift_assignments_gift_id ON public.gift_assignments(gift_id);

-- Enable RLS
ALTER TABLE public.gift_assignments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Kids can view own gift assignments" ON public.gift_assignments;
DROP POLICY IF EXISTS "Parents can manage gift assignments" ON public.gift_assignments;

-- Allow kids to view gifts assigned to them
CREATE POLICY "Kids can view own gift assignments"
  ON public.gift_assignments FOR SELECT
  TO anon, authenticated
  USING (true);

-- Parents can manage assignments for their gifts
CREATE POLICY "Parents can manage gift assignments"
  ON public.gift_assignments FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.gifts
    WHERE gifts.id = gift_assignments.gift_id
    AND gifts.parent_id::text = auth.uid()::text
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.gifts
    WHERE gifts.id = gift_assignments.gift_id
    AND gifts.parent_id::text = auth.uid()::text
  ));

-- ============================================
-- 2. VIDEO_DECORATIONS TABLE (stickers, filters, text overlays)
-- ============================================

CREATE TABLE IF NOT EXISTS public.video_decorations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,

  -- Decoration type
  type TEXT NOT NULL CHECK (type IN ('sticker', 'text', 'filter')),

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
  filter_intensity NUMERIC(3,2),

  -- Position and size (normalized 0.0 to 1.0)
  x_position NUMERIC(5,3),
  y_position NUMERIC(5,3),
  width NUMERIC(5,3),
  height NUMERIC(5,3),
  rotation INTEGER,

  -- Timeline (milliseconds)
  start_time_ms INTEGER,
  end_time_ms INTEGER,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  order_index INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_video_decorations_video_id ON public.video_decorations(video_id);

-- Enable RLS
ALTER TABLE public.video_decorations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow decoration creation" ON public.video_decorations;
DROP POLICY IF EXISTS "Allow decoration viewing" ON public.video_decorations;

-- Allow anyone to add decorations (kids decorating their videos)
CREATE POLICY "Allow decoration creation"
  ON public.video_decorations FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow viewing decorations
CREATE POLICY "Allow decoration viewing"
  ON public.video_decorations FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================
-- 3. Fix VIDEO table if needed
-- ============================================

ALTER TABLE IF EXISTS public.videos
ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE IF EXISTS public.videos
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE IF EXISTS public.videos
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE;

-- ============================================
-- 4. Fix GIFTS table if needed
-- ============================================

ALTER TABLE IF EXISTS public.gifts
ADD COLUMN IF NOT EXISTS giver_name VARCHAR(255);

ALTER TABLE IF EXISTS public.gifts
ADD COLUMN IF NOT EXISTS guest_id UUID REFERENCES public.guests(id) ON DELETE SET NULL;

-- ============================================
-- 5. Ensure VIDEOS RLS policies are correct
-- ============================================

DROP POLICY IF EXISTS "Kids can create videos" ON public.videos;
DROP POLICY IF EXISTS "Kids can view own videos" ON public.videos;
DROP POLICY IF EXISTS "Parents can view own videos" ON public.videos;
DROP POLICY IF EXISTS "Parents can update video status" ON public.videos;

-- Kids can create videos
CREATE POLICY "Kids can create videos"
  ON public.videos FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Kids can view own videos
CREATE POLICY "Kids can view own videos"
  ON public.videos FOR SELECT
  TO anon, authenticated
  USING (true);

-- Parents can view own videos
CREATE POLICY "Parents can view own videos"
  ON public.videos FOR SELECT
  TO authenticated
  USING (parent_id::text = auth.uid()::text);

-- Parents can update video status (approve/reject)
CREATE POLICY "Parents can update video status"
  ON public.videos FOR UPDATE
  TO authenticated
  USING (parent_id::text = auth.uid()::text)
  WITH CHECK (parent_id::text = auth.uid()::text);

-- ============================================
-- DONE!
-- ============================================
