-- Add child_gifts field to store per-child gift mappings
-- e.g., [{"child": "Eli", "gift": "Baseball Set"}, {"child": "Asher", "gift": "Croquet Set"}]
ALTER TABLE gifts ADD COLUMN IF NOT EXISTS child_gifts JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN gifts.child_gifts IS 'Per-child gift mappings when gift is shared/split between multiple kids';
