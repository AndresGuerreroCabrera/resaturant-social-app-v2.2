import type {
  FriendshipListResponse,
  GetPlaceQuery,
  GetPublicProfileQuery,
  ListMyFriendshipsQuery,
  ListMyRecommendationPostsQuery,
  ListMyUserPlaceEntriesQuery,
  ListRecommendationFeedQuery,
  MarkPlaceVisitedCommand,
  MyProfileResponse,
  OwnedRecommendationPostDto,
  PlaceResponse,
  PublicProfileResponse,
  RecommendationFeedResponse,
  SearchPlacesQuery,
  SearchPlacesResponse,
  UserPlaceEntriesResponse
} from "@savory/contracts";
import {
  friendshipListResponseSchema,
  getPlaceQuerySchema,
  getPublicProfileQuerySchema,
  listMyFriendshipsQuerySchema,
  listMyRecommendationPostsQuerySchema,
  listMyUserPlaceEntriesQuerySchema,
  listRecommendationFeedQuerySchema,
  markPlaceVisitedCommandSchema,
  myProfileResponseSchema,
  placeResponseSchema,
  publicProfileResponseSchema,
  recommendationFeedResponseSchema,
  recommendationPostResponseSchema,
  searchPlacesQuerySchema,
  searchPlacesResponseSchema,
  userPlaceEntriesResponseSchema
} from "@savory/contracts";

export function mapMyProfileResponse(payload: unknown): MyProfileResponse {
  return myProfileResponseSchema.parse(payload);
}

export function mapPublicProfileResponse(
  payload: unknown
): PublicProfileResponse {
  return publicProfileResponseSchema.parse(payload);
}

export function mapRecommendationFeedResponse(
  payload: unknown
): RecommendationFeedResponse {
  return recommendationFeedResponseSchema.parse(payload);
}

export function mapFriendshipListResponse(
  payload: unknown
): FriendshipListResponse {
  return friendshipListResponseSchema.parse(payload);
}

export function mapUserPlaceEntriesResponse(
  payload: unknown
): UserPlaceEntriesResponse {
  return userPlaceEntriesResponseSchema.parse(payload);
}

export function mapSearchPlacesResponse(payload: unknown): SearchPlacesResponse {
  return searchPlacesResponseSchema.parse(payload);
}

export function mapPlaceResponse(payload: unknown): PlaceResponse {
  return placeResponseSchema.parse(payload);
}

export function mapOwnedRecommendationPosts(
  payload: unknown
): readonly OwnedRecommendationPostDto[] {
  return recommendationPostResponseSchema.array().parse(payload).map(
    (item) => item.recommendation
  );
}

export function mapListRecommendationFeedQuery(
  payload: unknown
): ListRecommendationFeedQuery {
  return listRecommendationFeedQuerySchema.parse(payload ?? {});
}

export function mapListMyFriendshipsQuery(
  payload: unknown
): ListMyFriendshipsQuery {
  return listMyFriendshipsQuerySchema.parse(payload ?? {});
}

export function mapListMyRecommendationPostsQuery(
  payload: unknown
): ListMyRecommendationPostsQuery {
  return listMyRecommendationPostsQuerySchema.parse(payload ?? {});
}

export function mapListMyUserPlaceEntriesQuery(
  payload: unknown
): ListMyUserPlaceEntriesQuery {
  return listMyUserPlaceEntriesQuerySchema.parse(payload);
}

export function mapSearchPlacesQuery(payload: unknown): SearchPlacesQuery {
  return searchPlacesQuerySchema.parse(payload);
}

export function mapGetPlaceQuery(payload: unknown): GetPlaceQuery {
  return getPlaceQuerySchema.parse(payload);
}

export function mapGetPublicProfileQuery(
  payload: unknown
): GetPublicProfileQuery {
  return getPublicProfileQuerySchema.parse(payload);
}

export function mapMarkPlaceVisitedCommand(
  payload: unknown
): MarkPlaceVisitedCommand {
  return markPlaceVisitedCommandSchema.parse(payload);
}
