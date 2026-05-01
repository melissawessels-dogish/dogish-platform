-- Stories: ephemeral 24-hour media posts

create table story (
  id          uuid primary key default uuid_generate_v4(),
  author_id   uuid not null references auth.users (id) on delete cascade,
  dog_id      uuid references dog (id) on delete set null,
  media_url   text not null,
  media_type  text not null default 'image',  -- 'image' | 'video'
  caption     text,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '24 hours'
);

create index story_author on story (author_id);
create index story_expires on story (expires_at);

create table story_view (
  story_id   uuid not null references story (id) on delete cascade,
  viewer_id  uuid not null references auth.users (id) on delete cascade,
  viewed_at  timestamptz not null default now(),
  primary key (story_id, viewer_id)
);

-- RLS
alter table story enable row level security;
alter table story_view enable row level security;

-- story: anyone can read active (non-expired) stories
create policy "story: read active"
  on story for select
  using (expires_at > now());

-- story: author can insert own stories
create policy "story: insert own"
  on story for insert
  with check (author_id = auth.uid());

-- story: author can delete own stories
create policy "story: delete own"
  on story for delete
  using (author_id = auth.uid());

-- story_view: viewers can read their own views
create policy "story_view: read own"
  on story_view for select
  using (viewer_id = auth.uid());

-- story_view: anyone authenticated can insert a view
create policy "story_view: insert"
  on story_view for insert
  with check (viewer_id = auth.uid());
