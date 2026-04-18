import {
  myProfileResponseSchema,
  recommendationFeedResponseSchema,
  type MyProfileResponse,
  type RecommendationFeedResponse
} from "@savory/contracts";
import {
  RECOMMENDATION_CYCLE_TIMEZONE,
  RECOMMENDATION_WEEKLY_LIMIT
} from "@savory/domain";

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

export const stubRecommendationFeedResponse: RecommendationFeedResponse =
  recommendationFeedResponseSchema.parse({
    items: [
      {
        recommendation: {
          id: "rec_1",
          authorUserId: "user_ana",
          placeId: "place_olive",
          cycle: {
            isoYear: 2026,
            isoWeek: 16,
            timezone: RECOMMENDATION_CYCLE_TIMEZONE
          },
          snapshot: {
            rating: 5,
            note: "Excellent lunch menu and very clean service loop.",
            priceTier: "$$",
            tags: ["menu", "weekday"],
            placeName: "Casa Olive",
            placeAddress: {
              formattedAddress: "Calle de Hortaleza 54, Madrid",
              locality: "Madrid",
              region: "Madrid",
              countryCode: "ES"
            },
            placeCoordinates: {
              latitude: 40.4234,
              longitude: -3.6993
            }
          },
          createdAt: "2026-04-14T09:12:00+02:00"
        },
        author: {
          userId: "user_ana",
          handle: "ana.cata",
          displayName: "Ana Cata",
          avatarKey: null,
          bio: "Lunch hunter and neighborhood recommender.",
          createdAt: "2026-04-01T10:00:00+02:00",
          updatedAt: "2026-04-14T09:12:00+02:00"
        },
        authorStats: {
          publicVisitedCount: 21,
          publishedRecommendationCount: 9,
          acceptedRecommendationCount: 6,
          reputationScore: 1038,
          expertiseLevelLabel: "Foodie"
        },
        place: {
          id: "place_olive",
          name: "Casa Olive",
          address: {
            formattedAddress: "Calle de Hortaleza 54, Madrid",
            locality: "Madrid",
            region: "Madrid",
            countryCode: "ES"
          },
          coordinates: {
            latitude: 40.4234,
            longitude: -3.6993
          }
        },
        viewerReaction: null
      },
      {
        recommendation: {
          id: "rec_2",
          authorUserId: "user_raul",
          placeId: "place_marea",
          cycle: {
            isoYear: 2026,
            isoWeek: 16,
            timezone: RECOMMENDATION_CYCLE_TIMEZONE
          },
          snapshot: {
            rating: 4,
            note: "Good seafood rice, better for dinner than for quick lunch.",
            priceTier: "$$$",
            tags: ["rice", "seafood"],
            placeName: "Marea Norte",
            placeAddress: {
              formattedAddress: "Calle de Ibiza 18, Madrid",
              locality: "Madrid",
              region: "Madrid",
              countryCode: "ES"
            },
            placeCoordinates: {
              latitude: 40.4182,
              longitude: -3.6762
            }
          },
          createdAt: "2026-04-14T19:40:00+02:00"
        },
        author: {
          userId: "user_raul",
          handle: "raul.sabor",
          displayName: "Raul Sabor",
          avatarKey: null,
          bio: "Seafood and market spots.",
          createdAt: "2026-03-18T11:20:00+01:00",
          updatedAt: "2026-04-14T19:40:00+02:00"
        },
        authorStats: {
          publicVisitedCount: 34,
          publishedRecommendationCount: 12,
          acceptedRecommendationCount: 9,
          reputationScore: 1086,
          expertiseLevelLabel: "Gourmet"
        },
        place: {
          id: "place_marea",
          name: "Marea Norte",
          address: {
            formattedAddress: "Calle de Ibiza 18, Madrid",
            locality: "Madrid",
            region: "Madrid",
            countryCode: "ES"
          },
          coordinates: {
            latitude: 40.4182,
            longitude: -3.6762
          }
        },
        viewerReaction: "accepted"
      }
    ],
    quota: {
      cycle: {
        isoYear: 2026,
        isoWeek: 16,
        timezone: RECOMMENDATION_CYCLE_TIMEZONE
      },
      weeklyLimit: RECOMMENDATION_WEEKLY_LIMIT,
      used: 1,
      remaining: 2
    }
  });
