import type { Place } from "./places";
import type { PublicProfile, PublicProfileStats } from "./profiles";
import type {
  RecommendationPost,
  RecommendationReactionKind
} from "./recommendations";

export interface RecommendationFeedItem {
  recommendation: RecommendationPost;
  author: PublicProfile;
  authorStats: PublicProfileStats | null;
  place: Place;
  viewerReaction: RecommendationReactionKind | null;
}

export function isRecommendationVisibleInFeed(
  item: Pick<RecommendationFeedItem, "viewerReaction">
): boolean {
  return item.viewerReaction === null;
}
