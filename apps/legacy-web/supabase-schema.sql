create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  username_normalized text not null unique,
  auth_email text not null unique,
  avatar text not null default 'chef',
  expertise_rating integer not null default 1000,
  accepted_recommendation_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.restaurants (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  visibility text not null check (visibility in ('privado', 'publico')),
  rating integer check (rating between 1 and 5),
  comment text not null default '',
  price text not null default '€',
  hashtags text[] not null default '{}',
  place_id text not null default '',
  address text not null default '',
  location jsonb,
  source text not null default 'manual',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.desired_restaurants (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  visibility text not null default 'privado' check (visibility in ('privado', 'publico')),
  rating integer check (rating between 1 and 5),
  comment text not null default '',
  price text not null default '',
  hashtags text[] not null default '{}',
  place_id text not null default '',
  address text not null default '',
  location jsonb,
  source text not null default 'manual',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.recommendations (
  id bigint generated always as identity primary key,
  original_restaurant_id bigint references public.restaurants(id) on delete set null,
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  restaurant_name text not null,
  place_id text not null default '',
  address text not null default '',
  location jsonb,
  rating integer check (rating between 1 and 5),
  comment text not null default '',
  price text not null,
  hashtags text[] not null default '{}',
  visibility text not null check (visibility in ('privado', 'publico')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.recommendation_actions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  recommendation_id bigint not null references public.recommendations(id) on delete cascade,
  action text not null check (action in ('accepted', 'rejected')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, recommendation_id)
);

alter table public.restaurants add column if not exists rating integer;
alter table public.restaurants add column if not exists comment text not null default '';
alter table public.desired_restaurants add column if not exists rating integer;
alter table public.desired_restaurants add column if not exists comment text not null default '';
alter table public.recommendations add column if not exists rating integer;
alter table public.recommendations add column if not exists comment text not null default '';

create table if not exists public.friendships (
  user_id uuid not null references public.profiles(id) on delete cascade,
  friend_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, friend_user_id),
  check (user_id <> friend_user_id)
);

create index if not exists restaurants_user_id_idx on public.restaurants (user_id, created_at desc);
create index if not exists desired_restaurants_user_id_idx on public.desired_restaurants (user_id, created_at desc);
create index if not exists recommendations_owner_user_id_idx on public.recommendations (owner_user_id, created_at desc);
create index if not exists recommendation_actions_user_id_idx on public.recommendation_actions (user_id, created_at desc);
create index if not exists friendships_user_id_idx on public.friendships (user_id);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    username,
    username_normalized,
    auth_email,
    avatar
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'username_normalized', split_part(new.email, '@', 1)),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'avatar', 'chef')
  )
  on conflict (id) do update
  set
    username = excluded.username,
    username_normalized = excluded.username_normalized,
    auth_email = excluded.auth_email,
    avatar = excluded.avatar;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user_profile();

create or replace function public.handle_friendship_mirror()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id = new.friend_user_id then
    return new;
  end if;

  insert into public.friendships (user_id, friend_user_id)
  values (new.friend_user_id, new.user_id)
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists friendships_after_insert on public.friendships;
create trigger friendships_after_insert
after insert on public.friendships
for each row execute function public.handle_friendship_mirror();

create or replace function public.handle_recommendation_acceptance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
  owner_rating integer;
  viewer_rating integer;
  expected_score numeric;
  rating_delta integer;
begin
  if new.action <> 'accepted' then
    return new;
  end if;

  select owner_user_id into owner_id
  from public.recommendations
  where id = new.recommendation_id;

  if owner_id is null or owner_id = new.user_id then
    return new;
  end if;

  select expertise_rating into owner_rating
  from public.profiles
  where id = owner_id;

  select expertise_rating into viewer_rating
  from public.profiles
  where id = new.user_id;

  owner_rating := coalesce(owner_rating, 1000);
  viewer_rating := coalesce(viewer_rating, 1000);
  expected_score := 1 / (1 + power(10, ((viewer_rating - owner_rating)::numeric / 400)));
  rating_delta := greatest(1, round(32 * (1 - expected_score))::integer);

  update public.profiles
  set
    expertise_rating = expertise_rating + rating_delta,
    accepted_recommendation_count = accepted_recommendation_count + 1
  where id = owner_id;

  return new;
end;
$$;

drop trigger if exists recommendation_actions_after_insert on public.recommendation_actions;
create trigger recommendation_actions_after_insert
after insert on public.recommendation_actions
for each row execute function public.handle_recommendation_acceptance();

alter table public.profiles enable row level security;
alter table public.restaurants enable row level security;
alter table public.desired_restaurants enable row level security;
alter table public.recommendations enable row level security;
alter table public.recommendation_actions enable row level security;
alter table public.friendships enable row level security;

drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all"
on public.profiles for select
using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "restaurants_select_visible" on public.restaurants;
create policy "restaurants_select_visible"
on public.restaurants for select
using (visibility = 'publico' or user_id = auth.uid());

drop policy if exists "restaurants_insert_own" on public.restaurants;
create policy "restaurants_insert_own"
on public.restaurants for insert
with check (user_id = auth.uid());

drop policy if exists "restaurants_update_own" on public.restaurants;
create policy "restaurants_update_own"
on public.restaurants for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "restaurants_delete_own" on public.restaurants;
create policy "restaurants_delete_own"
on public.restaurants for delete
using (user_id = auth.uid());

drop policy if exists "desired_select_own" on public.desired_restaurants;
create policy "desired_select_own"
on public.desired_restaurants for select
using (user_id = auth.uid());

drop policy if exists "desired_insert_own" on public.desired_restaurants;
create policy "desired_insert_own"
on public.desired_restaurants for insert
with check (user_id = auth.uid());

drop policy if exists "desired_update_own" on public.desired_restaurants;
create policy "desired_update_own"
on public.desired_restaurants for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "desired_delete_own" on public.desired_restaurants;
create policy "desired_delete_own"
on public.desired_restaurants for delete
using (user_id = auth.uid());

drop policy if exists "recommendations_select_all" on public.recommendations;
create policy "recommendations_select_all"
on public.recommendations for select
using (true);

drop policy if exists "recommendations_insert_own" on public.recommendations;
create policy "recommendations_insert_own"
on public.recommendations for insert
with check (owner_user_id = auth.uid());

drop policy if exists "recommendations_delete_own" on public.recommendations;
create policy "recommendations_delete_own"
on public.recommendations for delete
using (owner_user_id = auth.uid());

drop policy if exists "recommendation_actions_select_own" on public.recommendation_actions;
create policy "recommendation_actions_select_own"
on public.recommendation_actions for select
using (user_id = auth.uid());

drop policy if exists "recommendation_actions_insert_own" on public.recommendation_actions;
create policy "recommendation_actions_insert_own"
on public.recommendation_actions for insert
with check (user_id = auth.uid());

drop policy if exists "friendships_select_all" on public.friendships;
create policy "friendships_select_all"
on public.friendships for select
using (true);

drop policy if exists "friendships_insert_own" on public.friendships;
create policy "friendships_insert_own"
on public.friendships for insert
with check (user_id = auth.uid());
