-- ============================================
-- FIX: Add Missing RLS Policies
-- ============================================
-- These policies were missing from the initial schema setup
-- This is why events weren't being created!

-- ADD INSERT POLICY FOR PARENTS TABLE (CRITICAL FIX)
CREATE POLICY "Parents can insert own record" ON public.parents FOR INSERT WITH CHECK (auth.uid()::text = id::text);

-- Verify all policies exist:
-- SELECT * FROM pg_policies WHERE tablename = 'parents';
-- Should show:
--  - Parents can view own record (SELECT)
--  - Parents can update own record (UPDATE)
--  - Parents can insert own record (INSERT) ← NEW
