-- ============================================
-- FIX GIFTS TABLE RLS POLICIES
-- Allow parents to create, view, and manage gifts
-- ============================================

-- Drop all existing policies on gifts
DROP POLICY IF EXISTS "Parents can view own gifts" ON public.gifts;
DROP POLICY IF EXISTS "Parents can create gifts" ON public.gifts;
DROP POLICY IF EXISTS "Parents can update own gifts" ON public.gifts;
DROP POLICY IF EXISTS "Parents can delete own gifts" ON public.gifts;
DROP POLICY IF EXISTS "Parents can manage gifts" ON public.gifts;

-- Enable RLS if not already enabled
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;

-- SIMPLE: Allow parents full access to their own gifts
CREATE POLICY "Parents can view own gifts"
  ON public.gifts FOR SELECT
  TO authenticated
  USING (parent_id::text = auth.uid()::text);

CREATE POLICY "Parents can create gifts"
  ON public.gifts FOR INSERT
  TO authenticated
  WITH CHECK (parent_id::text = auth.uid()::text);

CREATE POLICY "Parents can update own gifts"
  ON public.gifts FOR UPDATE
  TO authenticated
  USING (parent_id::text = auth.uid()::text)
  WITH CHECK (parent_id::text = auth.uid()::text);

CREATE POLICY "Parents can delete own gifts"
  ON public.gifts FOR DELETE
  TO authenticated
  USING (parent_id::text = auth.uid()::text);

-- ============================================
-- FIX EVENTS TABLE RLS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Parents can view own events" ON public.events;
DROP POLICY IF EXISTS "Parents can create events" ON public.events;
DROP POLICY IF EXISTS "Parents can update own events" ON public.events;
DROP POLICY IF EXISTS "Parents can delete own events" ON public.events;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view own events"
  ON public.events FOR SELECT
  TO authenticated
  USING (parent_id::text = auth.uid()::text);

CREATE POLICY "Parents can create events"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (parent_id::text = auth.uid()::text);

CREATE POLICY "Parents can update own events"
  ON public.events FOR UPDATE
  TO authenticated
  USING (parent_id::text = auth.uid()::text)
  WITH CHECK (parent_id::text = auth.uid()::text);

CREATE POLICY "Parents can delete own events"
  ON public.events FOR DELETE
  TO authenticated
  USING (parent_id::text = auth.uid()::text);

-- ============================================
-- VERIFY ALL POLICIES
-- ============================================
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename IN ('gifts', 'events', 'children', 'gift_assignments', 'videos')
-- ORDER BY tablename, policyname;
