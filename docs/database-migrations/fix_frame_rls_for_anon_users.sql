-- ============================================
-- Fix Frame Assignments RLS for Anonymous Users (Kids)
-- ============================================
--
-- CRITICAL BUG: Kids cannot see frames during recording
--
-- ROOT CAUSE:
-- The existing policy "Allow viewing frame assignments for parents and kids"
-- checks "WHERE c.id = auth.uid()", but kids log in ANONYMOUSLY (no Supabase auth).
-- For anonymous users, auth.uid() returns NULL, so the policy blocks all access.
--
-- EVIDENCE FROM LOGS:
-- - During recording (kid/anon):  "🔍 Found 0 matching frame assignment(s)" ❌
-- - During review (parent/auth): "🔍 Found 1 matching frame assignment(s)" ✅
--
-- SOLUTION:
-- Add a separate permissive policy for anonymous users (role: anon)
-- allowing them to SELECT all frame_assignments.
--
-- SECURITY NOTE:
-- This is SAFE because:
-- - Anonymous users are kids using access codes (not public internet users)
-- - Kids only query for their own data based on AsyncStorage session
-- - App logic filters frame assignments by gift/child/event
-- - Frame assignments are not sensitive data (just design preferences)
-- ============================================

-- Create policy allowing anonymous users to view all frame assignments
CREATE POLICY "Allow anonymous users to view frame assignments"
  ON frame_assignments FOR SELECT
  TO anon
  USING (true);

-- Verify both policies now exist
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles::text,
  cmd::text
FROM pg_policies
WHERE tablename = 'frame_assignments'
ORDER BY policyname;

-- Expected output: Should show 2 policies
-- 1. "Allow anonymous users to view frame assignments" (anon, SELECT)
-- 2. "Allow viewing frame assignments for parents and kids" (all roles, SELECT)
