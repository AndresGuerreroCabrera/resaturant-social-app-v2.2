import type {
  PublishRecommendationCommand,
  PublishRecommendationResponse
} from "@savory/contracts/recommendations";
import {
  publishRecommendationCommandSchema,
  publishRecommendationResponseSchema
} from "@savory/contracts/recommendations";
import { canPublishRecommendation, RECOMMENDATION_WEEKLY_LIMIT } from "@savory/domain";

import { assertCommandRule } from "./errors";
import {
  toOwnedRecommendationPostDto,
  toRecommendationQuotaDto
} from "./mappers";
import { buildRecommendationPublishedOutboxEvent } from "./outbox-events";
import { defineBackendCommand } from "./runtime";

export const publishRecommendationBackendCommand = defineBackendCommand<
  PublishRecommendationCommand,
  PublishRecommendationResponse
>({
  name: "publish_recommendation",
  inputSchema: publishRecommendationCommandSchema,
  outputSchema: publishRecommendationResponseSchema,
  async execute(context, input) {
    return context.transactions.runInTransaction(async (transaction) => {
      const sourceEntry =
        await transaction.userPlaceEntries.findEntryByIdForUserForUpdate(
          input.userPlaceEntryId,
          context.actor.userId
        );

      assertCommandRule(
        sourceEntry,
        "USER_PLACE_ENTRY_NOT_FOUND",
        "The source entry does not exist for the actor.",
        { entryId: input.userPlaceEntryId }
      );

      const place = await transaction.places.findPlaceById(sourceEntry.placeId);

      assertCommandRule(
        place,
        "PLACE_NOT_FOUND",
        "The source place does not exist.",
        { placeId: sourceEntry.placeId }
      );

      const cycle = context.clock.currentRecommendationCycle();

      await transaction.recommendations.acquirePublicationQuotaLock(
        context.actor.userId,
        cycle
      );

      const existingPost =
        await transaction.recommendations.findPostByAuthorAndPlace(
          context.actor.userId,
          sourceEntry.placeId
        );

      assertCommandRule(
        existingPost == null,
        "RECOMMENDATION_PLACE_ALREADY_PUBLISHED",
        "The actor already published a recommendation for this place.",
        { placeId: sourceEntry.placeId }
      );

      const usedPosts = await transaction.recommendations.countPostsInCycle(
        context.actor.userId,
        cycle
      );

      assertCommandRule(
        canPublishRecommendation({
          entryStatus: sourceEntry.status,
          entryVisibility: sourceEntry.visibility,
          entryIsHidden: sourceEntry.isHidden,
          existingRecommendationCountInCycle: usedPosts,
          hasPublishedPlaceAlready: false
        }),
        usedPosts >= RECOMMENDATION_WEEKLY_LIMIT
          ? "RECOMMENDATION_QUOTA_EXCEEDED"
          : "RECOMMENDATION_NOT_PUBLISHABLE",
        usedPosts >= RECOMMENDATION_WEEKLY_LIMIT
          ? "The weekly recommendation quota is exhausted for the actor."
          : "Only public, visible visited entries can be published as recommendations.",
        {
          entryId: sourceEntry.id,
          usedPosts,
          weeklyLimit: RECOMMENDATION_WEEKLY_LIMIT
        }
      );

      const recommendation = await transaction.recommendations.createPost({
        authorUserId: context.actor.userId,
        placeId: sourceEntry.placeId,
        sourceEntryId: sourceEntry.id,
        cycle,
        snapshot: {
          rating: sourceEntry.rating,
          note: sourceEntry.note,
          priceTier: sourceEntry.priceTier,
          tags: sourceEntry.tags,
          placeName: place.name,
          placeAddress: place.address,
          placeCoordinates: place.coordinates
        }
      });

      await transaction.outbox.enqueue([
        buildRecommendationPublishedOutboxEvent(recommendation)
      ]);

      return {
        recommendation: toOwnedRecommendationPostDto(recommendation),
        quota: toRecommendationQuotaDto({
          cycle,
          used: usedPosts + 1
        })
      };
    });
  }
});
