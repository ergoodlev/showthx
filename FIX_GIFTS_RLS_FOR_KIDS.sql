-- ============================================
-- FIX: Allow Kids to View Gifts Through FK
-- ============================================
-- Kids need to view gifts assigned to them
-- But they use the anon key (auth.uid() = NULL)
-- So we need a policy that allows gift viewing for kids
-- ============================================

-- Drop existing gift policies
DROP POLICY IF EXISTS "Parents can view own gifts" ON public.gifts;
DROP POLICY IF EXISTS "Parents can create gifts" ON public.gifts;
DROP POLICY IF EXISTS "Parents can update own gifts" ON public.gifts;
DROP POLICY IF EXISTS "Parents can delete own gifts" ON public.gifts;

ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;

-- IMPORTANT: Allow BOTH authenticated parents AND anonymous kids to view gifts
-- Parents view their own gifts
CREATE POLICY "Parents can view own gifts"
  ON public.gifts FOR SELECT
  TO authenticated
  USING (parent_id::text = auth.uid()::text);

-- Kids can view gifts assigned to them (via gift_assignments)
-- Since kids use anon key, we need to be permissive here
-- The gift_assignments RLS policy ensures they can only access their own assignments
CREATE POLICY "Kids can view gifts through assignments"
  ON public.gifts FOR SELECT
  TO anon
  USING (true);

-- Parents can create gifts
CREATE POLICY "Parents can create gifts"
  ON public.gifts FOR INSERT
  TO authenticated
  WITH CHECK (parent_id::text = auth.uid()::text);

-- Parents can update own gifts
CREATE POLICY "Parents can update own gifts"
  ON public.gifts FOR UPDATE
  TO authenticated
  USING (parent_id::text = auth.uid()::text)
  WITH CHECK (parent_id::text = auth.uid()::text);

-- Parents can delete own gifts
CREATE POLICY "Parents can delete own gifts"
  ON public.gifts FOR DELETE
  TO authenticated
  USING (parent_id::text = auth.uid()::text);

-- ============================================
-- VERIFY POLICIES
-- ============================================
-- SELECT policyname, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'gifts'
-- ORDER BY policyname;
