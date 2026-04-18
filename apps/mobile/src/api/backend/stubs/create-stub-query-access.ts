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
import { ApiAuthenticationError, ApiRuntimeNotReadyError } from "../../errors";
import { stubRecommendationFeedResponse } from "./stub-data";
import {
  loadOrCreateStubMyProfile,
  loadStubPublicProfile
} from "./stub-profile-store";
import {
  getStubPlace,
  listStubUserPlaceEntries,
  searchStubPlaces
} from "./stub-place-store";

interface StubAccessOptions {
  sessionUserId: string | null;
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function createStubOnlyNotReady(operationName: string): never {
  throw new ApiRuntimeNotReadyError(
    `The mobile stub adapter does not provide ${operationName} yet. This operation depends on the real apps/api runtime.`
  );
}

function requireSessionUserId(sessionUserId: string | null) {
  if (!sessionUserId) {
    throw new ApiAuthenticationError(
      "A local mobile session is required before reading authenticated profile data."
    );
  }

  return sessionUserId;
}

export function createStubQueryAccess({
  sessionUserId
}: StubAccessOptions): MobileQueryAccess {
  return {
    async getMyProfile() {
      await wait(160);
      return loadOrCreateStubMyProfile(requireSessionUserId(sessionUserId));
    },
    async getPublicProfile(input) {
      const parsedInput = mapGetPublicProfileQuery(input);
      await wait(120);
      return loadStubPublicProfile(parsedInput.profileUserId);
    },
    async listRecommendationFeed(input) {
      mapListRecommendationFeedQuery(input);
      await wait(180);
      return stubRecommendationFeedResponse;
    },
    async listMyUserPlaceEntries(input) {
      const parsedInput = mapListMyUserPlaceEntriesQuery(input);
      await wait(140);
      return listStubUserPlaceEntries(
        requireSessionUserId(sessionUserId),
        parsedInput
      );
    },
    async listMyFriendships(input) {
      mapListMyFriendshipsQuery(input);
      createStubOnlyNotReady("listMyFriendships");
    },
    async searchPlaces(input) {
      const parsedInput = mapSearchPlacesQuery(input);
      await wait(180);
      return searchStubPlaces(parsedInput);
    },
    async getPlace(input) {
      const parsedInput = mapGetPlaceQuery(input);
      await wait(120);
      return getStubPlace(parsedInput.placeId);
    },
    async listMyRecommendationPosts(input) {
      mapListMyRecommendationPostsQuery(input);
      createStubOnlyNotReady("listMyRecommendationPosts");
    }
  };
}
