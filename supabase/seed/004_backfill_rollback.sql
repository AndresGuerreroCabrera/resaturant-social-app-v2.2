begin;

delete from app.reputation_events reputation_event
using backfill.recommendation_reaction_mappings reaction_mapping
where reputation_event.recommendation_reaction_id = reaction_mapping.v2_recommendation_reaction_id;

delete from app.recommendation_reactions reaction
using backfill.recommendation_reaction_mappings reaction_mapping
where reaction.id = reaction_mapping.v2_recommendation_reaction_id;

delete from app.recommendation_posts post
using backfill.recommendation_post_mappings post_mapping
where post.id = post_mapping.v2_recommendation_post_id;

delete from app.friendships friendship
using backfill.friendship_mappings friendship_mapping
where friendship.id = friendship_mapping.v2_friendship_id;

delete from app.user_place_entries entry
where entry.id in (
  select distinct mapping.v2_user_place_entry_id
  from backfill.user_place_entry_mappings mapping
);

delete from app.place_provider_references provider_reference
where provider_reference.place_id in (
  select distinct mapping.v2_place_id
  from backfill.place_mappings mapping
);

delete from app.places place
where place.id in (
  select distinct mapping.v2_place_id
  from backfill.place_mappings mapping
);

delete from app.reputation_summaries summary
where summary.user_id in (
  select mapping.v2_user_id
  from backfill.profile_mappings mapping
);

delete from app.private_profiles private_profile
where private_profile.user_id in (
  select mapping.v2_user_id
  from backfill.profile_mappings mapping
);

delete from app.public_profiles public_profile
where public_profile.user_id in (
  select mapping.v2_user_id
  from backfill.profile_mappings mapping
);

delete from backfill.friendship_mappings;
delete from backfill.recommendation_reaction_mappings;
delete from backfill.recommendation_post_mappings;
delete from backfill.user_place_entry_mappings;
delete from backfill.place_mappings;
delete from backfill.profile_mappings;
delete from backfill.skipped_records;

commit;
