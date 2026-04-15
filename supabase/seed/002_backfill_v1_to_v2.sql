begin;

delete from backfill.friendship_mappings;
delete from backfill.recommendation_reaction_mappings;
delete from backfill.recommendation_post_mappings;
delete from backfill.user_place_entry_mappings;
delete from backfill.place_mappings;
delete from backfill.profile_mappings;
delete from backfill.skipped_records;

with raw_profiles as (
  select
    profile.id as legacy_user_id,
    profile.id as v2_user_id,
    profile.username,
    profile.username_normalized,
    profile.avatar,
    profile.created_at,
    coalesce(
      nullif(trim(profile.username_normalized), ''),
      nullif(trim(profile.username), ''),
      'user-' || substr(replace(profile.id::text, '-', ''), 1, 6)
    ) as handle_seed
  from public.profiles profile
),
normalized_profiles as (
  select
    raw_profiles.*,
    trim(
      both '-._' from regexp_replace(
        regexp_replace(
          backfill.normalize_text(handle_seed),
          '[^a-z0-9._-]+',
          '-',
          'g'
        ),
        '[-._]{2,}',
        '-',
        'g'
      )
    ) as normalized_handle_seed
  from raw_profiles
),
base_profiles as (
  select
    normalized_profiles.*,
    case
      when normalized_handle_seed ~ '^[a-z0-9](?:[a-z0-9._-]{1,28}[a-z0-9])?$'
        or normalized_handle_seed ~ '^[a-z0-9]$'
      then normalized_handle_seed
      else 'user-' || substr(replace(legacy_user_id::text, '-', ''), 1, 6)
    end as base_handle
  from normalized_profiles
),
ranked_profiles as (
  select
    base_profiles.*,
    row_number() over (
      partition by base_handle
      order by created_at asc, legacy_user_id asc
    ) as handle_rank
  from base_profiles
),
resolved_profiles as (
  select
    ranked_profiles.legacy_user_id,
    ranked_profiles.v2_user_id,
    case
      when handle_rank = 1 then base_handle
      else
        left(
          base_handle,
          greatest(
            1,
            30 - 1 - length(substr(replace(legacy_user_id::text, '-', ''), 1, 6))
          )
        ) || '-' || substr(replace(legacy_user_id::text, '-', ''), 1, 6)
    end as resolved_handle,
    case
      when handle_rank = 1 and base_handle = username_normalized then 'legacy_username_normalized'
      when handle_rank = 1 then 'normalized_username'
      else 'deduplicated_with_suffix'
    end as handle_strategy,
    coalesce(nullif(trim(username), ''), base_handle) as display_name,
    nullif(trim(avatar), '') as avatar_key,
    created_at
  from ranked_profiles
)
insert into backfill.profile_mappings (
  legacy_user_id,
  v2_user_id,
  resolved_handle,
  handle_strategy
)
select
  resolved_profiles.legacy_user_id,
  resolved_profiles.v2_user_id,
  resolved_profiles.resolved_handle,
  resolved_profiles.handle_strategy
from resolved_profiles
on conflict (legacy_user_id) do update
set
  v2_user_id = excluded.v2_user_id,
  resolved_handle = excluded.resolved_handle,
  handle_strategy = excluded.handle_strategy,
  updated_at = timezone('utc', now());

insert into app.public_profiles (
  user_id,
  handle,
  display_name,
  avatar_key,
  bio,
  created_at,
  updated_at
)
select
  resolved_profiles.v2_user_id,
  resolved_profiles.resolved_handle,
  left(resolved_profiles.display_name, 80),
  resolved_profiles.avatar_key,
  null,
  resolved_profiles.created_at,
  resolved_profiles.created_at
from (
  select
    mapping.v2_user_id,
    mapping.resolved_handle,
    coalesce(nullif(trim(profile.username), ''), mapping.resolved_handle) as display_name,
    nullif(trim(profile.avatar), '') as avatar_key,
    profile.created_at
  from backfill.profile_mappings mapping
  join public.profiles profile
    on profile.id = mapping.legacy_user_id
) resolved_profiles
on conflict (user_id) do update
set
  handle = excluded.handle,
  display_name = excluded.display_name,
  avatar_key = excluded.avatar_key,
  bio = excluded.bio,
  updated_at = excluded.updated_at;

insert into app.private_profiles (
  user_id,
  onboarding_completed_at,
  created_at,
  updated_at
)
select
  mapping.v2_user_id,
  profile.created_at,
  profile.created_at,
  profile.created_at
from backfill.profile_mappings mapping
join public.profiles profile
  on profile.id = mapping.legacy_user_id
on conflict (user_id) do update
set
  onboarding_completed_at = excluded.onboarding_completed_at,
  updated_at = excluded.updated_at;

insert into backfill.skipped_records (
  legacy_table,
  legacy_key,
  reason_code,
  details
)
select
  source.legacy_table,
  source.legacy_id::text,
  'blank_name',
  jsonb_build_object(
    'legacy_table', source.legacy_table,
    'legacy_id', source.legacy_id
  )
