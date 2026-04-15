import type {
  Friendship,
  Place,
  PrivateProfile,
  PublicProfile,
  RecommendationPost,
  RecommendationReaction,
  ReputationSummary,
  UserPlaceEntry
} from "@savory/domain";
import {
  RECOMMENDATION_WEEKLY_LIMIT,
  recommendationSlotsRemaining
} from "@savory/domain";
import type {
  FriendshipDto,
  OwnedRecommendationPostDto,
  PlaceDto,
  PrivateProfileDto,
  PublicProfileDto,
  PublicRecommendationPostDto,
  RecommendationCycleKeyDto,
  RecommendationQuotaDto,
  RecommendationReactionDto,
  ReputationSummaryDto,
  UserPlaceEntryDto
} from "@savory/contracts";

export function toPlaceDto(place: Place): PlaceDto {
  return {
    id: place.id,
    name: place.name,
    address: {
      formattedAddress: place.address.formattedAddress,
      locality: place.address.locality,
      region: place.address.region,
      countryCode: place.address.countryCode
    },
    coordinates: place.coordinates
      ? {
          latitude: place.coordinates.latitude,
          longitude: place.coordinates.longitude
        }
      : null
  };
}

export function toPublicProfileDto(profile: PublicProfile): PublicProfileDto {
  return {
    userId: profile.userId,
    handle: profile.handle,
    displayName: profile.displayName,
    avatarKey: profile.avatarKey,
    bio: profile.bio,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt
  };
}

export function toPrivateProfileDto(
  profile: PrivateProfile
): PrivateProfileDto {
  return {
    userId: profile.userId,
    onboardingCompletedAt: profile.onboardingCompletedAt,
    updatedAt: profile.updatedAt
  };
}

export function toUserPlaceEntryDto(
  entry: UserPlaceEntry,
  place: Place
): UserPlaceEntryDto {
  const base = {
    id: entry.id,
    userId: entry.userId,
    placeId: entry.placeId,
    place: toPlaceDto(place),
    isHidden: entry.isHidden,
    note: entry.note,
    tags: [...entry.tags],
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt
  };

  if (entry.status === "wishlist") {
    return {
      ...base,
      status: "wishlist",
      visibility: "private",
      visitedAt: null,
      rating: null,
      priceTier: null
    };
  }

  return {
    ...base,
    status: "visited",
    visibility: entry.visibility,
    visitedAt: entry.visitedAt,
    rating: entry.rating,
    priceTier: entry.priceTier
  };
}

export function toFriendshipDto(friendship: Friendship): FriendshipDto {
  return {
    id: friendship.id,
    userIdA: friendship.userIdA,
    userIdB: friendship.userIdB,
    createdAt: friendship.createdAt
  };
}

export function toRecommendationCycleKeyDto(
  cycle: RecommendationPost["cycle"]
): RecommendationCycleKeyDto {
  return {
    isoYear: cycle.isoYear,
    isoWeek: cycle.isoWeek,
    timezone: cycle.timezone
  };
}

export function toOwnedRecommendationPostDto(
  post: RecommendationPost
): OwnedRecommendationPostDto {
  return {
    id: post.id,
    authorUserId: post.authorUserId,
    placeId: post.placeId,
    sourceEntryId: post.sourceEntryId,
    cycle: toRecommendationCycleKeyDto(post.cycle),
    snapshot: {
      rating: post.snapshot.rating,
      note: post.snapshot.note,
      priceTier: post.snapshot.priceTier,
      tags: [...post.snapshot.tags],
      placeName: post.snapshot.placeName,
      placeAddress: {
        formattedAddress: post.snapshot.placeAddress.formattedAddress,
        locality: post.snapshot.placeAddress.locality,
        region: post.snapshot.placeAddress.region,
        countryCode: post.snapshot.placeAddress.countryCode
      },
      placeCoordinates: post.snapshot.placeCoordinates
        ? {
            latitude: post.snapshot.placeCoordinates.latitude,
            longitude: post.snapshot.placeCoordinates.longitude
          }
        : null
    },
    createdAt: post.createdAt,
    removedAt: post.removedAt
  };
}

export function toPublicRecommendationPostDto(
  post: RecommendationPost
): PublicRecommendationPostDto {
  return {
    id: post.id,
    authorUserId: post.authorUserId,
    placeId: post.placeId,
    cycle: toRecommendationCycleKeyDto(post.cycle),
    snapshot: {
      rating: post.snapshot.rating,
      note: post.snapshot.note,
      priceTier: post.snapshot.priceTier,
      tags: [...post.snapshot.tags],
      placeName: post.snapshot.placeName,
      placeAddress: {
        formattedAddress: post.snapshot.placeAddress.formattedAddress,
        locality: post.snapshot.placeAddress.locality,
        region: post.snapshot.placeAddress.region,
        countryCode: post.snapshot.placeAddress.countryCode
      },
      placeCoordinates: post.snapshot.placeCoordinates
        ? {
            latitude: post.snapshot.placeCoordinates.latitude,
            longitude: post.snapshot.placeCoordinates.longitude
          }
        : null
    },
    createdAt: post.createdAt
  };
}

export function toRecommendationReactionDto(
  reaction: RecommendationReaction
): RecommendationReactionDto {
  return {
    id: reaction.id,
    recommendationPostId: reaction.recommendationPostId,
    viewerUserId: reaction.viewerUserId,
    reaction: reaction.reaction,
    createdAt: reaction.createdAt
  };
}

export function toReputationSummaryDto(
  summary: ReputationSummary
): ReputationSummaryDto {
  return {
    score: summary.score,
    acceptedRecommendationCount: summary.acceptedRecommendationCount,
    expertiseLevelLabel: summary.expertiseLevelLabel,
    updatedAt: summary.updatedAt
  };
}

export function toRecommendationQuotaDto(input: {
  cycle: RecommendationPost["cycle"];
  used: number;
}): RecommendationQuotaDto {
  return {
    cycle: toRecommendationCycleKeyDto(input.cycle),
    weeklyLimit: RECOMMENDATION_WEEKLY_LIMIT,
    used: input.used,
    remaining: recommendationSlotsRemaining(input.used)
  };
}
