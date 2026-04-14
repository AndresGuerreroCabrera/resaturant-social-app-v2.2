import type { AuthUserId, FriendshipId, IsoDateTimeString } from "./primitives";

export interface Friendship {
  id: FriendshipId;
  userIdA: AuthUserId;
  userIdB: AuthUserId;
  createdAt: IsoDateTimeString;
}

export interface FriendshipPair {
  userIdA: AuthUserId;
  userIdB: AuthUserId;
}

export function normalizeFriendshipPair(
  leftUserId: AuthUserId,
  rightUserId: AuthUserId
): FriendshipPair {
  if (leftUserId === rightUserId) {
    throw new Error("Friendship requires two distinct users.");
  }

  return leftUserId < rightUserId
    ? { userIdA: leftUserId, userIdB: rightUserId }
    : { userIdA: rightUserId, userIdB: leftUserId };
}

export function friendshipIncludesUser(
  friendship: Friendship,
  userId: AuthUserId
): boolean {
  return friendship.userIdA === userId || friendship.userIdB === userId;
}