from (
  select 'restaurants'::text as legacy_table, restaurant.id as legacy_id, restaurant.name
  from public.restaurants restaurant
  union all
  select 'desired_restaurants'::text as legacy_table, desired.id as legacy_id, desired.name
  from public.desired_restaurants desired
  union all
  select 'recommendations'::text as legacy_table, recommendation.id as legacy_id, recommendation.restaurant_name as name
  from public.recommendations recommendation
) source
where backfill.normalize_text(source.name) = ''
on conflict (legacy_table, legacy_key, reason_code) do update
set
  details = excluded.details,
  updated_at = timezone('utc', now());

create temporary table tmp_legacy_place_candidates
on commit drop as
with candidate_rows as (
  select
    'restaurants'::text as legacy_table,
    restaurant.id as legacy_id,
    restaurant.name,
    nullif(trim(restaurant.address), '') as formatted_address,
    nullif(trim(restaurant.place_id), '') as provider_place_id,
    backfill.extract_latitude(restaurant.location) as latitude,
    backfill.extract_longitude(restaurant.location) as longitude,
    restaurant.created_at,
    1 as source_priority
  from public.restaurants restaurant
  where backfill.normalize_text(restaurant.name) <> ''
  union all
  select
    'desired_restaurants'::text as legacy_table,
    desired.id as legacy_id,
    desired.name,
    nullif(trim(desired.address), '') as formatted_address,
    nullif(trim(desired.place_id), '') as provider_place_id,
    backfill.extract_latitude(desired.location) as latitude,
    backfill.extract_longitude(desired.location) as longitude,
    desired.created_at,
    2 as source_priority
  from public.desired_restaurants desired
  where backfill.normalize_text(desired.name) <> ''
  union all
  select
    'recommendations'::text as legacy_table,
    recommendation.id as legacy_id,
    recommendation.restaurant_name as name,
    nullif(trim(recommendation.address), '') as formatted_address,
    nullif(trim(recommendation.place_id), '') as provider_place_id,
    backfill.extract_latitude(recommendation.location) as latitude,
    backfill.extract_longitude(recommendation.location) as longitude,
    recommendation.created_at,
    3 as source_priority
  from public.recommendations recommendation
  where backfill.normalize_text(recommendation.restaurant_name) <> ''
),
normalized_candidates as (
  select
    candidate_rows.*,
    backfill.normalize_text(candidate_rows.name) as normalized_name,
    backfill.normalize_text(candidate_rows.formatted_address) as normalized_address,
    (
      select provider_candidate.provider_place_id
      from candidate_rows provider_candidate
      where provider_candidate.provider_place_id is not null
        and backfill.normalize_text(candidate_rows.formatted_address) <> ''
        and backfill.normalize_text(provider_candidate.formatted_address) <> ''
        and backfill.normalize_text(provider_candidate.name) = backfill.normalize_text(candidate_rows.name)
        and backfill.normalize_text(provider_candidate.formatted_address) = backfill.normalize_text(candidate_rows.formatted_address)
      order by provider_candidate.created_at asc, provider_candidate.legacy_id asc
      limit 1
    ) as matched_provider_place_id
  from candidate_rows
)
select
  normalized_candidates.*,
  case
    when normalized_candidates.provider_place_id is not null
      then 'google_places:' || normalized_candidates.provider_place_id
    when normalized_candidates.matched_provider_place_id is not null
      then 'google_places:' || normalized_candidates.matched_provider_place_id
    when normalized_candidates.normalized_name <> ''
      and normalized_candidates.normalized_address <> ''
      then 'name_address:' || md5(
        normalized_candidates.normalized_name || '|' ||
        normalized_candidates.normalized_address
      )
    else 'isolated:' || normalized_candidates.legacy_table || ':' || normalized_candidates.legacy_id::text
  end as resolution_key,
  case
    when normalized_candidates.provider_place_id is not null then 'provider_reference'
    when normalized_candidates.matched_provider_place_id is not null then 'provider_reference_exact_name_address'
    when normalized_candidates.normalized_name <> ''
      and normalized_candidates.normalized_address <> ''
      then 'name_address'
    else 'isolated_legacy_row'
  end as match_strategy
from normalized_candidates;

create temporary table tmp_resolved_places
on commit drop as
select
  ranked.resolution_key,
  ranked.match_strategy,
  ranked.name,
  ranked.formatted_address,
  ranked.latitude,
  ranked.longitude,
  case
    when ranked.match_strategy = 'name_address'
      then 'legacy_name_address:' || md5(
        ranked.normalized_name || '|' || ranked.normalized_address
      )
    else null
  end as dedupe_key,
  backfill.uuid_from_text('place:' || ranked.resolution_key) as v2_place_id,
  ranked.created_at
from (
  select
    candidate.*,
    row_number() over (
      partition by candidate.resolution_key
      order by
        candidate.source_priority asc,
        case when candidate.formatted_address is null then 1 else 0 end asc,
        case when candidate.latitude is null or candidate.longitude is null then 1 else 0 end asc,
        candidate.created_at asc,
        candidate.legacy_id asc
    ) as representative_rank
  from tmp_legacy_place_candidates candidate
) ranked
where ranked.representative_rank = 1;

