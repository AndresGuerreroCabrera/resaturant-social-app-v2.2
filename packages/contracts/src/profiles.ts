import { PROFILE_HANDLE_PATTERN } from "@savory/domain";
import { z } from "zod";

import {
  entityIdSchema,
  isoDateTimeSchema,
  nullableTextSchema,
  nonEmptyStringSchema
} from "./common";

export const profileHandleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(PROFILE_HANDLE_PATTERN);

export const publicProfileDtoSchema = z.object({
  userId: entityIdSchema,
  handle: profileHandleSchema,
  displayName: nonEmptyStringSchema.max(80),
  avatarKey: z.string().trim().min(1).max(64).nullable(),
  bio: z.string().trim().max(280).nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema
});

export const privateProfileDtoSchema = z.object({
  userId: entityIdSchema,
  onboardingCompletedAt: isoDateTimeSchema.nullable(),
  updatedAt: isoDateTimeSchema
});

export const publicProfileStatsDtoSchema = z.object({
  publicVisitedCount: z.number().int().min(0),
  publishedRecommendationCount: z.number().int().min(0),
  acceptedRecommendationCount: z.number().int().min(0),
  reputationScore: z.number().int(),
  expertiseLevelLabel: z.string().trim().min(1).max(64).nullable()
});

export const getPublicProfileQuerySchema = z.object({
  profileUserId: entityIdSchema
});

export const updateMyPublicProfileCommandSchema = z.object({
  handle: profileHandleSchema.optional(),
  displayName: nonEmptyStringSchema.max(80).optional(),
  avatarKey: z.string().trim().min(1).max(64).nullable().optional(),
  bio: z.string().trim().max(280).nullable().optional()
});

export const updateMyPrivateProfileCommandSchema = z.object({
  onboardingCompletedAt: isoDateTimeSchema.nullable().optional()
});

export const createOrUpdateProfileCommandSchema = z
  .object({
    publicProfile: updateMyPublicProfileCommandSchema.optional(),
    privateProfile: updateMyPrivateProfileCommandSchema.optional()
  })
  .refine(
    (value) =>
      value.publicProfile !== undefined || value.privateProfile !== undefined,
    {
      message: "At least one profile payload must be provided."
    }
  );

export const myProfileResponseSchema = z.object({
  publicProfile: publicProfileDtoSchema,
  privateProfile: privateProfileDtoSchema,
  publicStats: publicProfileStatsDtoSchema
});

export const publicProfileResponseSchema = z.object({
  publicProfile: publicProfileDtoSchema,
  publicStats: publicProfileStatsDtoSchema
});

export const profileMutationResponseSchema = z.object({
  publicProfile: publicProfileDtoSchema,
  privateProfile: privateProfileDtoSchema
});

export type PublicProfileDto = z.infer<typeof publicProfileDtoSchema>;
export type PrivateProfileDto = z.infer<typeof privateProfileDtoSchema>;
export type PublicProfileStatsDto = z.infer<
  typeof publicProfileStatsDtoSchema
>;
export type GetPublicProfileQuery = z.infer<
  typeof getPublicProfileQuerySchema
>;
export type UpdateMyPublicProfileCommand = z.infer<
  typeof updateMyPublicProfileCommandSchema
>;
export type UpdateMyPrivateProfileCommand = z.infer<
  typeof updateMyPrivateProfileCommandSchema
>;
export type CreateOrUpdateProfileCommand = z.infer<
  typeof createOrUpdateProfileCommandSchema
>;
export type MyProfileResponse = z.infer<typeof myProfileResponseSchema>;
export type PublicProfileResponse = z.infer<
  typeof publicProfileResponseSchema
>;
export type ProfileMutationResponse = z.infer<
  typeof profileMutationResponseSchema
>;
