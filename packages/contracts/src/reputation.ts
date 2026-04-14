import { z } from "zod";

import { entityIdSchema, isoDateTimeSchema } from "./common";

export const reputationSummaryDtoSchema = z.object({
  score: z.number().int(),
  acceptedRecommendationCount: z.number().int().min(0),
  expertiseLevelLabel: z.string().trim().min(1).max(64).nullable(),
  updatedAt: isoDateTimeSchema.nullable()
});

export const getProfileReputationQuerySchema = z.object({
  profileUserId: entityIdSchema
});

export const reputationResponseSchema = z.object({
  reputation: reputationSummaryDtoSchema
});

export type ReputationSummaryDto = z.infer<typeof reputationSummaryDtoSchema>;
export type GetProfileReputationQuery = z.infer<
  typeof getProfileReputationQuerySchema
>;
export type ReputationResponse = z.infer<typeof reputationResponseSchema>;