insert into app.places (
  id,
  name,
  formatted_address,
  locality,
  region,
  country_code,
  latitude,
  longitude,
  dedupe_key,
  created_at,
  updated_at
)
select
  resolved_place.v2_place_id,
  left(resolved_place.name, 120),
  resolved_place.formatted_address,
  null,
  null,
  null,
  resolved_place.latitude,
  resolved_place.longitude,
  resolved_place.dedupe_key,
  resolved_place.created_at,
  resolved_place.created_at
from tmp_resolved_places resolved_place
on conflict (id) do update
set
  name = excluded.name,
  formatted_address = excluded.formatted_address,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  dedupe_key = excluded.dedupe_key,
  updated_at = excluded.updated_at;

insert into app.place_provider_references (
  provider,
  provider_place_id,
  place_id,
  is_primary,
  created_at
)
select
  'google_places'::app.place_provider,
  candidate.provider_place_id,
  backfill.uuid_from_text('place:' || candidate.resolution_key),
  true,
  min(candidate.created_at) as created_at
from tmp_legacy_place_candidates candidate
where candidate.provider_place_id is not null
group by candidate.provider_place_id, candidate.resolution_key
on conflict (provider, provider_place_id) do update
set
  place_id = excluded.place_id,
  is_primary = excluded.is_primary;

insert into backfill.place_mappings (
  legacy_table,
  legacy_id,
  resolution_key,
  match_strategy,
  legacy_provider_place_id,
  v2_place_id
)
select
  candidate.legacy_table,
  candidate.legacy_id,
  candidate.resolution_key,
  candidate.match_strategy,
  candidate.provider_place_id,
  backfill.uuid_from_text('place:' || candidate.resolution_key)
from tmp_legacy_place_candidates candidate
on conflict (legacy_table, legacy_id) do update
set
  resolution_key = excluded.resolution_key,
  match_strategy = excluded.match_strategy,
  legacy_provider_place_id = excluded.legacy_provider_place_id,
  v2_place_id = excluded.v2_place_id,
  updated_at = timezone('utc', now());

create temporary table tmp_legacy_user_place_sources
on commit drop as
select
  'restaurants'::text as legacy_table,
  restaurant.id as legacy_id,
  restaurant.user_id,
  place_mapping.v2_place_id as place_id,
  'visited'::text as status,
  case
    when restaurant.visibility = 'publico' then 'public'
    else 'private'
  end as visibility,
  false as is_hidden,
  nullif(trim(restaurant.comment), '') as note,
  backfill.clean_legacy_tags(restaurant.hashtags) as tags,
  restaurant.created_at as row_created_at,
  restaurant.created_at as visited_at,
  case when restaurant.rating between 1 and 5 then restaurant.rating::smallint else null end as rating,
  backfill.normalize_legacy_price_tier(restaurant.price) as price_tier
from public.restaurants restaurant
join backfill.place_mappings place_mapping
  on place_mapping.legacy_table = 'restaurants'
 and place_mapping.legacy_id = restaurant.id
union all
select
  'desired_restaurants'::text as legacy_table,
  desired.id as legacy_id,
  desired.user_id,
  place_mapping.v2_place_id as place_id,
  'wishlist'::text as status,
  'private' as visibility,
  false as is_hidden,
  nullif(trim(desired.comment), '') as note,
  backfill.clean_legacy_tags(desired.hashtags) as tags,
  desired.created_at as row_created_at,
  null::timestamptz as visited_at,
  null::smallint as rating,
  null::text as price_tier
from public.desired_restaurants desired
join backfill.place_mappings place_mapping
  on place_mapping.legacy_table = 'desired_restaurants'
 and place_mapping.legacy_id = desired.id;

create temporary table tmp_ranked_user_place_sources
on commit drop as
select
  source.*,
  max(case when source.status = 'visited' then 1 else 0 end) over (
    partition by source.user_id, source.place_id
  ) as has_visited,
  min(source.row_created_at) over (
    partition by source.user_id, source.place_id
  ) as relation_created_at,
  max(source.row_created_at) over (
    partition by source.user_id, source.place_id
  ) as relation_updated_at,
  row_number() over (
    partition by source.user_id, source.place_id
    order by
      case when source.status = 'visited' then 0 else 1 end asc,
      source.row_created_at desc,
      source.legacy_id desc
  ) as canonical_rank
from tmp_legacy_user_place_sources source;

create temporary table tmp_canonical_user_place_entries
on commit drop as
select
  backfill.uuid_from_text(
    'user_place_entry:' || ranked.user_id::text || ':' || ranked.place_id::text
  ) as v2_entry_id,
  ranked.user_id,
  ranked.place_id,
  ranked.status,
  ranked.visibility,
  ranked.is_hidden,
  ranked.note,
  ranked.tags,
  case when ranked.status = 'visited' then ranked.visited_at else null end as visited_at,
  case when ranked.status = 'visited' then ranked.rating else null end as rating,
  case when ranked.status = 'visited' then ranked.price_tier else null end as price_tier,
  ranked.relation_created_at as created_at,
  ranked.relation_updated_at as updated_at
from tmp_ranked_user_place_sources ranked
where ranked.canonical_rank = 1;

