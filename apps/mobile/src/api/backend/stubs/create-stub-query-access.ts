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
import { ApiRuntimeNotReadyError } from "../../errors";
import { stubMyProfileResponse, stubRecommendationFeedResponse } from "./stub-data";

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function createStubOnlyNotReady(operationName: string): never {
  throw new ApiRuntimeNotReadyError(
    `The mobile stub adapter does not provide ${operationName} yet. This operation depends on the real apps/api runtime.`
  );
}

export function createStubQueryAccess(): MobileQueryAccess {
  return {
    async getMyProfile() {
      await wait(160);
      return stubMyProfileResponse;
    },
    async getPublicProfile(input) {
      mapGetPublicProfileQuery(input);
      createStubOnlyNotReady("getPublicProfile");
    },
    async listRecommendationFeed(input) {
      mapListRecommendationFeedQuery(input);
      await wait(180);
      return stubRecommendationFeedResponse;
    },
    async listMyUserPlaceEntries(input) {
      mapListMyUserPlaceEntriesQuery(input);
      createStubOnlyNotReady("listMyUserPlaceEntries");
    },
    async listMyFriendships(input) {
      mapListMyFriendshipsQuery(input);
      createStubOnlyNotReady("listMyFriendships");
    },
    async searchPlaces(input) {
      mapSearchPlacesQuery(input);
      createStubOnlyNotReady("searchPlaces");
    },
    async getPlace(input) {
      mapGetPlaceQuery(input);
      createStubOnlyNotReady("getPlace");
    },
    async listMyRecommendationPosts(input) {
      mapListMyRecommendationPostsQuery(input);
      createStubOnlyNotReady("listMyRecommendationPosts");
    }
  };
}
