import type {
  AddFriendCommand,
  AddFriendResponse,
  CreateOrUpdateProfileCommand,
  FriendshipListResponse,
  GetPlaceQuery,
  GetPublicProfileQuery,
  ListMyFriendshipsQuery,
  ListMyRecommendationPostsQuery,
  ListMyUserPlaceEntriesQuery,
  ListRecommendationFeedQuery,
  MarkPlaceVisitedCommand,
  MarkPlaceVisitedResponse,
  MyProfileResponse,
  OwnedRecommendationPostDto,
  PlaceResponse,
  PublicProfileResponse,
  PublishRecommendationCommand,
  PublishRecommendationResponse,
  RemoveFriendCommand,
  RemoveFriendResponse,
  ResolvePlaceCommand,
  ResolvedPlaceResponse,
  RespondToRecommendationCommand,
  RespondToRecommendationResponse,
  SavePlaceToWishlistCommand,
  SavePlaceToWishlistResponse,
  SearchPlacesQuery,
  SearchPlacesResponse,
  UserPlaceEntriesResponse,
  ProfileMutationResponse,
  RecommendationFeedResponse
} from "@savory/contracts";

import type { MobileBackendMode } from "./adapter-mode";

export interface MobileQueryAccess {
  getMyProfile(): Promise<MyProfileResponse>;
  getPublicProfile(
    input: GetPublicProfileQuery
  ): Promise<PublicProfileResponse>;
  listRecommendationFeed(
    input?: ListRecommendationFeedQuery
  ): Promise<RecommendationFeedResponse>;
  listMyUserPlaceEntries(
    input: ListMyUserPlaceEntriesQuery
  ): Promise<UserPlaceEntriesResponse>;
  listMyFriendships(
    input?: ListMyFriendshipsQuery
  ): Promise<FriendshipListResponse>;
  searchPlaces(input: SearchPlacesQuery): Promise<SearchPlacesResponse>;
  getPlace(input: GetPlaceQuery): Promise<PlaceResponse>;
  listMyRecommendationPosts(
    input?: ListMyRecommendationPostsQuery
  ): Promise<readonly OwnedRecommendationPostDto[]>;
}

export interface MobileCommandAccess {
  resolvePlace(input: ResolvePlaceCommand): Promise<ResolvedPlaceResponse>;
  createOrUpdateProfile(
    input: CreateOrUpdateProfileCommand
  ): Promise<ProfileMutationResponse>;
  savePlaceToWishlist(
    input: SavePlaceToWishlistCommand
  ): Promise<SavePlaceToWishlistResponse>;
  markPlaceVisited(
    input: MarkPlaceVisitedCommand
  ): Promise<MarkPlaceVisitedResponse>;
  publishRecommendation(
    input: PublishRecommendationCommand
  ): Promise<PublishRecommendationResponse>;
  respondToRecommendation(
    input: RespondToRecommendationCommand
  ): Promise<RespondToRecommendationResponse>;
  addFriend(input: AddFriendCommand): Promise<AddFriendResponse>;
  removeFriend(input: RemoveFriendCommand): Promise<RemoveFriendResponse>;
}

export interface MobileBackendAccess {
  mode: MobileBackendMode;
  queries: MobileQueryAccess;
  commands: MobileCommandAccess;
}
