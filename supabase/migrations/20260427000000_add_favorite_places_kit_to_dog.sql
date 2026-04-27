ALTER TABLE dog ADD COLUMN IF NOT EXISTS favorite_places_kit_id uuid REFERENCES kit (id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS dog_favorite_places_kit ON dog (favorite_places_kit_id);
