-- Fix RLS policies for GratituGram
-- Run this in Supabase SQL Editor

-- Option 1: Disable RLS entirely (for testing only)
ALTER TABLE families DISABLE ROW LEVEL SECURITY;
ALTER TABLE children DISABLE ROW LEVEL SECURITY;
ALTER TABLE guests DISABLE ROW LEVEL SECURITY;
ALTER TABLE videos DISABLE ROW LEVEL SECURITY;

-- Option 2: Or create permissive policies (better for production)
-- Uncomment these if you want to keep RLS enabled:

-- DROP POLICY IF EXISTS "Allow public insert on families" ON families;
-- CREATE POLICY "Allow public insert on families"
--   ON families FOR INSERT
--   TO public
--   WITH CHECK (true);

-- DROP POLICY IF EXISTS "Allow users to read own family" ON families;
-- CREATE POLICY "Allow users to read own family"
--   ON families FOR SELECT
--   TO public
--   USING (true);

-- DROP POLICY IF EXISTS "Allow users to update own family" ON families;
-- CREATE POLICY "Allow users to update own family"
--   ON families FOR UPDATE
--   TO public
--   USING (true)
--   WITH CHECK (true);
