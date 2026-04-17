create or replace function get_feed(user_id uuid)
returns setof post
language sql
security definer
stable
as $$
  select distinct p.*
  from post p
  left join post_dogs pd on pd.post_id = p.id
  left join dog_breeds db on db.dog_id = pd.dog_id
  where p.is_private = false
    and (
      exists (select 1 from follow f where f.follower_id = user_id and f.target_human_id = p.author_id)
      or exists (select 1 from follow f where f.follower_id = user_id and f.target_dog_id = pd.dog_id)
      or exists (select 1 from follow f where f.follower_id = user_id and f.target_breed_id = db.breed_id)
    )
  order by p.created_at desc
  limit 50;
$$;
