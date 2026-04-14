import {
  RECOMMENDATION_CYCLE_TIMEZONE,
  RECOMMENDATION_REACTION_VALUES,
  RECOMMENDATION_WEEKLY_LIMIT
} from "@savory/domain";
import { z } from "zod";

import {
  entityIdSchema,
  geoPointSchema,
  isoDateTimeSchema,
  nullableTextSchema,
  priceTierSchema,
  ratingSchema,
  tagListSchema
} from "./common";
import { placeAddressDtoSchema } from "./places";

export const recommendationCycleKeyDtoSchema = z.object({
  isoYear: z.number().int().min(2000),
  isoWeek: z.number().int().min(1).max(53),
  timezone: z.literal(RECOMMENDATION_CYCLE_TIMEZONE)
});

export const recommendationContentSnapshotDtoSchema = z.object({
  rating: ratingSchema.nullable(),
  note: nullableTextSchema,
  priceTier: priceTierSchema.nullable(),
  tags: tagListSchema,
  placeName: z.string().trim().min(1).max(120),
  placeAddress: placeAddressDtoSchema,
  placeCoordinates: geoPointSchema.nullable()
});

export const recommendationPostDtoSchema = z.object({
  id: entityIdSchema,
  authorUserId: entityIdSchema,
  placeId: entityIdSchema,
  sourceEntryId: entityIdSchema,
  cycle: recommendationCycleKeyDtoSchema,
  snapshot: recommendationContentSnapshotDtoSchema,
  createdAt: isoDateTimeSchema,
  removedAt: isoDateTimeSchema.nullable()
});

export const recommendationReactionDtoSchema = z.object({
  id: entityIdSchema,
  recommendationPostId: entityIdSchema,
  viewerUserId: entityIdSchema,
  reaction: z.enum(RECOMMENDATION_REACTION_VALUES),
  createdAt: isoDateTimeSchema
});

export const recommendationQuotaDtoSchema = z.object({
  cycle: recommendationCycleKeyDtoSchema,
  weeklyLimit: z.literal(RECOMMENDATION_WEEKLY_LIMIT),
  used: z.number().int().min(0),
  remaining: z.number().int().min(0)
});

export const createRecommendationPostCommandSchema = z.object({
  userPlaceEntryId: entityIdSchema
});

export const reactToRecommendationCommandSchema = z.object({
  recommendationPostId: entityIdSchema,
  reaction: z.enum(RECOMMENDATION_REACTION_VALUES)
});

export const listMyRecommendationPostsQuerySchema = z.object({
  cursor: entityIdSchema.optional(),
  limit: z.coerce.number().int().min(1).max(50).optional()
});

export const recommendationPostResponseSchema = z.object({
  recommendation: recommendationPostDtoSchema
});

export type RecommendationCycleKeyDto = z.infer<
  typeof recommendationCycleKeyDtoSchema
>;
export type RecommendationContentSnapshotDto = z.infer<
  typeof recommendationContentSnapshotDtoSchema
>;
export type RecommendationPostDto = z.infer<
  typeof recommendationPostDtoSchema
>;
export type RecommendationReactionDto = z.infer<
  typeof recommendationReactionDtoSchema
>;
export type RecommendationQuotaDto = z.infer<
  typeof recommendationQuotaDtoSchema
>;
export type CreateRecommendationPostCommand = z.infer<
  typeof createRecommendationPostCommandSchema
>;
export type ReactToRecommendationCommand = z.infer<
  typeof reactToRecommendationCommandSchema
>;
export type ListMyRecommendationPostsQuery = z.infer<
  typeof listMyRecommendationPostsQuerySchema
>;
export type RecommendationPostResponse = z.infer<
  typeof recommendationPostResponseSchema
>;
