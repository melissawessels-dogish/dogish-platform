ALTER TABLE dog ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE dog ADD COLUMN IF NOT EXISTS food_brand text;
ALTER TABLE human ADD COLUMN IF NOT EXISTS is_first_time_owner boolean;
