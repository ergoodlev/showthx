-- ============================================
-- EVENT-GIFT-CHILD RELATIONSHIP SCHEMA
-- ============================================
-- Adds event and guest relationships to gifts
-- Creates event_children junction table
-- ============================================

-- 1. Add event_id to gifts table (gifts belong to specific events)
ALTER TABLE gifts
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE CASCADE;

-- 2. Add guest_id to gifts table (for gift-guest pairing from CSV or manual entry)
ALTER TABLE gifts
ADD COLUMN IF NOT EXISTS guest_id UUID REFERENCES guests(id) ON DELETE SET NULL;

-- 3. Create event_children junction table (many-to-many: events can have multiple children)
CREATE TABLE IF NOT EXISTS event_children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, child_id)
);

-- 4. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_gifts_event_id ON gifts(event_id);
CREATE INDEX IF NOT EXISTS idx_gifts_guest_id ON gifts(guest_id);
CREATE INDEX IF NOT EXISTS idx_event_children_event_id ON event_children(event_id);
CREATE INDEX IF NOT EXISTS idx_event_children_child_id ON event_children(child_id);

-- 5. Enable RLS on event_children table
ALTER TABLE event_children ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for event_children

-- Parents can view event_children for their own events
CREATE POLICY "Parents can view event_children for their events"
ON event_children FOR SELECT
USING (
  event_id IN (
    SELECT id FROM events WHERE parent_id = auth.uid()
  )
);

-- Parents can insert event_children for their own events
CREATE POLICY "Parents can insert event_children for their events"
ON event_children FOR INSERT
WITH CHECK (
  event_id IN (
    SELECT id FROM events WHERE parent_id = auth.uid()
  )
  AND
  child_id IN (
    SELECT id FROM children WHERE parent_id = auth.uid()
  )
);

-- Parents can delete event_children for their own events
CREATE POLICY "Parents can delete event_children for their events"
ON event_children FOR DELETE
USING (
  event_id IN (
    SELECT id FROM events WHERE parent_id = auth.uid()
  )
);

-- 7. Update existing gifts to link to events (if gift has child_id, find event via children)
-- This is a one-time migration for existing data
UPDATE gifts g
SET event_id = (
  SELECT e.id
  FROM events e
  WHERE e.parent_id = (
    SELECT c.parent_id
    FROM children c
    WHERE c.id = g.child_id
    LIMIT 1
  )
  LIMIT 1
)
WHERE event_id IS NULL AND child_id IS NOT NULL;

-- Verification queries
SELECT 'Schema updated successfully' AS status;

-- Show updated gifts schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'gifts'
AND column_name IN ('event_id', 'guest_id', 'child_id')
ORDER BY column_name;

-- Show event_children table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'event_children'
ORDER BY ordinal_position;

-- Count records
SELECT
  'Gifts' AS table_name,
  COUNT(*) AS total_records,
  COUNT(event_id) AS with_event_id,
  COUNT(guest_id) AS with_guest_id
FROM gifts
UNION ALL
SELECT
  'Event Children' AS table_name,
  COUNT(*) AS total_records,
  NULL AS with_event_id,
  NULL AS with_guest_id
FROM event_children;