insert into app.user_place_entries (
  id,
  user_id,
  place_id,
  status,
  visibility,
  is_hidden,
  note,
  tags,
  visited_at,
  rating,
  price_tier,
  created_at,
  updated_at
)
select
  canonical_entry.v2_entry_id,
  canonical_entry.user_id,
  canonical_entry.place_id,
  canonical_entry.status::app.user_place_status,
  canonical_entry.visibility::app.entry_visibility,
  canonical_entry.is_hidden,
  canonical_entry.note,
  canonical_entry.tags,
  canonical_entry.visited_at,
  canonical_entry.rating,
  canonical_entry.price_tier,
  canonical_entry.created_at,
  canonical_entry.updated_at
from tmp_canonical_user_place_entries canonical_entry
on conflict (id) do update
set
  status = excluded.status,
  visibility = excluded.visibility,
  is_hidden = excluded.is_hidden,
  note = excluded.note,
  tags = excluded.tags,
  visited_at = excluded.visited_at,
  rating = excluded.rating,
  price_tier = excluded.price_tier,
  updated_at = excluded.updated_at;

insert into backfill.user_place_entry_mappings (
  legacy_table,
  legacy_id,
  v2_user_place_entry_id,
  mapping_strategy
)
select
  ranked.legacy_table,
  ranked.legacy_id,
  backfill.uuid_from_text(
    'user_place_entry:' || ranked.user_id::text || ':' || ranked.place_id::text
  ) as v2_user_place_entry_id,
  case
    when ranked.has_visited = 1 and ranked.legacy_table = 'desired_restaurants'
      then 'merged_wishlist_into_visited'
    when ranked.has_visited = 1 and ranked.canonical_rank = 1
      then 'canonical_visited'
    when ranked.has_visited = 1
      then 'merged_visited_duplicate'
    when ranked.canonical_rank = 1
      then 'canonical_wishlist'
    else 'merged_wishlist_duplicate'
  end as mapping_strategy
from tmp_ranked_user_place_sources ranked
on conflict (legacy_table, legacy_id) do update
set
  v2_user_place_entry_id = excluded.v2_user_place_entry_id,
  mapping_strategy = excluded.mapping_strategy,
  updated_at = timezone('utc', now());

insert into backfill.skipped_records (
  legacy_table,
  legacy_key,
  reason_code,
  details
)
select
  'recommendations',
  recommendation.id::text,
  'private_recommendation_not_migrated',
  jsonb_build_object(
    'visibility', recommendation.visibility,
    'owner_user_id', recommendation.owner_user_id
  )
from public.recommendations recommendation
where recommendation.visibility <> 'publico'
on conflict (legacy_table, legacy_key, reason_code) do update
set
  details = excluded.details,
  updated_at = timezone('utc', now());

create temporary table tmp_legacy_recommendation_candidates
on commit drop as
with raw_candidates as (
  select
    recommendation.id as legacy_recommendation_id,
    recommendation.owner_user_id as author_user_id,
    place_mapping.v2_place_id as place_id,
    direct_source_mapping.v2_user_place_entry_id as mapped_source_entry_id,
    fallback_source_entry.id as fallback_source_entry_id,
    recommendation.restaurant_name,
    nullif(trim(recommendation.address), '') as snapshot_formatted_address,
    backfill.extract_latitude(recommendation.location) as snapshot_latitude,
    backfill.extract_longitude(recommendation.location) as snapshot_longitude,
    case when recommendation.rating between 1 and 5 then recommendation.rating::smallint else null end as snapshot_rating,
    nullif(trim(recommendation.comment), '') as snapshot_note,
    backfill.normalize_legacy_price_tier(recommendation.price) as snapshot_price_tier,
    backfill.clean_legacy_tags(recommendation.hashtags) as snapshot_tags,
    recommendation.visibility,
    recommendation.created_at,
    extract(isoyear from (recommendation.created_at at time zone 'Europe/Madrid'))::smallint as cycle_iso_year,
    extract(week from (recommendation.created_at at time zone 'Europe/Madrid'))::smallint as cycle_iso_week
  from public.recommendations recommendation
  left join backfill.place_mappings place_mapping
    on place_mapping.legacy_table = 'recommendations'
   and place_mapping.legacy_id = recommendation.id
  left join backfill.user_place_entry_mappings direct_source_mapping
    on direct_source_mapping.legacy_table = 'restaurants'
   and direct_source_mapping.legacy_id = recommendation.original_restaurant_id
  left join app.user_place_entries fallback_source_entry
    on fallback_source_entry.user_id = recommendation.owner_user_id
   and fallback_source_entry.place_id = place_mapping.v2_place_id
   and fallback_source_entry.status = 'visited'::app.user_place_status
)
select
  raw_candidates.*,
  coalesce(raw_candidates.mapped_source_entry_id, raw_candidates.fallback_source_entry_id) as source_entry_id,
  case
    when raw_candidates.mapped_source_entry_id is not null then 'original_restaurant_id'
    when raw_candidates.fallback_source_entry_id is not null then 'fallback_by_author_place'
    else null
  end as source_entry_strategy
from raw_candidates
where raw_candidates.visibility = 'publico';

