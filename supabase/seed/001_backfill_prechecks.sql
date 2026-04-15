do $$
begin
  if to_regclass('public.profiles') is null then
    raise exception 'Legacy table public.profiles is missing.';
  end if;

  if to_regclass('public.restaurants') is null then
    raise exception 'Legacy table public.restaurants is missing.';
  end if;

  if to_regclass('public.desired_restaurants') is null then
    raise exception 'Legacy table public.desired_restaurants is missing.';
  end if;

  if to_regclass('public.recommendations') is null then
    raise exception 'Legacy table public.recommendations is missing.';
  end if;

  if to_regclass('public.recommendation_actions') is null then
    raise exception 'Legacy table public.recommendation_actions is missing.';
  end if;

  if to_regclass('public.friendships') is null then
    raise exception 'Legacy table public.friendships is missing.';
  end if;

  if to_regclass('app.public_profiles') is null then
    raise exception 'Schema v2 is missing app.public_profiles.';
  end if;

  if to_regclass('app.user_place_entries') is null then
    raise exception 'Schema v2 is missing app.user_place_entries.';
  end if;

  if to_regclass('app.recommendation_posts') is null then
    raise exception 'Schema v2 is missing app.recommendation_posts.';
  end if;

  if to_regclass('backfill.profile_mappings') is null then
    raise exception 'Backfill support objects are missing. Apply 20260415160000_create_backfill_schema.sql first.';
  end if;
end $$;

select 'legacy_counts' as check_name, jsonb_build_object(
  'profiles', (select count(*) from public.profiles),
  'restaurants', (select count(*) from public.restaurants),
  'desired_restaurants', (select count(*) from public.desired_restaurants),
  'recommendations', (select count(*) from public.recommendations),
  'recommendation_actions', (select count(*) from public.recommendation_actions),
  'friendships', (select count(*) from public.friendships)
) as details;

select 'v2_counts_before_backfill' as check_name, jsonb_build_object(
  'public_profiles', (select count(*) from app.public_profiles),
  'private_profiles', (select count(*) from app.private_profiles),
  'places', (select count(*) from app.places),
  'user_place_entries', (select count(*) from app.user_place_entries),
  'recommendation_posts', (select count(*) from app.recommendation_posts),
  'recommendation_reactions', (select count(*) from app.recommendation_reactions),
  'reputation_events', (select count(*) from app.reputation_events),
  'friendships', (select count(*) from app.friendships)
) as details;

select 'legacy_place_quality' as check_name, jsonb_build_object(
  'restaurants_without_place_id', (
    select count(*) from public.restaurants where nullif(trim(place_id), '') is null
  ),
  'desired_without_place_id', (
    select count(*) from public.desired_restaurants where nullif(trim(place_id), '') is null
  ),
  'recommendations_without_place_id', (
    select count(*) from public.recommendations where nullif(trim(place_id), '') is null
  ),
  'restaurants_blank_name', (
    select count(*) from public.restaurants where backfill.normalize_text(name) = ''
  ),
  'desired_blank_name', (
    select count(*) from public.desired_restaurants where backfill.normalize_text(name) = ''
  ),
  'recommendations_blank_name', (
    select count(*) from public.recommendations where backfill.normalize_text(restaurant_name) = ''
  )
) as details;

select 'legacy_visibility_and_recommendations' as check_name, jsonb_build_object(
  'desired_public_rows', (
    select count(*) from public.desired_restaurants where visibility = 'publico'
  ),
  'private_recommendations', (
    select count(*) from public.recommendations where visibility <> 'publico'
  ),
  'recommendations_missing_original_restaurant', (
    select count(*) from public.recommendations where original_restaurant_id is null
  )
) as details;

select 'legacy_social_quality' as check_name, jsonb_build_object(
  'accepted_self_reactions', (
    select count(*)
    from public.recommendation_actions action
    join public.recommendations recommendation
      on recommendation.id = action.recommendation_id
    where action.action = 'accepted'
      and action.user_id = recommendation.owner_user_id
  ),
  'all_self_reactions', (
    select count(*)
    from public.recommendation_actions action
    join public.recommendations recommendation
      on recommendation.id = action.recommendation_id
    where action.user_id = recommendation.owner_user_id
  ),
  'friendship_rows', (select count(*) from public.friendships),
  'friendship_canonical_pairs', (
    select count(*)
    from (
      select
        least(user_id::text, friend_user_id::text) as user_id_a,
        greatest(user_id::text, friend_user_id::text) as user_id_b
      from public.friendships
      where user_id <> friend_user_id
      group by 1, 2
    ) pairs
  )
) as details;

select 'existing_backfill_state' as check_name, jsonb_build_object(
  'profile_mappings', (select count(*) from backfill.profile_mappings),
  'place_mappings', (select count(*) from backfill.place_mappings),
  'user_place_entry_mappings', (select count(*) from backfill.user_place_entry_mappings),
  'recommendation_post_mappings', (select count(*) from backfill.recommendation_post_mappings),
  'recommendation_reaction_mappings', (select count(*) from backfill.recommendation_reaction_mappings),
  'friendship_mappings', (select count(*) from backfill.friendship_mappings),
  'skipped_records', (select count(*) from backfill.skipped_records)
) as details;
