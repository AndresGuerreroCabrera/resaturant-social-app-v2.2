create extension if not exists pgcrypto;

create schema app;

create type app.place_provider as enum (
  'google_places'
);

create type app.entry_visibility as enum (
  'public',
  'private'
);

create type app.user_place_status as enum (
  'wishlist',
  'visited'
);

create type app.recommendation_reaction_kind as enum (
  'accepted',
  'rejected'
);

create type app.reputation_event_type as enum (
  'recommendation_accepted'
);

create table app.public_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  handle text not null,
  display_name text not null,
  avatar_key text,
  bio text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint public_profiles_handle_unique unique (handle),
  constraint public_profiles_handle_lowercase_check check (handle = lower(handle)),
  constraint public_profiles_handle_format_check check (
    handle ~ '^[a-z0-9](?:[a-z0-9._-]{1,28}[a-z0-9])?$'
  ),
  constraint public_profiles_display_name_length_check check (
    char_length(display_name) between 1 and 80
  ),
  constraint public_profiles_bio_length_check check (
    bio is null or char_length(bio) <= 280
  )
);

create table app.private_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table app.places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  formatted_address text,
  locality text,
  region text,
  country_code char(2),
  latitude double precision,
  longitude double precision,
  dedupe_key text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint places_name_length_check check (char_length(name) between 1 and 120),
  constraint places_country_code_uppercase_check check (
    country_code is null or btrim(country_code) ~ '^[A-Z]{2}$'
  ),
  constraint places_coordinates_pair_check check (
    (latitude is null and longitude is null)
    or (latitude is not null and longitude is not null)
  ),
  constraint places_latitude_range_check check (
    latitude is null or latitude between -90 and 90
  ),
  constraint places_longitude_range_check check (
    longitude is null or longitude between -180 and 180
  )
);

create table app.place_provider_references (
  provider app.place_provider not null,
  provider_place_id text not null,
  place_id uuid not null references app.places (id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (provider, provider_place_id),
  constraint place_provider_references_provider_place_id_length_check check (
    char_length(trim(provider_place_id)) between 1 and 160
  )
);

create table app.user_place_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  place_id uuid not null references app.places (id),
  status app.user_place_status not null,
  visibility app.entry_visibility not null,
  is_hidden boolean not null default false,
  note text,
  tags text[] not null default '{}'::text[],
  visited_at timestamptz,
  rating smallint,
  price_tier text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_place_entries_user_place_unique unique (user_id, place_id),
  constraint user_place_entries_id_user_place_unique unique (id, user_id, place_id),
  constraint user_place_entries_tags_cardinality_check check (
    coalesce(cardinality(tags), 0) <= 12
  ),
  constraint user_place_entries_note_length_check check (
    note is null or char_length(note) <= 2000
  ),
  constraint user_place_entries_rating_range_check check (
    rating is null or rating between 1 and 5
  ),
  constraint user_place_entries_price_tier_length_check check (
    price_tier is null or char_length(price_tier) between 1 and 8
  ),
  constraint user_place_entries_status_shape_check check (
    (
      status = 'wishlist'
      and visibility = 'private'
      and visited_at is null
      and rating is null
      and price_tier is null
    )
    or (
      status = 'visited'
      and visibility in ('public', 'private')
    )
  )
);

create table app.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id_a uuid not null references auth.users (id) on delete cascade,
  user_id_b uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  constraint friendships_user_pair_unique unique (user_id_a, user_id_b),
  constraint friendships_distinct_users_check check (user_id_a <> user_id_b),
  constraint friendships_canonical_order_check check (user_id_a::text < user_id_b::text)
);

