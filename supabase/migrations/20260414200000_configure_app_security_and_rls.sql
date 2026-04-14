revoke all on schema app from public;
revoke all on schema app from anon;
revoke all on schema app from authenticated;

grant usage on schema app to authenticated;
grant usage on schema app to service_role;

grant usage on type
  app.place_provider,
  app.entry_visibility,
  app.user_place_status,
  app.recommendation_reaction_kind,
  app.reputation_event_type
to authenticated, service_role;

revoke all on all tables in schema app from public;
revoke all on all tables in schema app from anon;
revoke all on all tables in schema app from authenticated;

revoke all on all sequences in schema app from public;
revoke all on all sequences in schema app from anon;
revoke all on all sequences in schema app from authenticated;

revoke all on all functions in schema app from public;
revoke all on all functions in schema app from anon;
revoke all on all functions in schema app from authenticated;

grant all on all tables in schema app to service_role;
grant all on all sequences in schema app to service_role;
grant all on all functions in schema app to service_role;

alter default privileges in schema app
  revoke all on tables from public;
alter default privileges in schema app
  revoke all on tables from anon;
alter default privileges in schema app
  revoke all on tables from authenticated;
alter default privileges in schema app
  grant all on tables to service_role;

alter default privileges in schema app
  revoke all on sequences from public;
alter default privileges in schema app
  revoke all on sequences from anon;
alter default privileges in schema app
  revoke all on sequences from authenticated;
alter default privileges in schema app
  grant all on sequences to service_role;

alter default privileges in schema app
  revoke all on functions from public;
alter default privileges in schema app
  revoke all on functions from anon;
alter default privileges in schema app
  revoke all on functions from authenticated;
alter default privileges in schema app
  grant execute on functions to service_role;

alter table app.public_profiles enable row level security;
alter table app.private_profiles enable row level security;
alter table app.places enable row level security;
alter table app.place_provider_references enable row level security;
alter table app.user_place_entries enable row level security;
alter table app.friendships enable row level security;
alter table app.recommendation_posts enable row level security;
alter table app.recommendation_reactions enable row level security;
alter table app.reputation_events enable row level security;
alter table app.reputation_summaries enable row level security;

create policy public_profiles_select_authenticated
  on app.public_profiles
  for select
  to authenticated
  using (true);

create policy private_profiles_select_own
  on app.private_profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy user_place_entries_select_own
  on app.user_place_entries
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy friendships_select_own_network
  on app.friendships
  for select
  to authenticated
  using (auth.uid() = user_id_a or auth.uid() = user_id_b);

create policy recommendation_reactions_select_own
  on app.recommendation_reactions
  for select
  to authenticated
  using (auth.uid() = viewer_user_id);

grant select on table app.public_profiles to authenticated;
grant select on table app.private_profiles to authenticated;
grant select on table app.user_place_entries to authenticated;
grant select on table app.friendships to authenticated;
grant select on table app.recommendation_reactions to authenticated;

create view app.public_places_v
with (security_barrier = true) as
select
  p.id,
  p.name,
  p.formatted_address,
  p.locality,
  p.region,
  p.country_code,
  p.latitude,
  p.longitude,
  p.created_at,
  p.updated_at
from app.places p;

comment on view app.public_places_v is
  'Proyeccion publica segura de lugares canonicos; oculta claves internas de deduplicacion y referencias de proveedor.';

create view app.public_visited_entries_v
with (security_barrier = true) as
select
  e.id,
  e.user_id,
  e.place_id,
  e.note,
  e.tags,
  e.visited_at,
  e.rating,
  e.price_tier,
  e.created_at,
  e.updated_at
from app.user_place_entries e
where e.status = 'visited'
  and e.visibility = 'public'
  and e.is_hidden = false;

comment on view app.public_visited_entries_v is
  'Proyeccion publica segura de visitas visibles; no expone banderas internas de ocultacion ni visitas privadas.';

create view app.public_recommendation_posts_v
with (security_barrier = true) as
select
  post.id,
  post.author_user_id,
  post.place_id,
  post.cycle_iso_year,
  post.cycle_iso_week,
  post.cycle_timezone,
  post.snapshot_place_name,
  post.snapshot_formatted_address,
  post.snapshot_locality,
  post.snapshot_region,
  post.snapshot_country_code,
  post.snapshot_latitude,
  post.snapshot_longitude,
  post.snapshot_rating,
  post.snapshot_note,
  post.snapshot_price_tier,
  post.snapshot_tags,
  post.created_at
from app.recommendation_posts post
where post.removed_at is null;

comment on view app.public_recommendation_posts_v is
  'Proyeccion publica segura de recomendaciones activas; oculta la entrada origen y las columnas internas de moderacion.';

create or replace view app.public_profile_stats_v
with (security_barrier = true) as
select
  p.user_id,
  coalesce(v.public_visited_count, 0)::integer as public_visited_count,
  coalesce(rp.published_recommendation_count, 0)::integer as published_recommendation_count,
  coalesce(rs.accepted_recommendation_count, 0)::integer as accepted_recommendation_count,
  coalesce(rs.score, 1000)::integer as reputation_score,
  rs.expertise_level_label
from app.public_profiles p
left join lateral (
  select count(*) as public_visited_count
  from app.user_place_entries e
  where e.user_id = p.user_id
    and e.status = 'visited'
    and e.visibility = 'public'
    and e.is_hidden = false
) v on true
left join lateral (
  select count(*) as published_recommendation_count
  from app.recommendation_posts post
  where post.author_user_id = p.user_id
    and post.removed_at is null
) rp on true
left join app.reputation_summaries rs
  on rs.user_id = p.user_id;

comment on view app.public_profile_stats_v is
  'Read model publico seguro para stats y reputacion visible de perfil; evita exponer tablas internas de reputacion.';

revoke all on table app.public_places_v from public;
revoke all on table app.public_places_v from anon;
revoke all on table app.public_places_v from authenticated;
grant select on table app.public_places_v to authenticated;
grant select on table app.public_places_v to service_role;

revoke all on table app.public_visited_entries_v from public;
revoke all on table app.public_visited_entries_v from anon;
revoke all on table app.public_visited_entries_v from authenticated;
grant select on table app.public_visited_entries_v to authenticated;
grant select on table app.public_visited_entries_v to service_role;

revoke all on table app.public_recommendation_posts_v from public;
revoke all on table app.public_recommendation_posts_v from anon;
revoke all on table app.public_recommendation_posts_v from authenticated;
grant select on table app.public_recommendation_posts_v to authenticated;
grant select on table app.public_recommendation_posts_v to service_role;

revoke all on table app.public_profile_stats_v from public;
revoke all on table app.public_profile_stats_v from anon;
revoke all on table app.public_profile_stats_v from authenticated;
grant select on table app.public_profile_stats_v to authenticated;
grant select on table app.public_profile_stats_v to service_role;
