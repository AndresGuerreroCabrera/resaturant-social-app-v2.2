import type {
  AuthUserId,
  IsoDateTimeString,
  PlaceId,
  UserPlaceEntryId,
  Visibility
} from "./primitives";

export const USER_PLACE_STATUS_VALUES = ["wishlist", "visited"] as const;
export type UserPlaceStatus = (typeof USER_PLACE_STATUS_VALUES)[number];

export const USER_PLACE_LIST_VALUES = ["wishlist", "visited", "hidden"] as const;
export type UserPlaceList = (typeof USER_PLACE_LIST_VALUES)[number];

interface UserPlaceEntryBase {
  id: UserPlaceEntryId;
  userId: AuthUserId;
  placeId: PlaceId;
  isHidden: boolean;
  note: string | null;
  tags: readonly string[];
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

export interface WishlistUserPlaceEntry extends UserPlaceEntryBase {
  status: "wishlist";
  visibility: "private";
  visitedAt: null;
  rating: null;
  priceTier: null;
}

export interface VisitedUserPlaceEntry extends UserPlaceEntryBase {
  status: "visited";
  visibility: Visibility;
  visitedAt: IsoDateTimeString | null;
  rating: number | null;
  priceTier: string | null;
}

export type UserPlaceEntry = WishlistUserPlaceEntry | VisitedUserPlaceEntry;

export function isWishlistUserPlaceEntry(
  entry: UserPlaceEntry
): entry is WishlistUserPlaceEntry {
  return entry.status === "wishlist";
}

export function isVisitedUserPlaceEntry(
  entry: UserPlaceEntry
): entry is VisitedUserPlaceEntry {
  return entry.status === "visited";
}

export function canTransitionUserPlaceStatus(
  currentStatus: UserPlaceStatus,
  nextStatus: UserPlaceStatus
): boolean {
  return (
    currentStatus === nextStatus ||
    (currentStatus === "wishlist" && nextStatus === "visited")
  );
}

export function isPublicVisitedEntry(entry: UserPlaceEntry): boolean {
  return (
    entry.status === "visited" &&
    entry.visibility === "public" &&
    entry.isHidden === false
  );
}

export function isEntryInSystemList(
  entry: UserPlaceEntry,
  list: UserPlaceList
): boolean {
  if (list === "hidden") {
    return entry.isHidden;
  }

  if (entry.isHidden) {
    return false;
  }

  return entry.status === list;
}

export function shouldCreateWishlistOnRecommendationAcceptance(
  existingEntry: UserPlaceEntry | null | undefined
): boolean {
  return existingEntry == null;
}
