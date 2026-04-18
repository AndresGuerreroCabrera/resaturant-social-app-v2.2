import {
  addFriendCommandSchema,
  createOrUpdateProfileCommandSchema,
  markPlaceVisitedCommandSchema,
  publishRecommendationCommandSchema,
  removeFriendCommandSchema,
  resolvePlaceCommandSchema,
  respondToRecommendationCommandSchema,
  savePlaceToWishlistCommandSchema
} from "@savory/contracts";

import {
  ApiConfigurationError,
  ApiRuntimeNotReadyError
} from "../../errors";
import type { ApiClient } from "../../http-client";
import type { MobileCommandAccess } from "../interfaces";

function createPendingHttpRuntimeError(operationName: string): never {
  throw new ApiRuntimeNotReadyError(
    `The HTTP mobile adapter is selected, but ${operationName} is still pending until apps/api exposes the matching endpoint.`
  );
}

export function createHttpCommandAccess(
  apiClient: ApiClient
): MobileCommandAccess {
  function ensureHttpClientConfigured() {
    if (!apiClient.isConfigured()) {
      throw new ApiConfigurationError(
        "EXPO_PUBLIC_API_BASE_URL is required when EXPO_PUBLIC_MOBILE_BACKEND_MODE=http."
      );
    }
  }

  return {
    async resolvePlace(input) {
      ensureHttpClientConfigured();
      resolvePlaceCommandSchema.parse(input);
      createPendingHttpRuntimeError("resolvePlace");
    },
    async createOrUpdateProfile(input) {
      ensureHttpClientConfigured();
      createOrUpdateProfileCommandSchema.parse(input);
      createPendingHttpRuntimeError("createOrUpdateProfile");
    },
    async savePlaceToWishlist(input) {
      ensureHttpClientConfigured();
      savePlaceToWishlistCommandSchema.parse(input);
      createPendingHttpRuntimeError("savePlaceToWishlist");
    },
    async markPlaceVisited(input) {
      ensureHttpClientConfigured();
      markPlaceVisitedCommandSchema.parse(input);
      createPendingHttpRuntimeError("markPlaceVisited");
    },
    async publishRecommendation(input) {
      ensureHttpClientConfigured();
      publishRecommendationCommandSchema.parse(input);
      createPendingHttpRuntimeError("publishRecommendation");
    },
    async respondToRecommendation(input) {
      ensureHttpClientConfigured();
      respondToRecommendationCommandSchema.parse(input);
      createPendingHttpRuntimeError("respondToRecommendation");
    },
    async addFriend(input) {
      ensureHttpClientConfigured();
      addFriendCommandSchema.parse(input);
      createPendingHttpRuntimeError("addFriend");
    },
    async removeFriend(input) {
      ensureHttpClientConfigured();
      removeFriendCommandSchema.parse(input);
      createPendingHttpRuntimeError("removeFriend");
    }
  };
}