create temporary table tmp_ranked_recommendation_candidates
on commit drop as
with joined_candidates as (
  select
    candidate.*,
    source_entry.user_id as source_entry_user_id,
    source_entry.place_id as source_entry_place_id,
    source_entry.status as source_entry_status,
    source_entry.visibility as source_entry_visibility,
    source_entry.is_hidden as source_entry_is_hidden,
    place.name as place_name_fallback,
    place.formatted_address as place_address_fallback
  from tmp_legacy_recommendation_candidates candidate
  left join app.user_place_entries source_entry
    on source_entry.id = candidate.source_entry_id
  left join app.places place
    on place.id = candidate.place_id
),
classified_candidates as (
  select
    joined_candidates.*,
    case
      when joined_candidates.place_id is null then 'place_unresolved'
      when joined_candidates.source_entry_id is null then 'source_entry_unresolved'
      when joined_candidates.source_entry_user_id is distinct from joined_candidates.author_user_id
        or joined_candidates.source_entry_place_id is distinct from joined_candidates.place_id
        then 'source_entry_mismatch'
      when joined_candidates.source_entry_status <> 'visited'::app.user_place_status
        or joined_candidates.source_entry_visibility <> 'public'::app.entry_visibility
        or coalesce(joined_candidates.source_entry_is_hidden, true)
        then 'source_entry_not_publishable'
      else null
    end as base_skip_reason
  from joined_candidates
),
deduplicated_candidates as (
  select
    classified_candidates.*,
    row_number() over (
      partition by classified_candidates.author_user_id, classified_candidates.place_id
      order by classified_candidates.created_at asc, classified_candidates.legacy_recommendation_id asc
    ) as author_place_rank
  from classified_candidates
  where classified_candidates.base_skip_reason is null
),
quota_ranked_candidates as (
  select
    deduplicated_candidates.*,
    row_number() over (
      partition by
        deduplicated_candidates.author_user_id,
        deduplicated_candidates.cycle_iso_year,
        deduplicated_candidates.cycle_iso_week
      order by deduplicated_candidates.created_at asc, deduplicated_candidates.legacy_recommendation_id asc
    ) as cycle_rank
  from deduplicated_candidates
  where deduplicated_candidates.author_place_rank = 1
)
select
  quota_ranked_candidates.*,
  backfill.uuid_from_text(
    'recommendation_post:' || quota_ranked_candidates.legacy_recommendation_id::text
  ) as v2_recommendation_post_id
from quota_ranked_candidates;

insert into backfill.skipped_records (
  legacy_table,
  legacy_key,
  reason_code,
  details
)
select
  'recommendations',
  classified.legacy_recommendation_id::text,
  classified.base_skip_reason,
  jsonb_build_object(
    'author_user_id', classified.author_user_id,
    'place_id', classified.place_id,
    'source_entry_id', classified.source_entry_id
  )
from (
  select
    candidate.legacy_recommendation_id,
    candidate.author_user_id,
    candidate.place_id,
    candidate.source_entry_id,
    case
      when candidate.place_id is null then 'place_unresolved'
      when candidate.source_entry_id is null then 'source_entry_unresolved'
      when source_entry.user_id is distinct from candidate.author_user_id
        or source_entry.place_id is distinct from candidate.place_id
        then 'source_entry_mismatch'
      when source_entry.status <> 'visited'::app.user_place_status
        or source_entry.visibility <> 'public'::app.entry_visibility
        or coalesce(source_entry.is_hidden, true)
        then 'source_entry_not_publishable'
      else null
    end as base_skip_reason
  from tmp_legacy_recommendation_candidates candidate
  left join app.user_place_entries source_entry
    on source_entry.id = candidate.source_entry_id
) classified
where classified.base_skip_reason is not null
on conflict (legacy_table, legacy_key, reason_code) do update
set
  details = excluded.details,
  updated_at = timezone('utc', now());

insert into backfill.skipped_records (
  legacy_table,
  legacy_key,
  reason_code,
  details
)
select
  'recommendations',
  ranked.legacy_recommendation_id::text,
  'duplicate_author_place',
  jsonb_build_object(
    'author_user_id', ranked.author_user_id,
    'place_id', ranked.place_id
  )
from tmp_ranked_recommendation_candidates ranked
where ranked.author_place_rank > 1
on conflict (legacy_table, legacy_key, reason_code) do update
set
  details = excluded.details,
  updated_at = timezone('utc', now());

insert into backfill.skipped_records (
  legacy_table,
  legacy_key,
  reason_code,
  details
)
select
  'recommendations',
  ranked.legacy_recommendation_id::text,
  'weekly_quota_overflow',
  jsonb_build_object(
    'author_user_id', ranked.author_user_id,
    'cycle_iso_year', ranked.cycle_iso_year,
    'cycle_iso_week', ranked.cycle_iso_week
  )
from tmp_ranked_recommendation_candidates ranked
where ranked.author_place_rank = 1
  and ranked.cycle_rank > 3
on conflict (legacy_table, legacy_key, reason_code) do update
set
  details = excluded.details,
  updated_at = timezone('utc', now());

