import { USER_PLACE_LIST_VALUES } from "@savory/domain";
import { z } from "zod";

import {
  entityIdSchema,
  isoDateTimeSchema,
  nullableTextSchema,
  priceTierSchema,
  ratingSchema,
  tagListSchema,
  visibilitySchema
} from "./common";
import {
  placeDtoSchema,
  placeResolutionSchema,
  placeSelectionInputSchema
} from "./places";

const userPlaceEntryBaseDtoSchema = z.object({
  id: entityIdSchema,
  userId: entityIdSchema,
  placeId: entityIdSchema,
  place: placeDtoSchema,
  isHidden: z.boolean(),
  note: nullableTextSchema,
  tags: tagListSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema
});

export const wishlistUserPlaceEntryDtoSchema =
  userPlaceEntryBaseDtoSchema.extend({
    status: z.literal("wishlist"),
    visibility: z.literal("private"),
    visitedAt: z.null(),
    rating: z.null(),
    priceTier: z.null()
  });

export const visitedUserPlaceEntryDtoSchema = userPlaceEntryBaseDtoSchema.extend({
  status: z.literal("visited"),
  visibility: visibilitySchema,
  visitedAt: isoDateTimeSchema.nullable(),
  rating: ratingSchema.nullable(),
  priceTier: priceTierSchema.nullable()
});

export const userPlaceEntryDtoSchema = z.discriminatedUnion("status", [
  wishlistUserPlaceEntryDtoSchema,
  visitedUserPlaceEntryDtoSchema
]);

export const listMyUserPlaceEntriesQuerySchema = z.object({
  list: z.enum(USER_PLACE_LIST_VALUES),
  cursor: entityIdSchema.optional(),
  limit: z.coerce.number().int().min(1).max(50).optional()
});

export const upsertWishlistEntryCommandSchema = z.object({
  place: placeSelectionInputSchema,
  note: nullableTextSchema.optional(),
  tags: tagListSchema.optional(),
  isHidden: z.boolean().optional()
});

export const savePlaceToWishlistCommandSchema = upsertWishlistEntryCommandSchema;

export const createVisitedEntryCommandSchema = z.object({
  place: placeSelectionInputSchema,
  visibility: visibilitySchema,
  visitedAt: isoDateTimeSchema.optional(),
  rating: ratingSchema.optional(),
  note: nullableTextSchema.optional(),
  tags: tagListSchema.optional(),
  priceTier: priceTierSchema.optional(),
  isHidden: z.boolean().optional()
});

const markPlaceVisitedBaseCommandSchema = z.object({
  visibility: visibilitySchema,
  visitedAt: isoDateTimeSchema.optional(),
  rating: ratingSchema.optional(),
  note: nullableTextSchema.optional(),
  tags: tagListSchema.optional(),
  priceTier: priceTierSchema.optional(),
  isHidden: z.boolean().optional()
});

export const markPlaceVisitedCommandSchema = z.discriminatedUnion("target", [
  markPlaceVisitedBaseCommandSchema.extend({
    target: z.literal("place"),
    place: placeSelectionInputSchema
  }),
  markPlaceVisitedBaseCommandSchema.extend({
    target: z.literal("entry"),
    userPlaceEntryId: entityIdSchema
  })
]);

export const promoteWishlistToVisitedCommandSchema = z.object({
  userPlaceEntryId: entityIdSchema,
  visibility: visibilitySchema,
  visitedAt: isoDateTimeSchema.optional(),
  rating: ratingSchema.optional(),
  note: nullableTextSchema.optional(),
  tags: tagListSchema.optional(),
  priceTier: priceTierSchema.optional(),
  isHidden: z.boolean().optional()
});

export const updateVisitedEntryVisibilityCommandSchema = z.object({
  userPlaceEntryId: entityIdSchema,
  visibility: visibilitySchema
});

export const setUserPlaceEntryHiddenCommandSchema = z.object({
  userPlaceEntryId: entityIdSchema,
  isHidden: z.boolean()
});

export const userPlaceEntryResponseSchema = z.object({
  entry: userPlaceEntryDtoSchema
});

export const userPlaceEntriesResponseSchema = z.object({
  entries: z.array(userPlaceEntryDtoSchema)
});

export const WISHLIST_MUTATION_ACTION_VALUES = [
  "created_wishlist",
  "updated_wishlist",
  "kept_existing_visited"
] as const;
export const wishlistMutationActionSchema = z.enum(
  WISHLIST_MUTATION_ACTION_VALUES
);

export const VISITED_MUTATION_ACTION_VALUES = [
  "created_visited",
  "promoted_from_wishlist",
  "updated_visited"
] as const;
export const visitedMutationActionSchema = z.enum(
  VISITED_MUTATION_ACTION_VALUES
);

export const savePlaceToWishlistResponseSchema = z.object({
  entry: userPlaceEntryDtoSchema,
  action: wishlistMutationActionSchema,
  placeResolution: placeResolutionSchema
});

export const markPlaceVisitedResponseSchema = z.object({
  entry: userPlaceEntryDtoSchema,
  action: visitedMutationActionSchema,
  placeResolution: placeResolutionSchema.nullable()
});

export type WishlistUserPlaceEntryDto = z.infer<
  typeof wishlistUserPlaceEntryDtoSchema
>;
export type VisitedUserPlaceEntryDto = z.infer<
  typeof visitedUserPlaceEntryDtoSchema
>;
export type UserPlaceEntryDto = z.infer<typeof userPlaceEntryDtoSchema>;
export type ListMyUserPlaceEntriesQuery = z.infer<
  typeof listMyUserPlaceEntriesQuerySchema
>;
export type UpsertWishlistEntryCommand = z.infer<
  typeof upsertWishlistEntryCommandSchema
>;
export type SavePlaceToWishlistCommand = z.infer<
  typeof savePlaceToWishlistCommandSchema
>;
export type CreateVisitedEntryCommand = z.infer<
  typeof createVisitedEntryCommandSchema
>;
export type MarkPlaceVisitedCommand = z.infer<
  typeof markPlaceVisitedCommandSchema
>;
export type PromoteWishlistToVisitedCommand = z.infer<
  typeof promoteWishlistToVisitedCommandSchema
>;
export type UpdateVisitedEntryVisibilityCommand = z.infer<
  typeof updateVisitedEntryVisibilityCommandSchema
>;
export type SetUserPlaceEntryHiddenCommand = z.infer<
  typeof setUserPlaceEntryHiddenCommandSchema
>;
export type UserPlaceEntryResponse = z.infer<typeof userPlaceEntryResponseSchema>;
export type UserPlaceEntriesResponse = z.infer<
  typeof userPlaceEntriesResponseSchema
>;
export type WishlistMutationAction = z.infer<
  typeof wishlistMutationActionSchema
>;
export type VisitedMutationAction = z.infer<typeof visitedMutationActionSchema>;
export type SavePlaceToWishlistResponse = z.infer<
  typeof savePlaceToWishlistResponseSchema
>;
export type MarkPlaceVisitedResponse = z.infer<
  typeof markPlaceVisitedResponseSchema
>;
