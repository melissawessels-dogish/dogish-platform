ALTER TABLE post ADD COLUMN IF NOT EXISTS repost_count int NOT NULL DEFAULT 0;

CREATE TABLE repost (
  id               uuid primary key default uuid_generate_v4(),
  reposter_id      uuid not null references human (id) on delete cascade,
  original_post_id uuid not null references post (id) on delete cascade,
  caption          text,
  created_at       timestamptz not null default now(),
  UNIQUE (reposter_id, original_post_id)
);

ALTER TABLE repost ENABLE ROW LEVEL SECURITY;

CREATE POLICY "repost: read all" ON repost FOR SELECT USING (true);
CREATE POLICY "repost: insert own" ON repost FOR INSERT WITH CHECK (reposter_id = auth.uid());
CREATE POLICY "repost: delete own" ON repost FOR DELETE USING (reposter_id = auth.uid());

-- Repost count trigger
CREATE OR REPLACE FUNCTION update_post_repost_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE post SET repost_count = repost_count + 1 WHERE id = NEW.original_post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE post SET repost_count = repost_count - 1 WHERE id = OLD.original_post_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER repost_count_trigger
  AFTER INSERT OR DELETE ON repost
  FOR each ROW EXECUTE FUNCTION update_post_repost_count();
