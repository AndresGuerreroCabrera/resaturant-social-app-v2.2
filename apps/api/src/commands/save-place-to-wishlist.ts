import type {
  SavePlaceToWishlistCommand,
  SavePlaceToWishlistResponse
} from "@savory/contracts/user-place";
import {
  savePlaceToWishlistCommandSchema,
  savePlaceToWishlistResponseSchema
} from "@savory/contracts/user-place";

import { toUserPlaceEntryDto } from "./mappers";
import { defineBackendCommand } from "./runtime";
import { resolvePlaceSelectionInTransaction } from "./resolve-place";

export const savePlaceToWishlistBackendCommand = defineBackendCommand<
  SavePlaceToWishlistCommand,
  SavePlaceToWishlistResponse
>({
  name: "save_place_to_wishlist",
  inputSchema: savePlaceToWishlistCommandSchema,
  outputSchema: savePlaceToWishlistResponseSchema,
  async execute(context, input) {
    return context.transactions.runInTransaction(async (transaction) => {
      const resolvedPlace = await resolvePlaceSelectionInTransaction(
        transaction,
        input.place
      );
      const existingEntry =
        await transaction.userPlaceEntries.findEntryByUserAndPlaceForUpdate(
          context.actor.userId,
          resolvedPlace.place.id
        );

      if (existingEntry == null) {
        const entry = await transaction.userPlaceEntries.createWishlist({
          userId: context.actor.userId,
          placeId: resolvedPlace.place.id,
          note: input.note ?? null,
          tags: input.tags ?? [],
          isHidden: input.isHidden ?? false
        });

        return {
          entry: toUserPlaceEntryDto(entry, resolvedPlace.place),
          action: "created_wishlist",
          placeResolution: resolvedPlace.resolution
        };
      }

      if (existingEntry.status === "wishlist") {
        const entry = await transaction.userPlaceEntries.updateWishlist({
          entryId: existingEntry.id,
          note: input.note ?? existingEntry.note,
          tags: input.tags ?? existingEntry.tags,
          isHidden: input.isHidden ?? existingEntry.isHidden
        });

        return {
          entry: toUserPlaceEntryDto(entry, resolvedPlace.place),
          action: "updated_wishlist",
          placeResolution: resolvedPlace.resolution
        };
      }

      return {
        entry: toUserPlaceEntryDto(existingEntry, resolvedPlace.place),
        action: "kept_existing_visited",
        placeResolution: resolvedPlace.resolution
      };
    });
  }
});
