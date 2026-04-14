create view app.public_profile_stats_v as
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
