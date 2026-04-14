import { z } from "zod";

import { entityIdSchema, isoDateTimeSchema } from "./common";
import { publicProfileDtoSchema } from "./profiles";

export const friendshipDtoSchema = z.object({
  id: entityIdSchema,
  userIdA: entityIdSchema,
  userIdB: entityIdSchema,
  createdAt: isoDateTimeSchema
});

export const friendshipListItemDtoSchema = z.object({
  friendshipId: entityIdSchema,
  friend: publicProfileDtoSchema,
  createdAt: isoDateTimeSchema
});

export const createFriendshipCommandSchema = z.object({
  friendUserId: entityIdSchema
});

export const removeFriendshipCommandSchema = z.object({
  friendUserId: entityIdSchema
});

export const listMyFriendshipsQuerySchema = z.object({
  cursor: entityIdSchema.optional(),
  limit: z.coerce.number().int().min(1).max(50).optional()
});

export const friendshipResponseSchema = z.object({
  friendship: friendshipDtoSchema
});

export const friendshipListResponseSchema = z.object({
  friendships: z.array(friendshipListItemDtoSchema)
});

export type FriendshipDto = z.infer<typeof friendshipDtoSchema>;
export type FriendshipListItemDto = z.infer<
  typeof friendshipListItemDtoSchema
>;
export type CreateFriendshipCommand = z.infer<
  typeof createFriendshipCommandSchema
>;
export type RemoveFriendshipCommand = z.infer<
  typeof removeFriendshipCommandSchema
>;
export type ListMyFriendshipsQuery = z.infer<
  typeof listMyFriendshipsQuerySchema
>;
export type FriendshipResponse = z.infer<typeof friendshipResponseSchema>;
export type FriendshipListResponse = z.infer<
  typeof friendshipListResponseSchema
>;
