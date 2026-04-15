do $$
declare
  expected_public_profiles integer;
  actual_public_profiles integer;
  expected_recommendation_events integer;
  actual_reputation_events integer;
begin
  select count(*) into expected_public_profiles
  from backfill.profile_mappings;

  select count(*) into actual_public_profiles
  from app.public_profiles public_profile
  join backfill.profile_mappings mapping
    on mapping.v2_user_id = public_profile.user_id;

  if expected_public_profiles <> actual_public_profiles then
    raise exception 'Backfill mismatch: expected % public profiles, found %.', expected_public_profiles, actual_public_profiles;
  end if;

  select count(*) into expected_recommendation_events
  from backfill.recommendation_reaction_mappings reaction_mapping
  where reaction_mapping.resulting_entry_action <> 'none';

  select count(*) into actual_reputation_events
  from app.reputation_events reputation_event
  join backfill.recommendation_reaction_mappings reaction_mapping
    on reaction_mapping.v2_recommendation_reaction_id = reputation_event.recommendation_reaction_id;

  if expected_recommendation_events <> actual_reputation_events then
    raise exception 'Backfill mismatch: expected % reputation events, found %.', expected_recommendation_events, actual_reputation_events;
  end if;
end $$;

select 'profiles' as area, jsonb_build_object(
  'legacy_profiles', (select count(*) from public.profiles),
  'mapped_profiles', (select count(*) from backfill.profile_mappings),
  'v2_public_profiles', (
    select count(*)
    from app.public_profiles public_profile
    join backfill.profile_mappings mapping
      on mapping.v2_user_id = public_profile.user_id
  ),
  'v2_private_profiles', (
    select count(*)
    from app.private_profiles private_profile
    join backfill.profile_mappings mapping
      on mapping.v2_user_id = private_profile.user_id
  )
) as details;

select 'places' as area, jsonb_build_object(
  'legacy_place_rows', (
    select count(*) from backfill.place_mappings
  ),
  'distinct_resolution_keys', (
    select count(distinct resolution_key) from backfill.place_mappings
  ),
  'mapped_v2_places', (
    select count(distinct v2_place_id) from backfill.place_mappings
  ),
  'provider_reference_places', (
    select count(*)
    from app.place_provider_references provider_reference
    where provider_reference.provider = 'google_places'::app.place_provider
  )
) as details;

select 'user_place_entries' as area, jsonb_build_object(
  'legacy_rows_mapped', (select count(*) from backfill.user_place_entry_mappings),
  'distinct_v2_entries', (select count(distinct v2_user_place_entry_id) from backfill.user_place_entry_mappings),
  'visited_entries', (
    select count(*)
    from app.user_place_entries entry
    where entry.status = 'visited'::app.user_place_status
  ),
  'wishlist_entries', (
    select count(*)
    from app.user_place_entries entry
    where entry.status = 'wishlist'::app.user_place_status
  )
) as details;

select 'recommendations' as area, jsonb_build_object(
  'legacy_total', (select count(*) from public.recommendations),
  'migrated_posts', (select count(*) from backfill.recommendation_post_mappings),
  'skipped_private', (
    select count(*)
    from backfill.skipped_records skipped
    where skipped.legacy_table = 'recommendations'
      and skipped.reason_code = 'private_recommendation_not_migrated'
  ),
  'skipped_duplicate_author_place', (
    select count(*)
    from backfill.skipped_records skipped
    where skipped.legacy_table = 'recommendations'
      and skipped.reason_code = 'duplicate_author_place'
  ),
  'skipped_weekly_quota_overflow', (
    select count(*)
    from backfill.skipped_records skipped
    where skipped.legacy_table = 'recommendations'
      and skipped.reason_code = 'weekly_quota_overflow'
  )
) as details;

select 'reactions_and_reputation' as area, jsonb_build_object(
  'legacy_actions', (select count(*) from public.recommendation_actions),
  'migrated_reactions', (select count(*) from backfill.recommendation_reaction_mappings),
  'accepted_reactions_migrated', (
    select count(*)
    from backfill.recommendation_reaction_mappings mapping
    where mapping.resulting_entry_action <> 'none'
  ),
  'reputation_events', (select count(*) from app.reputation_events),
  'summary_rows', (select count(*) from app.reputation_summaries),
  'accepted_count_from_summaries', (
    select coalesce(sum(summary.accepted_recommendation_count), 0)
    from app.reputation_summaries summary
  )
) as details;

select 'friendships' as area, jsonb_build_object(
  'legacy_rows', (select count(*) from public.friendships),
  'legacy_canonical_pairs', (
    select count(*)
    from (
      select
        least(friendship.user_id::text, friendship.friend_user_id::text) as user_id_a,
        greatest(friendship.user_id::text, friendship.friend_user_id::text) as user_id_b
      from public.friendships friendship
      where friendship.user_id <> friendship.friend_user_id
      group by 1, 2
    ) pairs
  ),
  'mapped_friendships', (select count(distinct v2_friendship_id) from backfill.friendship_mappings),
  'v2_friendships', (select count(*) from app.friendships)
) as details;

select
  skipped.legacy_table,
  skipped.reason_code,
  count(*) as row_count
from backfill.skipped_records skipped
group by skipped.legacy_table, skipped.reason_code
order by skipped.legacy_table, skipped.reason_code;
