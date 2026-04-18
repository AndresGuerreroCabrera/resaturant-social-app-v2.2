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

import { ApiAuthenticationError, ApiRuntimeNotReadyError } from "../../errors";
import type { MobileCommandAccess } from "../interfaces";
import { saveStubProfileMutation } from "./stub-profile-store";

interface StubAccessOptions {
  sessionUserId: string | null;
}

function createStubCommandNotReady(operationName: string): never {
  throw new ApiRuntimeNotReadyError(
    `The mobile stub adapter does not execute ${operationName}. Commands stay blocked until apps/api exposes the real runtime.`
  );
}

function requireSessionUserId(sessionUserId: string | null) {
  if (!sessionUserId) {
    throw new ApiAuthenticationError(
      "A local mobile session is required before executing authenticated profile commands."
    );
  }

  return sessionUserId;
}

export function createStubCommandAccess({
  sessionUserId
}: StubAccessOptions): MobileCommandAccess {
  return {
    async resolvePlace(input) {
      resolvePlaceCommandSchema.parse(input);
      createStubCommandNotReady("resolvePlace");
    },
    async createOrUpdateProfile(input) {
      const parsedInput = createOrUpdateProfileCommandSchema.parse(input);
      return saveStubProfileMutation(
        requireSessionUserId(sessionUserId),
        parsedInput
      );
    },
    async savePlaceToWishlist(input) {
      savePlaceToWishlistCommandSchema.parse(input);
      createStubCommandNotReady("savePlaceToWishlist");
    },
    async markPlaceVisited(input) {
      markPlaceVisitedCommandSchema.parse(input);
      createStubCommandNotReady("markPlaceVisited");
    },
    async publishRecommendation(input) {
      publishRecommendationCommandSchema.parse(input);
      createStubCommandNotReady("publishRecommendation");
    },
    async respondToRecommendation(input) {
      respondToRecommendationCommandSchema.parse(input);
      createStubCommandNotReady("respondToRecommendation");
    },
    async addFriend(input) {
      addFriendCommandSchema.parse(input);
      createStubCommandNotReady("addFriend");
    },
    async removeFriend(input) {
      removeFriendCommandSchema.parse(input);
      createStubCommandNotReady("removeFriend");
    }
  };
}
