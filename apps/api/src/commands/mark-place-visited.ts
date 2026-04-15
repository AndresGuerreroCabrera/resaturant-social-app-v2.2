import type { UserPlaceEntry } from "@savory/domain";
import type {
  MarkPlaceVisitedCommand,
  MarkPlaceVisitedResponse
} from "@savory/contracts/user-place";
import {
  markPlaceVisitedCommandSchema,
  markPlaceVisitedResponseSchema
} from "@savory/contracts/user-place";

import { assertCommandRule } from "./errors";
import { toUserPlaceEntryDto } from "./mappers";
import { defineBackendCommand } from "./runtime";
import { resolvePlaceSelectionInTransaction } from "./resolve-place";

export const markPlaceVisitedBackendCommand = defineBackendCommand<
  MarkPlaceVisitedCommand,
  MarkPlaceVisitedResponse
>({
  name: "mark_place_visited",
  inputSchema: markPlaceVisitedCommandSchema,
  outputSchema: markPlaceVisitedResponseSchema,
  async execute(context, input) {
    return context.transactions.runInTransaction(async (transaction) => {
      let placeResolution: MarkPlaceVisitedResponse["placeResolution"] = null;
      let placeId = "";
      let existingEntry: UserPlaceEntry | null = null;

      if (input.target === "place") {
        const resolvedPlace = await resolvePlaceSelectionInTransaction(
          transaction,
          input.place
        );

        placeResolution = resolvedPlace.resolution;
        placeId = resolvedPlace.place.id;
        existingEntry =
          await transaction.userPlaceEntries.findEntryByUserAndPlaceForUpdate(
            context.actor.userId,
            placeId
          );
      } else {
        const entry =
          await transaction.userPlaceEntries.findEntryByIdForUserForUpdate(
            input.userPlaceEntryId,
            context.actor.userId
          );

        assertCommandRule(
          entry,
          "USER_PLACE_ENTRY_NOT_FOUND",
          "The targeted user-place entry does not exist for the actor.",
          { entryId: input.userPlaceEntryId }
        );

        existingEntry = entry;
        placeId = entry.placeId;
      }

      const place = await transaction.places.findPlaceById(placeId);

      assertCommandRule(
        place,
        "PLACE_NOT_FOUND",
        "The resolved place does not exist.",
        { placeId }
      );

      if (existingEntry == null) {
        const entry = await transaction.userPlaceEntries.createVisited({
          userId: context.actor.userId,
          placeId,
          visibility: input.visibility,
          visitedAt: input.visitedAt ?? null,
          rating: input.rating ?? null,
          note: input.note ?? null,
          tags: input.tags ?? [],
          priceTier: input.priceTier ?? null,
          isHidden: input.isHidden ?? false
        });

        return {
          entry: toUserPlaceEntryDto(entry, place),
          action: "created_visited",
          placeResolution
        };
      }

      if (existingEntry.status === "wishlist") {
        const entry = await transaction.userPlaceEntries.promoteWishlistToVisited({
          entryId: existingEntry.id,
          visibility: input.visibility,
          visitedAt: input.visitedAt ?? null,
          rating: input.rating ?? null,
          note: input.note ?? existingEntry.note,
          tags: input.tags ?? existingEntry.tags,
          priceTier: input.priceTier ?? null,
          isHidden: input.isHidden ?? existingEntry.isHidden
        });

        return {
          entry: toUserPlaceEntryDto(entry, place),
          action: "promoted_from_wishlist",
          placeResolution
        };
      }

      const entry = await transaction.userPlaceEntries.updateVisited({
        entryId: existingEntry.id,
        visibility: input.visibility,
        visitedAt: input.visitedAt ?? existingEntry.visitedAt,
        rating: input.rating ?? existingEntry.rating,
        note: input.note ?? existingEntry.note,
        tags: input.tags ?? existingEntry.tags,
        priceTier: input.priceTier ?? existingEntry.priceTier,
        isHidden: input.isHidden ?? existingEntry.isHidden
      });

      return {
        entry: toUserPlaceEntryDto(entry, place),
        action: "updated_visited",
        placeResolution
      };
    });
  }
});
