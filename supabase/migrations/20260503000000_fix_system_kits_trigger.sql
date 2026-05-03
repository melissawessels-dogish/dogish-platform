-- Fix create_system_kits_for_human function and harden the kit type column.
--
-- Problem: signup was failing with "new row violates row-level security policy
-- for table kit" because the kit insert policy requires owner_id = auth.uid(),
-- but auth.uid() is null at signup-trigger time.
--
-- Fix: SECURITY DEFINER function with explicit search_path, plus a postgres-role
-- insert policy. Also converts kit.type from free text to a kit_type enum and
-- enforces one system kit of each type per user.

-- 1. Enum for system kit types
create type kit_type as enum ('saved', 'favorite_places');

-- 2. Clear any pre-existing free-form type values from test data
update public.kit set type = null where type is not null;

-- 3. Convert the column to the enum
alter table public.kit
  alter column type type kit_type using type::kit_type;

-- 4. One Saved + one Favorite Places per user, enforced at the DB level
create unique index kit_one_system_per_user
  on public.kit (owner_id, type)
  where is_system = true;

-- 5. Updated trigger function with type values and SECURITY DEFINER
create or replace function public.create_system_kits_for_human()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.kit (owner_id, title, is_private, is_system, type)
  values
    (new.id, 'Saved', false, true, 'saved'),
    (new.id, 'Favorite Places', false, true, 'favorite_places');
  return new;
end;
$$;

-- 6. Allow the SECURITY DEFINER function to bypass RLS on kit
create policy "kit: system insert via trigger"
on public.kit
for insert
to postgres
with check (true);
