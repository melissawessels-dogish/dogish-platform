-- Kit detail page schema additions

-- description was already sent by the creation form but the column was missing
ALTER TABLE kit ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE kit ADD COLUMN IF NOT EXISTS cover_image text;

-- position for ordered kit items; post_id for linking posts directly
ALTER TABLE kit_items ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0;
ALTER TABLE kit_items ADD COLUMN IF NOT EXISTS post_id uuid REFERENCES post (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS kit_items_post ON kit_items (post_id);
