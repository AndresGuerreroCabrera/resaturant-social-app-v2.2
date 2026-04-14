import { RECOMMENDATION_REACTION_VALUES } from "@savory/domain";
import { z } from "zod";

import { entityIdSchema } from "./common";
import { placeDtoSchema } from "./places";
import {
  publicProfileDtoSchema,
  publicProfileStatsDtoSchema
} from "./profiles";
import {
  recommendationPostDtoSchema,
  recommendationQuotaDtoSchema
} from "./recommendations";

export const recommendationFeedItemDtoSchema = z.object({
  recommendation: recommendationPostDtoSchema,
  author: publicProfileDtoSchema,
  authorStats: publicProfileStatsDtoSchema.nullable(),
  place: placeDtoSchema,
  viewerReaction: z.enum(RECOMMENDATION_REACTION_VALUES).nullable()
});

export const listRecommendationFeedQuerySchema = z.object({
  cursor: entityIdSchema.optional(),
  limit: z.coerce.number().int().min(1).max(50).optional()
});

export const recommendationFeedResponseSchema = z.object({
  items: z.array(recommendationFeedItemDtoSchema),
  quota: recommendationQuotaDtoSchema
});

export type RecommendationFeedItemDto = z.infer<
  typeof recommendationFeedItemDtoSchema
>;
export type ListRecommendationFeedQuery = z.infer<
  typeof listRecommendationFeedQuerySchema
>;
export type RecommendationFeedResponse = z.infer<
  typeof recommendationFeedResponseSchema
>;