create table app.recommendation_posts (
  id uuid primary key default gen_random_uuid(),
  author_user_id uuid not null references auth.users (id) on delete cascade,
  place_id uuid not null references app.places (id),
  source_entry_id uuid not null,
  cycle_iso_year smallint not null,
  cycle_iso_week smallint not null,
  cycle_timezone text not null,
  snapshot_place_name text not null,
  snapshot_formatted_address text,
  snapshot_locality text,
  snapshot_region text,
  snapshot_country_code char(2),
  snapshot_latitude double precision,
  snapshot_longitude double precision,
  snapshot_rating smallint,
  snapshot_note text,
  snapshot_price_tier text,
  snapshot_tags text[] not null default '{}'::text[],
  created_at timestamptz not null default timezone('utc', now()),
  removed_at timestamptz,
  constraint recommendation_posts_author_place_unique unique (author_user_id, place_id),
  constraint recommendation_posts_source_entry_fk foreign key (
    source_entry_id,
    author_user_id,
    place_id
  ) references app.user_place_entries (id, user_id, place_id),
  constraint recommendation_posts_cycle_year_check check (cycle_iso_year between 2000 and 9999),
  constraint recommendation_posts_cycle_week_check check (cycle_iso_week between 1 and 53),
  constraint recommendation_posts_cycle_timezone_check check (cycle_timezone = 'Europe/Madrid'),
  constraint recommendation_posts_snapshot_place_name_length_check check (
    char_length(snapshot_place_name) between 1 and 120
  ),
  constraint recommendation_posts_snapshot_country_code_check check (
    snapshot_country_code is null or btrim(snapshot_country_code) ~ '^[A-Z]{2}$'
  ),
  constraint recommendation_posts_snapshot_coordinates_pair_check check (
    (snapshot_latitude is null and snapshot_longitude is null)
    or (snapshot_latitude is not null and snapshot_longitude is not null)
  ),
  constraint recommendation_posts_snapshot_latitude_range_check check (
    snapshot_latitude is null or snapshot_latitude between -90 and 90
  ),
  constraint recommendation_posts_snapshot_longitude_range_check check (
    snapshot_longitude is null or snapshot_longitude between -180 and 180
  ),
  constraint recommendation_posts_snapshot_rating_range_check check (
    snapshot_rating is null or snapshot_rating between 1 and 5
  ),
  constraint recommendation_posts_snapshot_note_length_check check (
    snapshot_note is null or char_length(snapshot_note) <= 2000
  ),
  constraint recommendation_posts_snapshot_price_tier_length_check check (
    snapshot_price_tier is null or char_length(snapshot_price_tier) between 1 and 8
  ),
  constraint recommendation_posts_snapshot_tags_cardinality_check check (
    coalesce(cardinality(snapshot_tags), 0) <= 12
  ),
  constraint recommendation_posts_removed_after_created_check check (
    removed_at is null or removed_at >= created_at
  )
);

create table app.recommendation_reactions (
  id uuid primary key default gen_random_uuid(),
  recommendation_post_id uuid not null references app.recommendation_posts (id) on delete cascade,
  viewer_user_id uuid not null references auth.users (id) on delete cascade,
  reaction app.recommendation_reaction_kind not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint recommendation_reactions_viewer_recommendation_unique unique (
    viewer_user_id,
    recommendation_post_id
  )
);

create table app.reputation_events (
  id uuid primary key default gen_random_uuid(),
  subject_user_id uuid not null references auth.users (id) on delete cascade,
  actor_user_id uuid not null references auth.users (id) on delete cascade,
  recommendation_post_id uuid not null references app.recommendation_posts (id),
  recommendation_reaction_id uuid not null references app.recommendation_reactions (id),
  event_type app.reputation_event_type not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint reputation_events_reaction_unique unique (recommendation_reaction_id),
  constraint reputation_events_distinct_users_check check (subject_user_id <> actor_user_id)
);

create table app.reputation_summaries (
  user_id uuid primary key references auth.users (id) on delete cascade,
  score integer not null default 1000,
  accepted_recommendation_count integer not null default 0,
  expertise_level_label text,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint reputation_summaries_accepted_count_nonnegative_check check (
    accepted_recommendation_count >= 0
  )
);

create unique index places_dedupe_key_unique_idx
  on app.places (dedupe_key)
  where dedupe_key is not null;

create index places_name_idx
  on app.places (name);

create unique index place_provider_references_primary_place_unique_idx
  on app.place_provider_references (place_id)
  where is_primary;

create index place_provider_references_place_id_idx
  on app.place_provider_references (place_id);

create index user_place_entries_user_status_hidden_created_at_idx
  on app.user_place_entries (user_id, status, is_hidden, created_at desc);

create index user_place_entries_public_visited_place_created_at_idx
  on app.user_place_entries (place_id, created_at desc)
  where status = 'visited'
    and visibility = 'public'
    and is_hidden = false;

create index friendships_user_id_a_idx
  on app.friendships (user_id_a);

create index friendships_user_id_b_idx
  on app.friendships (user_id_b);

create index recommendation_posts_author_cycle_created_at_idx
  on app.recommendation_posts (
    author_user_id,
    cycle_iso_year desc,
    cycle_iso_week desc,
    created_at desc
  );

create index recommendation_posts_active_created_at_idx
  on app.recommendation_posts (created_at desc, id)
  where removed_at is null;

create index recommendation_posts_place_created_at_idx
  on app.recommendation_posts (place_id, created_at desc);

create index recommendation_reactions_recommendation_created_at_idx
  on app.recommendation_reactions (recommendation_post_id, created_at desc);

create index reputation_events_subject_created_at_idx
  on app.reputation_events (subject_user_id, created_at desc);

create index reputation_events_recommendation_created_at_idx
  on app.reputation_events (recommendation_post_id, created_at desc);

comment on column app.user_place_entries.is_hidden is
  'Ocultacion de lectura en listas por defecto; no forma parte del status canonico.';

comment on column app.recommendation_posts.removed_at is
  'Soft delete del post social; no libera cuota semanal ni permite republicar el mismo place.';
