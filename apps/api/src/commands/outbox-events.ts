import type { RespondToRecommendationResponse } from "@savory/contracts/recommendations";
import type {
  IsoDateTimeString,
  RecommendationCycleKey,
  RecommendationPost,
  RecommendationReaction,
  ReputationEvent,
  ReputationSummary
} from "@savory/domain";

export const BACKEND_OUTBOX_EVENT_TYPES = [
  "recommendation_published",
  "recommendation_response_recorded",
  "reputation_event_recorded"
] as const;

export type BackendOutboxEventType =
  (typeof BACKEND_OUTBOX_EVENT_TYPES)[number];

export type RecommendationResponseEntryAction =
  RespondToRecommendationResponse["entryAction"];

export interface BackendOutboxEvent<TType extends BackendOutboxEventType, TPayload> {
  type: TType;
  aggregateType: "recommendation_post" | "recommendation_reaction" | "reputation_event";
  aggregateId: string;
  occurredAt: IsoDateTimeString;
  payload: TPayload;
}

export type RecommendationPublishedOutboxEvent = BackendOutboxEvent<
  "recommendation_published",
  {
    recommendationPostId: RecommendationPost["id"];
    authorUserId: RecommendationPost["authorUserId"];
    placeId: RecommendationPost["placeId"];
    sourceEntryId: RecommendationPost["sourceEntryId"];
    cycle: RecommendationCycleKey;
  }
>;

export type RecommendationResponseRecordedOutboxEvent = BackendOutboxEvent<
  "recommendation_response_recorded",
  {
    recommendationPostId: RecommendationPost["id"];
    recommendationAuthorUserId: RecommendationPost["authorUserId"];
    viewerUserId: RecommendationReaction["viewerUserId"];
    recommendationReactionId: RecommendationReaction["id"];
    reaction: RecommendationReaction["reaction"];
    entryAction: RecommendationResponseEntryAction;
  }
>;

export type ReputationEventRecordedOutboxEvent = BackendOutboxEvent<
  "reputation_event_recorded",
  {
    reputationEventId: ReputationEvent["id"];
    subjectUserId: ReputationEvent["subjectUserId"];
    actorUserId: ReputationEvent["actorUserId"];
    recommendationPostId: ReputationEvent["recommendationPostId"];
    recommendationReactionId: ReputationEvent["recommendationReactionId"];
    score: ReputationSummary["score"];
    acceptedRecommendationCount: ReputationSummary["acceptedRecommendationCount"];
    expertiseLevelLabel: ReputationSummary["expertiseLevelLabel"];
  }
>;

export type SocialOutboxEvent =
  | RecommendationPublishedOutboxEvent
  | RecommendationResponseRecordedOutboxEvent
  | ReputationEventRecordedOutboxEvent;

export function buildRecommendationPublishedOutboxEvent(
  recommendation: RecommendationPost
): RecommendationPublishedOutboxEvent {
  return {
    type: "recommendation_published",
    aggregateType: "recommendation_post",
    aggregateId: recommendation.id,
    occurredAt: recommendation.createdAt,
    payload: {
      recommendationPostId: recommendation.id,
      authorUserId: recommendation.authorUserId,
      placeId: recommendation.placeId,
      sourceEntryId: recommendation.sourceEntryId,
      cycle: recommendation.cycle
    }
  };
}

export function buildRecommendationResponseRecordedOutboxEvent(input: {
  recommendation: RecommendationPost;
  reaction: RecommendationReaction;
  entryAction: RecommendationResponseEntryAction;
}): RecommendationResponseRecordedOutboxEvent {
  return {
    type: "recommendation_response_recorded",
    aggregateType: "recommendation_reaction",
    aggregateId: input.reaction.id,
    occurredAt: input.reaction.createdAt,
    payload: {
      recommendationPostId: input.recommendation.id,
      recommendationAuthorUserId: input.recommendation.authorUserId,
      viewerUserId: input.reaction.viewerUserId,
      recommendationReactionId: input.reaction.id,
      reaction: input.reaction.reaction,
      entryAction: input.entryAction
    }
  };
}

export function buildReputationEventRecordedOutboxEvent(input: {
  event: ReputationEvent;
  summary: ReputationSummary;
}): ReputationEventRecordedOutboxEvent {
  return {
    type: "reputation_event_recorded",
    aggregateType: "reputation_event",
    aggregateId: input.event.id,
    occurredAt: input.event.createdAt,
    payload: {
      reputationEventId: input.event.id,
      subjectUserId: input.event.subjectUserId,
      actorUserId: input.event.actorUserId,
      recommendationPostId: input.event.recommendationPostId,
      recommendationReactionId: input.event.recommendationReactionId,
      score: input.summary.score,
      acceptedRecommendationCount: input.summary.acceptedRecommendationCount,
      expertiseLevelLabel: input.summary.expertiseLevelLabel
    }
  };
}
