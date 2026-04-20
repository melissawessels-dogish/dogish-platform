-- saved_folder: named collections owned by a human
create table saved_folder (
  id          uuid primary key default uuid_generate_v4(),
  owner_id    uuid not null references human (id) on delete cascade,
  name        text not null,
  is_private  boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index saved_folder_owner on saved_folder (owner_id);

-- saved_post: a bookmark linking a human to a post, optionally in a folder
create table saved_post (
  id          uuid primary key default uuid_generate_v4(),
  human_id    uuid not null references human (id) on delete cascade,
  post_id     uuid not null references post (id) on delete cascade,
  folder_id   uuid references saved_folder (id) on delete set null,
  created_at  timestamptz not null default now(),
  constraint saved_post_unique unique (human_id, post_id)
);

create index saved_post_human   on saved_post (human_id, created_at desc);
create index saved_post_folder  on saved_post (folder_id) where folder_id is not null;
create index saved_post_post    on saved_post (post_id);

-- updated_at trigger for saved_folder
create trigger saved_folder_updated_at
  before update on saved_folder
  for each row execute function set_updated_at();

-- RLS
alter table saved_folder enable row level security;
alter table saved_post   enable row level security;

-- saved_folder policies: owner only
create policy "saved_folder: owner read" on saved_folder
  for select using (owner_id = auth.uid());

create policy "saved_folder: owner insert" on saved_folder
  for insert with check (owner_id = auth.uid());

create policy "saved_folder: owner update" on saved_folder
  for update using (owner_id = auth.uid());

create policy "saved_folder: owner delete" on saved_folder
  for delete using (owner_id = auth.uid());

-- saved_post policies: owner only
create policy "saved_post: owner read" on saved_post
  for select using (human_id = auth.uid());

create policy "saved_post: owner insert" on saved_post
  for insert with check (human_id = auth.uid());

create policy "saved_post: owner delete" on saved_post
  for delete using (human_id = auth.uid());
