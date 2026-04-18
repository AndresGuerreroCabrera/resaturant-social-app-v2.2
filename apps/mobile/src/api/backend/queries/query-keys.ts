import type {
  GetPublicProfileQuery,
  ListMyFriendshipsQuery,
  ListMyRecommendationPostsQuery,
  ListMyUserPlaceEntriesQuery,
  ListRecommendationFeedQuery,
  SearchPlacesQuery
} from "@savory/contracts";

export const mobileQueryKeys = {
  myProfile: () => ["mobile-backend", "query", "my-profile"] as const,
  publicProfile: (input: GetPublicProfileQuery) =>
    ["mobile-backend", "query", "public-profile", input.profileUserId] as const,
  recommendationFeed: (input: ListRecommendationFeedQuery = {}) =>
    [
      "mobile-backend",
      "query",
      "recommendation-feed",
      input.cursor ?? null,
      input.limit ?? null
    ] as const,
  userPlaceEntries: (input: ListMyUserPlaceEntriesQuery) =>
    [
      "mobile-backend",
      "query",
      "user-place-entries",
      input.list,
      input.cursor ?? null,
      input.limit ?? null
    ] as const,
  friendships: (input: ListMyFriendshipsQuery = {}) =>
    [
      "mobile-backend",
      "query",
      "friendships",
      input.cursor ?? null,
      input.limit ?? null
    ] as const,
  searchPlaces: (input: SearchPlacesQuery) =>
    [
      "mobile-backend",
      "query",
      "search-places",
      input.query,
      input.cursor ?? null,
      input.limit ?? null
    ] as const,
  recommendationPosts: (input: ListMyRecommendationPostsQuery = {}) =>
    [
      "mobile-backend",
      "query",
      "recommendation-posts",
      input.cursor ?? null,
      input.limit ?? null
    ] as const
};
