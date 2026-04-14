export type AuthUserId = string;
export type PlaceId = string;
export type UserPlaceEntryId = string;
export type FriendshipId = string;
export type RecommendationPostId = string;
export type RecommendationReactionId = string;
export type ReputationEventId = string;
export type IsoDateTimeString = string;

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export const VISIBILITY_VALUES = ["public", "private"] as const;
export type Visibility = (typeof VISIBILITY_VALUES)[number];

export function hasText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