insert into app.recommendation_posts (
  id,
  author_user_id,
  place_id,
  source_entry_id,
  cycle_iso_year,
  cycle_iso_week,
  cycle_timezone,
  snapshot_place_name,
  snapshot_formatted_address,
  snapshot_locality,
  snapshot_region,
  snapshot_country_code,
  snapshot_latitude,
  snapshot_longitude,
  snapshot_rating,
  snapshot_note,
  snapshot_price_tier,
  snapshot_tags,
  created_at,
  removed_at
)
select
  ranked.v2_recommendation_post_id,
  ranked.author_user_id,
  ranked.place_id,
  ranked.source_entry_id,
  ranked.cycle_iso_year,
  ranked.cycle_iso_week,
  'Europe/Madrid',
  left(coalesce(nullif(trim(ranked.restaurant_name), ''), ranked.place_name_fallback), 120),
  coalesce(ranked.snapshot_formatted_address, ranked.place_address_fallback),
  null,
  null,
  null,
  ranked.snapshot_latitude,
  ranked.snapshot_longitude,
  ranked.snapshot_rating,
  ranked.snapshot_note,
  ranked.snapshot_price_tier,
  ranked.snapshot_tags,
  ranked.created_at,
  null
from tmp_ranked_recommendation_candidates ranked
where ranked.author_place_rank = 1
  and ranked.cycle_rank <= 3
on conflict (id) do update
set
  source_entry_id = excluded.source_entry_id,
  cycle_iso_year = excluded.cycle_iso_year,
  cycle_iso_week = excluded.cycle_iso_week,
  cycle_timezone = excluded.cycle_timezone,
  snapshot_place_name = excluded.snapshot_place_name,
  snapshot_formatted_address = excluded.snapshot_formatted_address,
  snapshot_latitude = excluded.snapshot_latitude,
  snapshot_longitude = excluded.snapshot_longitude,
  snapshot_rating = excluded.snapshot_rating,
  snapshot_note = excluded.snapshot_note,
  snapshot_price_tier = excluded.snapshot_price_tier,
  snapshot_tags = excluded.snapshot_tags;

insert into backfill.recommendation_post_mappings (
  legacy_recommendation_id,
  v2_recommendation_post_id,
  source_entry_strategy
)
select
  ranked.legacy_recommendation_id,
  ranked.v2_recommendation_post_id,
  ranked.source_entry_strategy
from tmp_ranked_recommendation_candidates ranked
where ranked.author_place_rank = 1
  and ranked.cycle_rank <= 3
on conflict (legacy_recommendation_id) do update
set
  v2_recommendation_post_id = excluded.v2_recommendation_post_id,
  source_entry_strategy = excluded.source_entry_strategy,
  updated_at = timezone('utc', now());

create temporary table tmp_legacy_reaction_candidates
on commit drop as
select
  action.id as legacy_recommendation_action_id,
  action.user_id as viewer_user_id,
  action.action as reaction,
  action.created_at,
  recommendation_post_mapping.v2_recommendation_post_id,
  recommendation_post.author_user_id,
  recommendation_post.place_id
from public.recommendation_actions action
left join backfill.recommendation_post_mappings recommendation_post_mapping
  on recommendation_post_mapping.legacy_recommendation_id = action.recommendation_id
left join app.recommendation_posts recommendation_post
  on recommendation_post.id = recommendation_post_mapping.v2_recommendation_post_id;

insert into backfill.skipped_records (
  legacy_table,
  legacy_key,
  reason_code,
  details
)
select
  'recommendation_actions',
  reaction_candidate.legacy_recommendation_action_id::text,
  'recommendation_not_migrated',
  jsonb_build_object(
    'viewer_user_id', reaction_candidate.viewer_user_id,
    'reaction', reaction_candidate.reaction
  )
from tmp_legacy_reaction_candidates reaction_candidate
where reaction_candidate.v2_recommendation_post_id is null
on conflict (legacy_table, legacy_key, reason_code) do update
set
  details = excluded.details,
  updated_at = timezone('utc', now());

insert into backfill.skipped_records (
  legacy_table,
  legacy_key,
  reason_code,
  details
)
select
  'recommendation_actions',
  reaction_candidate.legacy_recommendation_action_id::text,
  'self_reaction_not_migrated',
  jsonb_build_object(
    'viewer_user_id', reaction_candidate.viewer_user_id,
    'author_user_id', reaction_candidate.author_user_id,
    'reaction', reaction_candidate.reaction
  )
from tmp_legacy_reaction_candidates reaction_candidate
where reaction_candidate.v2_recommendation_post_id is not null
  and reaction_candidate.viewer_user_id = reaction_candidate.author_user_id
on conflict (legacy_table, legacy_key, reason_code) do update
set
  details = excluded.details,
  updated_at = timezone('utc', now());

