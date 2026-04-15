create schema backfill;

revoke all on schema backfill from public;
revoke all on schema backfill from anon;
revoke all on schema backfill from authenticated;

grant usage on schema backfill to service_role;

alter default privileges in schema backfill
  revoke all on tables from public;
alter default privileges in schema backfill
  revoke all on tables from anon;
alter default privileges in schema backfill
  revoke all on tables from authenticated;
alter default privileges in schema backfill
  grant all on tables to service_role;

alter default privileges in schema backfill
  revoke all on sequences from public;
alter default privileges in schema backfill
  revoke all on sequences from anon;
alter default privileges in schema backfill
  revoke all on sequences from authenticated;
alter default privileges in schema backfill
  grant all on sequences to service_role;

alter default privileges in schema backfill
  revoke all on functions from public;
alter default privileges in schema backfill
  revoke all on functions from anon;
alter default privileges in schema backfill
  revoke all on functions from authenticated;
alter default privileges in schema backfill
  grant execute on functions to service_role;

create or replace function backfill.uuid_from_text(input text)
returns uuid
language sql
immutable
as $$
  select (
    substr(md5(coalesce(input, '')), 1, 8) || '-' ||
    substr(md5(coalesce(input, '')), 9, 4) || '-' ||
    substr(md5(coalesce(input, '')), 13, 4) || '-' ||
    substr(md5(coalesce(input, '')), 17, 4) || '-' ||
    substr(md5(coalesce(input, '')), 21, 12)
  )::uuid;
$$;

create or replace function backfill.normalize_text(input text)
returns text
language sql
immutable
as $$
  select trim(
    regexp_replace(
      lower(coalesce(input, '')),
      '\s+',
      ' ',
      'g'
    )
  );
$$;

create or replace function backfill.clean_legacy_tags(input_tags text[])
returns text[]
language sql
immutable
as $$
  select coalesce(
    array(
      select tag
      from (
        select
          min(ordinality) as ordinality,
          nullif(trim(raw_tag), '') as tag
        from unnest(coalesce(input_tags, '{}'::text[])) with ordinality as t(raw_tag, ordinality)
        group by nullif(trim(raw_tag), '')
      ) deduped
      where tag is not null
      order by ordinality
    ),
    '{}'::text[]
  );
$$;

create or replace function backfill.normalize_legacy_price_tier(input text)
returns text
language sql
immutable
as $$
  select case trim(coalesce(input, ''))
    when '' then null
    else left(trim(input), 8)
  end;
$$;

create or replace function backfill.extract_latitude(location jsonb)
returns double precision
language sql
immutable
as $$
  select case
    when jsonb_typeof(location) = 'object'
      and (location ? 'lat')
      and trim(coalesce(location ->> 'lat', '')) ~ '^[-+]?[0-9]+(\.[0-9]+)?$'
    then (location ->> 'lat')::double precision
    else null
  end;
$$;

create or replace function backfill.extract_longitude(location jsonb)
returns double precision
language sql
immutable
as $$
  select case
    when jsonb_typeof(location) = 'object'
      and (location ? 'lng')
      and trim(coalesce(location ->> 'lng', '')) ~ '^[-+]?[0-9]+(\.[0-9]+)?$'
    then (location ->> 'lng')::double precision
    else null
  end;
$$;

create table backfill.profile_mappings (
  legacy_user_id uuid primary key,
  v2_user_id uuid not null unique references auth.users (id) on delete cascade,
  resolved_handle text not null,
  handle_strategy text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table backfill.place_mappings (
  legacy_table text not null,
  legacy_id bigint not null,
  resolution_key text not null,
  match_strategy text not null,
  legacy_provider_place_id text,
  v2_place_id uuid not null references app.places (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (legacy_table, legacy_id)
);

create table backfill.user_place_entry_mappings (
  legacy_table text not null,
  legacy_id bigint not null,
  v2_user_place_entry_id uuid not null references app.user_place_entries (id) on delete cascade,
  mapping_strategy text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (legacy_table, legacy_id)
);

create table backfill.recommendation_post_mappings (
  legacy_recommendation_id bigint primary key,
  v2_recommendation_post_id uuid not null references app.recommendation_posts (id) on delete cascade,
  source_entry_strategy text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table backfill.recommendation_reaction_mappings (
  legacy_recommendation_action_id bigint primary key,
  v2_recommendation_post_id uuid not null references app.recommendation_posts (id) on delete cascade,
  v2_recommendation_reaction_id uuid not null references app.recommendation_reactions (id) on delete cascade,
  resulting_entry_action text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table backfill.friendship_mappings (
  legacy_user_id uuid not null,
  legacy_friend_user_id uuid not null,
  v2_friendship_id uuid not null references app.friendships (id) on delete cascade,
  mapping_strategy text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (legacy_user_id, legacy_friend_user_id)
);

create table backfill.skipped_records (
  legacy_table text not null,
  legacy_key text not null,
  reason_code text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (legacy_table, legacy_key, reason_code),
  constraint skipped_records_details_object_check check (
    jsonb_typeof(details) = 'object'
  )
);

create index place_mappings_v2_place_id_idx
  on backfill.place_mappings (v2_place_id);

create index place_mappings_resolution_key_idx
  on backfill.place_mappings (resolution_key);

create index user_place_entry_mappings_v2_entry_id_idx
  on backfill.user_place_entry_mappings (v2_user_place_entry_id);

create index recommendation_post_mappings_v2_post_id_idx
  on backfill.recommendation_post_mappings (v2_recommendation_post_id);

create index recommendation_reaction_mappings_v2_reaction_id_idx
  on backfill.recommendation_reaction_mappings (v2_recommendation_reaction_id);

create index friendship_mappings_v2_friendship_id_idx
  on backfill.friendship_mappings (v2_friendship_id);

create index skipped_records_reason_code_idx
  on backfill.skipped_records (reason_code);

create index skipped_records_legacy_table_idx
  on backfill.skipped_records (legacy_table);

comment on schema backfill is
  'Estructuras operativas para backfill v1 -> v2: mappings, skips y utilidades de reconciliacion; no forma parte del dominio canonico.';

comment on function backfill.uuid_from_text(text) is
  'Genera UUID deterministas para hacer reejecutable el backfill sin duplicar filas en v2.';

comment on table backfill.place_mappings is
  'Traza como se resolvio cada fila legacy con informacion de lugar hacia un place canonico de v2.';

comment on table backfill.user_place_entry_mappings is
  'Relaciona filas legacy y entradas sinteticas por aceptacion con la fila unificada user_place_entry en v2.';

comment on table backfill.skipped_records is
  'Registro de filas legacy que no migran a v2 o que solo migran parcialmente por reglas de dominio o calidad de datos.';

revoke all on all tables in schema backfill from public;
revoke all on all tables in schema backfill from anon;
revoke all on all tables in schema backfill from authenticated;

revoke all on all sequences in schema backfill from public;
revoke all on all sequences in schema backfill from anon;
revoke all on all sequences in schema backfill from authenticated;

revoke all on all functions in schema backfill from public;
revoke all on all functions in schema backfill from anon;
revoke all on all functions in schema backfill from authenticated;

grant all on all tables in schema backfill to service_role;
grant all on all sequences in schema backfill to service_role;
grant execute on all functions in schema backfill to service_role;
