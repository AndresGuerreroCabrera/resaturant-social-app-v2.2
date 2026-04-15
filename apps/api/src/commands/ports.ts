import type {
  AuthUserId,
  Friendship,
  GeoPoint,
  IsoDateTimeString,
  Place,
  PlaceAddress,
  PlaceId,
  PlaceProviderReference,
  PrivateProfile,
  PublicProfile,
  RecommendationContentSnapshot,
  RecommendationCycleKey,
  RecommendationPost,
  RecommendationPostId,
  RecommendationReaction,
  RecommendationReactionId,
  RecommendationReactionKind,
  ReputationSummary,
  UserPlaceEntry,
  UserPlaceEntryId,
  Visibility
} from "@savory/domain";

export interface AuthUsersStore {
  userExists(userId: AuthUserId): Promise<boolean>;
}

export interface PlacesStore {
  findPlaceById(placeId: PlaceId): Promise<Place | null>;
  findPlaceByProviderReference(
    reference: PlaceProviderReference
  ): Promise<Place | null>;
  createPlace(input: {
    name: string;
    address: PlaceAddress;
    coordinates: GeoPoint | null;
  }): Promise<Place>;
  createPrimaryProviderReference(input: {
    placeId: PlaceId;
    reference: PlaceProviderReference;
  }): Promise<void>;
}

export interface ProfilesStore {
  getPublicProfileForUpdate(userId: AuthUserId): Promise<PublicProfile | null>;
  getPrivateProfileForUpdate(
    userId: AuthUserId
  ): Promise<PrivateProfile | null>;
  findPublicProfileByHandle(handle: string): Promise<PublicProfile | null>;
  upsertPublicProfile(input: {
    userId: AuthUserId;
    handle: string;
    displayName: string;
    avatarKey: string | null;
    bio: string | null;
  }): Promise<PublicProfile>;
  upsertPrivateProfile(input: {
    userId: AuthUserId;
    onboardingCompletedAt: IsoDateTimeString | null;
  }): Promise<PrivateProfile>;
}

export interface UserPlaceEntriesStore {
  findEntryByUserAndPlaceForUpdate(
    userId: AuthUserId,
    placeId: PlaceId
  ): Promise<UserPlaceEntry | null>;
  findEntryByIdForUserForUpdate(
    entryId: UserPlaceEntryId,
    userId: AuthUserId
  ): Promise<UserPlaceEntry | null>;
  createWishlist(input: {
    userId: AuthUserId;
    placeId: PlaceId;
    note: string | null;
    tags: readonly string[];
    isHidden: boolean;
  }): Promise<UserPlaceEntry>;
  updateWishlist(input: {
    entryId: UserPlaceEntryId;
    note: string | null;
    tags: readonly string[];
    isHidden: boolean;
  }): Promise<UserPlaceEntry>;
  createVisited(input: {
    userId: AuthUserId;
    placeId: PlaceId;
    visibility: Visibility;
    visitedAt: IsoDateTimeString | null;
    rating: number | null;
    note: string | null;
    tags: readonly string[];
    priceTier: string | null;
    isHidden: boolean;
  }): Promise<UserPlaceEntry>;
  promoteWishlistToVisited(input: {
    entryId: UserPlaceEntryId;
    visibility: Visibility;
    visitedAt: IsoDateTimeString | null;
    rating: number | null;
    note: string | null;
    tags: readonly string[];
    priceTier: string | null;
    isHidden: boolean;
  }): Promise<UserPlaceEntry>;
  updateVisited(input: {
    entryId: UserPlaceEntryId;
    visibility: Visibility;
    visitedAt: IsoDateTimeString | null;
    rating: number | null;
    note: string | null;
    tags: readonly string[];
    priceTier: string | null;
    isHidden: boolean;
  }): Promise<UserPlaceEntry>;
}

export interface RecommendationsStore {
  acquirePublicationQuotaLock(
    authorUserId: AuthUserId,
    cycle: RecommendationCycleKey
  ): Promise<void>;
  countPostsInCycle(
    authorUserId: AuthUserId,
    cycle: RecommendationCycleKey
  ): Promise<number>;
  findPostByAuthorAndPlace(
    authorUserId: AuthUserId,
    placeId: PlaceId
  ): Promise<RecommendationPost | null>;
  createPost(input: {
    authorUserId: AuthUserId;
    placeId: PlaceId;
    sourceEntryId: UserPlaceEntryId;
    cycle: RecommendationCycleKey;
    snapshot: RecommendationContentSnapshot;
  }): Promise<RecommendationPost>;
  findActivePostById(
    recommendationPostId: RecommendationPostId
  ): Promise<RecommendationPost | null>;
  findReactionByViewer(
    recommendationPostId: RecommendationPostId,
    viewerUserId: AuthUserId
  ): Promise<RecommendationReaction | null>;
  createReaction(input: {
    recommendationPostId: RecommendationPostId;
    viewerUserId: AuthUserId;
    reaction: RecommendationReactionKind;
  }): Promise<RecommendationReaction>;
}

export interface FriendshipsStore {
  findFriendshipByUsers(
    userIdA: AuthUserId,
    userIdB: AuthUserId
  ): Promise<Friendship | null>;
  createFriendship(input: {
    userIdA: AuthUserId;
    userIdB: AuthUserId;
  }): Promise<Friendship>;
  deleteFriendshipByUsers(
    userIdA: AuthUserId,
    userIdB: AuthUserId
  ): Promise<boolean>;
}

export interface ReputationStore {
  recordAcceptedRecommendation(input: {
    subjectUserId: AuthUserId;
    actorUserId: AuthUserId;
    recommendationPostId: RecommendationPostId;
    recommendationReactionId: RecommendationReactionId;
  }): Promise<ReputationSummary>;
}

export interface BackendCommandTransaction {
  authUsers: AuthUsersStore;
  places: PlacesStore;
  profiles: ProfilesStore;
  userPlaceEntries: UserPlaceEntriesStore;
  recommendations: RecommendationsStore;
  friendships: FriendshipsStore;
  reputation: ReputationStore;
}

export interface BackendCommandTransactionRunner {
  runInTransaction<T>(
    operation: (transaction: BackendCommandTransaction) => Promise<T>
  ): Promise<T>;
}
