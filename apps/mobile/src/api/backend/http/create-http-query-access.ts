import {
  ApiConfigurationError,
  ApiRuntimeNotReadyError
} from "../../errors";
import type { ApiClient } from "../../http-client";
import type { MobileQueryAccess } from "../interfaces";
import {
  mapGetPlaceQuery,
  mapGetPublicProfileQuery,
  mapListMyFriendshipsQuery,
  mapListMyRecommendationPostsQuery,
  mapListMyUserPlaceEntriesQuery,
  mapListRecommendationFeedQuery,
  mapSearchPlacesQuery
} from "../mappers";

function createPendingHttpRuntimeError(operationName: string): never {
  throw new ApiRuntimeNotReadyError(
    `The HTTP mobile adapter is selected, but ${operationName} is still pending until apps/api exposes the matching endpoint.`
  );
}

function ensureHttpClientConfigured(apiClient: ApiClient) {
  if (!apiClient.isConfigured()) {
    throw new ApiConfigurationError(
      "EXPO_PUBLIC_API_BASE_URL is required when EXPO_PUBLIC_MOBILE_BACKEND_MODE=http."
    );
  }
}

export function createHttpQueryAccess(apiClient: ApiClient): MobileQueryAccess {
  return {
    async getMyProfile() {
      ensureHttpClientConfigured(apiClient);
      createPendingHttpRuntimeError("getMyProfile");
    },
    async getPublicProfile(input) {
      ensureHttpClientConfigured(apiClient);
      mapGetPublicProfileQuery(input);
      createPendingHttpRuntimeError("getPublicProfile");
    },
    async listRecommendationFeed(input) {
      ensureHttpClientConfigured(apiClient);
      mapListRecommendationFeedQuery(input);
      createPendingHttpRuntimeError("listRecommendationFeed");
    },
    async listMyUserPlaceEntries(input) {
      ensureHttpClientConfigured(apiClient);
      mapListMyUserPlaceEntriesQuery(input);
      createPendingHttpRuntimeError("listMyUserPlaceEntries");
    },
    async listMyFriendships(input) {
      ensureHttpClientConfigured(apiClient);
      mapListMyFriendshipsQuery(input);
      createPendingHttpRuntimeError("listMyFriendships");
    },
    async searchPlaces(input) {
      ensureHttpClientConfigured(apiClient);
      mapSearchPlacesQuery(input);
      createPendingHttpRuntimeError("searchPlaces");
    },
    async getPlace(input) {
      ensureHttpClientConfigured(apiClient);
      mapGetPlaceQuery(input);
      createPendingHttpRuntimeError("getPlace");
    },
    async listMyRecommendationPosts(input) {
      ensureHttpClientConfigured(apiClient);
      mapListMyRecommendationPostsQuery(input);
      createPendingHttpRuntimeError("listMyRecommendationPosts");
    }
  };
}
