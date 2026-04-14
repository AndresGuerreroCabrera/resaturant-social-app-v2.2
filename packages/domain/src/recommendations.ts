import type { PlaceAddress } from "./places";
import type {
  AuthUserId,
  GeoPoint,
  IsoDateTimeString,
  PlaceId,
  RecommendationPostId,
  RecommendationReactionId,
  UserPlaceEntryId,
  Visibility
} from "./primitives";
import type { UserPlaceStatus } from "./user-place";

export const RECOMMENDATION_WEEKLY_LIMIT = 3 as const;
export const RECOMMENDATION_CYCLE_TIMEZONE = "Europe/Madrid" as const;

export type RecommendationCycleTimezone =
  typeof RECOMMENDATION_CYCLE_TIMEZONE;

export interface RecommendationCycleKey {
  isoYear: number;
  isoWeek: number;
  timezone: RecommendationCycleTimezone;
}

export interface RecommendationContentSnapshot {
  rating: number | null;
  note: string | null;
  priceTier: string | null;
  tags: readonly string[];
  placeName: string;
  placeAddress: PlaceAddress;
  placeCoordinates: GeoPoint | null;
}

export interface RecommendationPost {
  id: RecommendationPostId;
  authorUserId: AuthUserId;
  placeId: PlaceId;
  sourceEntryId: UserPlaceEntryId;
  cycle: RecommendationCycleKey;
  snapshot: RecommendationContentSnapshot;
  createdAt: IsoDateTimeString;
  removedAt: IsoDateTimeString | null;
}

export const RECOMMENDATION_REACTION_VALUES = [
  "accepted",
  "rejected"
] as const;
export type RecommendationReactionKind =
  (typeof RECOMMENDATION_REACTION_VALUES)[number];

export interface RecommendationReaction {
  id: RecommendationReactionId;
  recommendationPostId: RecommendationPostId;
  viewerUserId: AuthUserId;
  reaction: RecommendationReactionKind;
  createdAt: IsoDateTimeString;
}

export interface PublishRecommendationEligibility {
  entryStatus: UserPlaceStatus;
  entryVisibility: Visibility;
  entryIsHidden: boolean;
  existingRecommendationCountInCycle: number;
  hasPublishedPlaceAlready: boolean;
}

export function canPublishRecommendation(
  input: PublishRecommendationEligibility
): boolean {
  return (
    input.entryStatus === "visited" &&
    input.entryVisibility === "public" &&
    input.entryIsHidden === false &&
    input.hasPublishedPlaceAlready === false &&
    input.existingRecommendationCountInCycle < RECOMMENDATION_WEEKLY_LIMIT
  );
}

export function recommendationSlotsRemaining(
  currentCountInCycle: number
): number {
  return Math.max(RECOMMENDATION_WEEKLY_LIMIT - currentCountInCycle, 0);
}

export function canReactToRecommendation(input: {
  authorUserId: AuthUserId;
  viewerUserId: AuthUserId;
  hasExistingReaction: boolean;
}): boolean {
  return (
    input.authorUserId !== input.viewerUserId &&
    input.hasExistingReaction === false
  );
}
