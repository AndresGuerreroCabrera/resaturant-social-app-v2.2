import {
  myProfileResponseSchema,
  type MyProfileResponse
} from "@savory/contracts";

export const stubMyProfileResponse: MyProfileResponse =
  myProfileResponseSchema.parse({
    publicProfile: {
      userId: "user_mobile_dev",
      handle: "mobile.dev",
      displayName: "Mobile Dev",
      avatarKey: null,
      bio: "Using the new Expo shell before the API runtime is fully wired.",
      createdAt: "2026-04-15T09:00:00+02:00",
      updatedAt: "2026-04-15T09:00:00+02:00"
    },
    privateProfile: {
      userId: "user_mobile_dev",
      onboardingCompletedAt: null,
      updatedAt: "2026-04-15T09:00:00+02:00"
    },
    publicStats: {
      publicVisitedCount: 0,
      publishedRecommendationCount: 0,
      acceptedRecommendationCount: 0,
      reputationScore: 1000,
      expertiseLevelLabel: "Basico"
    }
  });
