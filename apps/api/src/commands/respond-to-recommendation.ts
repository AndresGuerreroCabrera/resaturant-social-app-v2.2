import type {
  RespondToRecommendationCommand,
  RespondToRecommendationResponse
} from "@savory/contracts/recommendations";
import {
  respondToRecommendationCommandSchema,
  respondToRecommendationResponseSchema
} from "@savory/contracts/recommendations";
import { canReactToRecommendation } from "@savory/domain";

import { assertCommandRule } from "./errors";
import {
  toRecommendationReactionDto,
  toUserPlaceEntryDto
} from "./mappers";
import { defineBackendCommand } from "./runtime";

export const respondToRecommendationBackendCommand = defineBackendCommand<
  RespondToRecommendationCommand,
  RespondToRecommendationResponse
>({
  name: "respond_to_recommendation",
  inputSchema: respondToRecommendationCommandSchema,
  outputSchema: respondToRecommendationResponseSchema,
  async execute(context, input) {
    return context.transactions.runInTransaction(async (transaction) => {
      const recommendation =
        await transaction.recommendations.findActivePostById(
          input.recommendationPostId
        );

      assertCommandRule(
        recommendation,
        "RECOMMENDATION_NOT_FOUND",
        "The recommendation is not available.",
        { recommendationPostId: input.recommendationPostId }
      );

      const existingReaction =
        await transaction.recommendations.findReactionByViewer(
          recommendation.id,
          context.actor.userId
        );

      assertCommandRule(
        canReactToRecommendation({
          authorUserId: recommendation.authorUserId,
          viewerUserId: context.actor.userId,
          hasExistingReaction: existingReaction != null
        }),
        existingReaction != null
          ? "RECOMMENDATION_ALREADY_RESPONDED"
          : "RECOMMENDATION_SELF_RESPONSE_FORBIDDEN",
        existingReaction != null
          ? "The actor already responded to this recommendation."
          : "The author cannot respond to their own recommendation.",
        { recommendationPostId: recommendation.id }
      );

      const reaction = await transaction.recommendations.createReaction({
        recommendationPostId: recommendation.id,
        viewerUserId: context.actor.userId,
        reaction: input.reaction
      });

      if (input.reaction === "rejected") {
        return {
          reaction: toRecommendationReactionDto(reaction),
          resultingEntry: null,
          entryAction: "none"
        };
      }

      const place = await transaction.places.findPlaceById(recommendation.placeId);

      assertCommandRule(
        place,
        "PLACE_NOT_FOUND",
        "The recommended place does not exist.",
        { placeId: recommendation.placeId }
      );

      const existingEntry =
        await transaction.userPlaceEntries.findEntryByUserAndPlaceForUpdate(
          context.actor.userId,
          recommendation.placeId
        );

      let resultingEntry = existingEntry;
      let entryAction: RespondToRecommendationResponse["entryAction"];

      if (existingEntry == null) {
        resultingEntry = await transaction.userPlaceEntries.createWishlist({
          userId: context.actor.userId,
          placeId: recommendation.placeId,
          note: null,
          tags: [],
          isHidden: false
        });
        entryAction = "created_wishlist";
      } else if (existingEntry.status === "wishlist") {
        entryAction = "kept_existing_wishlist";
      } else {
        entryAction = "kept_existing_visited";
      }

      await transaction.reputation.recordAcceptedRecommendation({
        subjectUserId: recommendation.authorUserId,
        actorUserId: context.actor.userId,
        recommendationPostId: recommendation.id,
        recommendationReactionId: reaction.id
      });

      assertCommandRule(
        resultingEntry,
        "USER_PLACE_ENTRY_NOT_FOUND",
        "Accepted recommendations must resolve to a viewer entry.",
        {
          recommendationPostId: recommendation.id,
          viewerUserId: context.actor.userId
        }
      );

      return {
        reaction: toRecommendationReactionDto(reaction),
        resultingEntry: toUserPlaceEntryDto(resultingEntry, place),
        entryAction
      };
    });
  }
});
