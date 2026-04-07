-- Dogish schema
-- Reflects current state of the database after all migrations have been applied.

-- Extensions
create extension if not exists "uuid-ossp";

-- Enums
create type dog_size as enum ('xs', 'small', 'medium', 'large', 'xl');
create type dog_sex as enum ('male', 'female', 'unknown');
create type kit_item_type as enum ('food', 'treat', 'toy', 'gear', 'health', 'grooming', 'other');

-- breed
create table breed (
  id   uuid primary key default uuid_generate_v4(),
  name text not null unique
);

-- dog
create table dog (
  id               uuid primary key default uuid_generate_v4(),
  owner_id         uuid not null references auth.users (id) on delete cascade,
  name             text not null,
  avatar           text,
  birthday         date,
  size             dog_size,
  sex              dog_sex not null default 'unknown',
  bio              text,
  location         text,
  allergies        text[],
  personality_tags text[],
  mix_description  text,
  is_private       boolean not null default false,
  created_at       timestamptz not null default now()
);

create index dog_owner on dog (owner_id);

-- dog_breeds
create table dog_breeds (
  dog_id     uuid not null references dog (id) on delete cascade,
  breed_id   uuid not null references breed (id) on delete cascade,
  is_primary boolean not null default false,
  primary key (dog_id, breed_id)
);

-- kit  (formerly: pack)
create table kit (
  id         uuid primary key default uuid_generate_v4(),
  owner_id   uuid not null references auth.users (id) on delete cascade,
  dog_id     uuid references dog (id) on delete set null,
  name       text not null,
  is_public  boolean not null default true,
  created_at timestamptz not null default now()
);

create index kit_owner on kit (owner_id);

-- kit_items  (formerly: pack_items)
create table kit_items (
  id         uuid primary key default uuid_generate_v4(),
  kit_id     uuid not null references kit (id) on delete cascade,
  item_type  kit_item_type not null default 'other',
  name       text not null,
  brand      text,
  url        text,
  notes      text,
  created_at timestamptz not null default now()
);

create index kit_items_kit on kit_items (kit_id);

-- Row-level security
alter table dog enable row level security;
alter table dog_breeds enable row level security;
alter table kit enable row level security;
alter table kit_items enable row level security;

-- dog policies
create policy "dog: read public"
  on dog for select using (is_private = false or owner_id = auth.uid());

create policy "dog: insert own"
  on dog for insert with check (owner_id = auth.uid());

create policy "dog: update own"
  on dog for update using (owner_id = auth.uid());

create policy "dog: delete own"
  on dog for delete using (owner_id = auth.uid());

-- dog_breeds policies
create policy "dog_breeds: read"
  on dog_breeds for select using (true);

create policy "dog_breeds: write own dog"
  on dog_breeds for all using (
    exists (select 1 from dog where dog.id = dog_breeds.dog_id and dog.owner_id = auth.uid())
  );

-- kit policies  (formerly: pack policies)
create policy "kit: read public"
  on kit for select using (is_public = true or owner_id = auth.uid());

create policy "kit: insert own"
  on kit for insert with check (owner_id = auth.uid());

create policy "kit: update own"
  on kit for update using (owner_id = auth.uid());

create policy "kit: delete own"
  on kit for delete using (owner_id = auth.uid());

-- kit_items policies  (formerly: pack_items policies)
create policy "kit_items: read"
  on kit_items for select using (
    exists (select 1 from kit where kit.id = kit_items.kit_id and (kit.is_public = true or kit.owner_id = auth.uid()))
  );

create policy "kit_items: write own kit"
  on kit_items for all using (
    exists (select 1 from kit where kit.id = kit_items.kit_id and kit.owner_id = auth.uid())
  );