create temporary table tmp_accepted_reaction_entry_actions
on commit drop as
with accepted_candidates as (
  select
    reaction_candidate.legacy_recommendation_action_id,
    reaction_candidate.viewer_user_id,
    reaction_candidate.place_id,
    reaction_candidate.created_at,
    existing_entry.id as existing_entry_id,
    existing_entry.status as existing_entry_status
  from tmp_legacy_reaction_candidates reaction_candidate
  left join app.user_place_entries existing_entry
    on existing_entry.user_id = reaction_candidate.viewer_user_id
   and existing_entry.place_id = reaction_candidate.place_id
  where reaction_candidate.v2_recommendation_post_id is not null
    and reaction_candidate.viewer_user_id <> reaction_candidate.author_user_id
    and reaction_candidate.reaction = 'accepted'
)
select
  accepted_candidates.legacy_recommendation_action_id,
  accepted_candidates.viewer_user_id,
  accepted_candidates.place_id,
  backfill.uuid_from_text(
    'user_place_entry:' || accepted_candidates.viewer_user_id::text || ':' || accepted_candidates.place_id::text
  ) as v2_entry_id,
  accepted_candidates.created_at,
  case
    when accepted_candidates.existing_entry_id is null then 'created_wishlist'
    when accepted_candidates.existing_entry_status = 'wishlist'::app.user_place_status then 'kept_existing_wishlist'
    else 'kept_existing_visited'
  end as entry_action,
  accepted_candidates.existing_entry_id
from accepted_candidates;

insert into app.user_place_entries (
  id,
  user_id,
  place_id,
  status,
  visibility,
  is_hidden,
  note,
  tags,
  visited_at,
  rating,
  price_tier,
  created_at,
  updated_at
)
select
  accepted_entry.v2_entry_id,
  accepted_entry.viewer_user_id,
  accepted_entry.place_id,
  'wishlist'::app.user_place_status,
  'private'::app.entry_visibility,
  false,
  null,
  '{}'::text[],
  null,
  null,
  null,
  accepted_entry.created_at,
  accepted_entry.created_at
from tmp_accepted_reaction_entry_actions accepted_entry
where accepted_entry.entry_action = 'created_wishlist'
on conflict (id) do nothing;

insert into backfill.user_place_entry_mappings (
  legacy_table,
  legacy_id,
  v2_user_place_entry_id,
  mapping_strategy
)
select
  'recommendation_actions',
  accepted_entry.legacy_recommendation_action_id,
  accepted_entry.v2_entry_id,
  case accepted_entry.entry_action
    when 'created_wishlist' then 'synthetic_wishlist_from_accepted_recommendation'
    when 'kept_existing_wishlist' then 'accepted_recommendation_reused_existing_wishlist'
    else 'accepted_recommendation_reused_existing_visited'
  end as mapping_strategy
from tmp_accepted_reaction_entry_actions accepted_entry
on conflict (legacy_table, legacy_id) do update
set
  v2_user_place_entry_id = excluded.v2_user_place_entry_id,
  mapping_strategy = excluded.mapping_strategy,
  updated_at = timezone('utc', now());

insert into app.recommendation_reactions (
  id,
  recommendation_post_id,
  viewer_user_id,
  reaction,
  created_at
)
select
  backfill.uuid_from_text(
    'recommendation_reaction:' || reaction_candidate.legacy_recommendation_action_id::text
  ) as id,
  reaction_candidate.v2_recommendation_post_id,
  reaction_candidate.viewer_user_id,
  reaction_candidate.reaction::app.recommendation_reaction_kind,
  reaction_candidate.created_at
from tmp_legacy_reaction_candidates reaction_candidate
where reaction_candidate.v2_recommendation_post_id is not null
  and reaction_candidate.viewer_user_id <> reaction_candidate.author_user_id
on conflict (id) do update
set
  reaction = excluded.reaction,
  created_at = excluded.created_at;

insert into backfill.recommendation_reaction_mappings (
  legacy_recommendation_action_id,
  v2_recommendation_post_id,
  v2_recommendation_reaction_id,
  resulting_entry_action
)
select
  reaction_candidate.legacy_recommendation_action_id,
  reaction_candidate.v2_recommendation_post_id,
  backfill.uuid_from_text(
    'recommendation_reaction:' || reaction_candidate.legacy_recommendation_action_id::text
  ) as v2_recommendation_reaction_id,
  case
    when reaction_candidate.reaction = 'rejected' then 'none'
    else accepted_entry.entry_action
  end as resulting_entry_action
from tmp_legacy_reaction_candidates reaction_candidate
left join tmp_accepted_reaction_entry_actions accepted_entry
  on accepted_entry.legacy_recommendation_action_id = reaction_candidate.legacy_recommendation_action_id
where reaction_candidate.v2_recommendation_post_id is not null
  and reaction_candidate.viewer_user_id <> reaction_candidate.author_user_id
on conflict (legacy_recommendation_action_id) do update
set
  v2_recommendation_post_id = excluded.v2_recommendation_post_id,
  v2_recommendation_reaction_id = excluded.v2_recommendation_reaction_id,
  resulting_entry_action = excluded.resulting_entry_action,
  updated_at = timezone('utc', now());

insert into app.reputation_events (
  id,
  subject_user_id,
  actor_user_id,
  recommendation_post_id,
  recommendation_reaction_id,
  event_type,
  created_at
)
select
  backfill.uuid_from_text(
    'reputation_event:' || reaction_candidate.legacy_recommendation_action_id::text
  ) as id,
  reaction_candidate.author_user_id as subject_user_id,
  reaction_candidate.viewer_user_id as actor_user_id,
  reaction_candidate.v2_recommendation_post_id as recommendation_post_id,
  backfill.uuid_from_text(
    'recommendation_reaction:' || reaction_candidate.legacy_recommendation_action_id::text
  ) as recommendation_reaction_id,
  'recommendation_accepted'::app.reputation_event_type,
  reaction_candidate.created_at
