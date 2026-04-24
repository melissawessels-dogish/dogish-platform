ALTER TABLE post ADD COLUMN save_count int not null default 0;

-- Backfill existing counts from saved_post table
UPDATE post
SET save_count = (
  SELECT COUNT(*) FROM saved_post WHERE saved_post.post_id = post.id
);

-- Trigger function
CREATE OR REPLACE FUNCTION update_post_save_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE post SET save_count = save_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE post SET save_count = save_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER post_save_count_trigger
  AFTER INSERT OR DELETE ON saved_post
  FOR EACH ROW EXECUTE FUNCTION update_post_save_count();
