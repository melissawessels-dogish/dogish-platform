-- Add is_system flag to kit table
ALTER TABLE kit ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false;

-- Remove favorite_places_kit_id from dog table
ALTER TABLE dog DROP COLUMN IF EXISTS favorite_places_kit_id;

-- Drop saved_post and saved_folder tables if they exist
DROP TABLE IF EXISTS saved_post CASCADE;
DROP TABLE IF EXISTS saved_folder CASCADE;

-- Auto-create system kits when a new human row is inserted
CREATE OR REPLACE FUNCTION create_system_kits_for_human()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO kit (owner_id, title, description, is_system, is_private)
  VALUES
    (NEW.id, 'Saved', 'Posts you have saved', true, true),
    (NEW.id, 'Favorite Places', 'Dog-friendly places you love', true, false);
  RETURN NEW;
END;
$$;

CREATE TRIGGER human_create_system_kits
  AFTER INSERT ON human
  FOR EACH ROW EXECUTE FUNCTION create_system_kits_for_human();
