import { AUTH_PROVIDER_VALUES } from "@savory/domain";
import { z } from "zod";

import { entityIdSchema, isoDateTimeSchema } from "./common";
import { privateProfileDtoSchema, publicProfileDtoSchema } from "./profiles";
import { reputationSummaryDtoSchema } from "./reputation";

export const actorDtoSchema = z.object({
  userId: entityIdSchema,
  provider: z.enum(AUTH_PROVIDER_VALUES),
  issuedAt: isoDateTimeSchema.nullable()
});

export const meResponseSchema = z.object({
  actor: actorDtoSchema,
  publicProfile: publicProfileDtoSchema,
  privateProfile: privateProfileDtoSchema,
  reputation: reputationSummaryDtoSchema
});

export type ActorDto = z.infer<typeof actorDtoSchema>;
export type MeResponse = z.infer<typeof meResponseSchema>;
