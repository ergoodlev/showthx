-- Add gift category fields for visual/audio prompts during recording
-- These fields are populated by AI parsing during CSV import

-- Add gift_category (the type of gift like "stuffed_animal", "lego", "book")
ALTER TABLE gifts ADD COLUMN IF NOT EXISTS gift_category TEXT;

-- Add gift_emoji (the emoji representation like "🧸", "🧱", "📚")
ALTER TABLE gifts ADD COLUMN IF NOT EXISTS gift_emoji TEXT;

-- Add parsed_gift_name (cleaned up gift name for display, e.g., "Elephant stuffed animal")
ALTER TABLE gifts ADD COLUMN IF NOT EXISTS parsed_gift_name TEXT;

-- Add index for category lookups (useful for analytics)
CREATE INDEX IF NOT EXISTS idx_gifts_category ON gifts(gift_category);

COMMENT ON COLUMN gifts.gift_category IS 'AI-parsed gift category (e.g., stuffed_animal, lego, book)';
COMMENT ON COLUMN gifts.gift_emoji IS 'Emoji representation of the gift category';
COMMENT ON COLUMN gifts.parsed_gift_name IS 'AI-cleaned gift name for kid-friendly display';