from tmp_legacy_reaction_candidates reaction_candidate
where reaction_candidate.v2_recommendation_post_id is not null
  and reaction_candidate.viewer_user_id <> reaction_candidate.author_user_id
  and reaction_candidate.reaction = 'accepted'
on conflict (id) do update
set
  subject_user_id = excluded.subject_user_id,
  actor_user_id = excluded.actor_user_id,
  recommendation_post_id = excluded.recommendation_post_id,
  recommendation_reaction_id = excluded.recommendation_reaction_id,
  created_at = excluded.created_at;

create temporary table tmp_reputation_scores (
  user_id uuid primary key,
  score integer not null default 1000,
  accepted_count integer not null default 0
)
on commit drop;

insert into tmp_reputation_scores (user_id)
select public_profile.user_id
from app.public_profiles public_profile
on conflict (user_id) do nothing;

do $$
declare
  event_row record;
  subject_rating integer;
  actor_rating integer;
  expected_score numeric;
  rating_delta integer;
begin
  for event_row in
    select
      reputation_event.subject_user_id,
      reputation_event.actor_user_id,
      recommendation_reaction.created_at,
      reputation_event.id
    from app.reputation_events reputation_event
    join app.recommendation_reactions recommendation_reaction
      on recommendation_reaction.id = reputation_event.recommendation_reaction_id
    where reputation_event.event_type = 'recommendation_accepted'::app.reputation_event_type
    order by recommendation_reaction.created_at asc, reputation_event.id asc
  loop
    select score into subject_rating
    from tmp_reputation_scores
    where user_id = event_row.subject_user_id;

    select score into actor_rating
    from tmp_reputation_scores
    where user_id = event_row.actor_user_id;

    subject_rating := coalesce(subject_rating, 1000);
    actor_rating := coalesce(actor_rating, 1000);
    expected_score := 1 / (1 + power(10, ((actor_rating - subject_rating)::numeric / 400)));
    rating_delta := greatest(1, round(32 * (1 - expected_score))::integer);

    insert into tmp_reputation_scores (user_id, score, accepted_count)
    values (event_row.subject_user_id, 1000 + rating_delta, 1)
    on conflict (user_id) do update
    set
      score = tmp_reputation_scores.score + rating_delta,
      accepted_count = tmp_reputation_scores.accepted_count + 1;
  end loop;
end $$;

insert into app.reputation_summaries (
  user_id,
  score,
  accepted_recommendation_count,
  expertise_level_label,
  updated_at
)
select
  score_row.user_id,
  score_row.score,
  score_row.accepted_count,
  case
    when score_row.score >= 1600 then 'Maestro'
    when score_row.score >= 1420 then 'Gourmet'
    when score_row.score >= 1260 then 'Foodie'
    when score_row.score >= 1120 then 'Curioso'
    else 'Basico'
  end as expertise_level_label,
  timezone('utc', now())
from tmp_reputation_scores score_row
on conflict (user_id) do update
set
  score = excluded.score,
  accepted_recommendation_count = excluded.accepted_recommendation_count,
  expertise_level_label = excluded.expertise_level_label,
  updated_at = excluded.updated_at;

create temporary table tmp_canonical_friendships
on commit drop as
select
  case
    when friendship.user_id::text < friendship.friend_user_id::text then friendship.user_id
    else friendship.friend_user_id
  end as user_id_a,
  case
    when friendship.user_id::text < friendship.friend_user_id::text then friendship.friend_user_id
    else friendship.user_id
  end as user_id_b,
  min(friendship.created_at) as created_at
from public.friendships friendship
where friendship.user_id <> friendship.friend_user_id
group by 1, 2;

insert into app.friendships (
  id,
  user_id_a,
  user_id_b,
  created_at
)
select
  backfill.uuid_from_text(
    'friendship:' || canonical_friendship.user_id_a::text || ':' || canonical_friendship.user_id_b::text
  ) as id,
  canonical_friendship.user_id_a,
  canonical_friendship.user_id_b,
  canonical_friendship.created_at
from tmp_canonical_friendships canonical_friendship
on conflict (id) do update
set
  created_at = excluded.created_at;

insert into backfill.friendship_mappings (
  legacy_user_id,
  legacy_friend_user_id,
  v2_friendship_id,
  mapping_strategy
)
select
  friendship.user_id,
  friendship.friend_user_id,
  backfill.uuid_from_text(
    'friendship:' ||
    least(friendship.user_id::text, friendship.friend_user_id::text) || ':' ||
    greatest(friendship.user_id::text, friendship.friend_user_id::text)
  ) as v2_friendship_id,
  'canonical_pair'
from public.friendships friendship
where friendship.user_id <> friendship.friend_user_id
on conflict (legacy_user_id, legacy_friend_user_id) do update
set
  v2_friendship_id = excluded.v2_friendship_id,
  mapping_strategy = excluded.mapping_strategy,
  updated_at = timezone('utc', now());

commit;
