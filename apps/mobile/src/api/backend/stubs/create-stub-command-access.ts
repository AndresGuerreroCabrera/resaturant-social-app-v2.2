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

import { ApiRuntimeNotReadyError } from "../../errors";
import type { MobileCommandAccess } from "../interfaces";

function createStubCommandNotReady(operationName: string): never {
  throw new ApiRuntimeNotReadyError(
    `The mobile stub adapter does not execute ${operationName}. Commands stay blocked until apps/api exposes the real runtime.`
  );
}

export function createStubCommandAccess(): MobileCommandAccess {
  return {
    async resolvePlace(input) {
      resolvePlaceCommandSchema.parse(input);
      createStubCommandNotReady("resolvePlace");
    },
    async createOrUpdateProfile(input) {
      createOrUpdateProfileCommandSchema.parse(input);
      createStubCommandNotReady("createOrUpdateProfile");
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
