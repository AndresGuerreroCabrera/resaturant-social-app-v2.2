import { PLACE_PROVIDER_VALUES } from "@savory/domain";
import { z } from "zod";

import {
  entityIdSchema,
  geoPointSchema,
  nonEmptyStringSchema,
  paginationQuerySchema
} from "./common";

export const placeAddressDtoSchema = z.object({
  formattedAddress: z.string().trim().max(240).nullable(),
  locality: z.string().trim().max(120).nullable(),
  region: z.string().trim().max(120).nullable(),
  countryCode: z.string().trim().length(2).nullable()
});

export const placeDtoSchema = z.object({
  id: entityIdSchema,
  name: nonEmptyStringSchema.max(120),
  address: placeAddressDtoSchema,
  coordinates: geoPointSchema.nullable()
});

export const externalPlaceCandidateDtoSchema = z.object({
  provider: z.enum(PLACE_PROVIDER_VALUES),
  providerPlaceId: nonEmptyStringSchema.max(160),
  name: nonEmptyStringSchema.max(120),
  address: placeAddressDtoSchema,
  coordinates: geoPointSchema.nullable()
});

export const placeSearchResultDtoSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("canonical"),
    place: placeDtoSchema
  }),
  z.object({
    kind: z.literal("external"),
    externalPlace: externalPlaceCandidateDtoSchema
  })
]);

export const placeSelectionInputSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("canonical"),
    placeId: entityIdSchema
  }),
  z.object({
    kind: z.literal("external"),
    externalPlace: externalPlaceCandidateDtoSchema
  })
]);

export const searchPlacesQuerySchema = paginationQuerySchema.extend({
  query: nonEmptyStringSchema.min(2).max(120)
});

export const searchPlacesResponseSchema = z.object({
  results: z.array(placeSearchResultDtoSchema)
});

export const getPlaceQuerySchema = z.object({
  placeId: entityIdSchema
});

export const placeResponseSchema = z.object({
  place: placeDtoSchema
});

export type PlaceAddressDto = z.infer<typeof placeAddressDtoSchema>;
export type PlaceDto = z.infer<typeof placeDtoSchema>;
export type ExternalPlaceCandidateDto = z.infer<
  typeof externalPlaceCandidateDtoSchema
>;
export type PlaceSearchResultDto = z.infer<typeof placeSearchResultDtoSchema>;
export type PlaceSelectionInput = z.infer<typeof placeSelectionInputSchema>;
export type SearchPlacesQuery = z.infer<typeof searchPlacesQuerySchema>;
export type SearchPlacesResponse = z.infer<typeof searchPlacesResponseSchema>;
export type GetPlaceQuery = z.infer<typeof getPlaceQuerySchema>;
export type PlaceResponse = z.infer<typeof placeResponseSchema>;
