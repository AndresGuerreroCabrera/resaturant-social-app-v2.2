import type {
  AuthUserId,
  IsoDateTimeString,
  RecommendationPostId,
  RecommendationReactionId,
  ReputationEventId
} from "./primitives";
import type { RecommendationReactionKind } from "./recommendations";

export const REPUTATION_EVENT_TYPE_VALUES = [
  "recommendation_accepted"
] as const;
export type ReputationEventType = (typeof REPUTATION_EVENT_TYPE_VALUES)[number];

export interface ReputationEvent {
  id: ReputationEventId;
  subjectUserId: AuthUserId;
  actorUserId: AuthUserId;
  recommendationPostId: RecommendationPostId;
  recommendationReactionId: RecommendationReactionId;
  type: ReputationEventType;
  createdAt: IsoDateTimeString;
}

export interface ReputationSummary {
  score: number;
  acceptedRecommendationCount: number;
  expertiseLevelLabel: string | null;
  updatedAt: IsoDateTimeString | null;
}

export function canCreateReputationEvent(input: {
  subjectUserId: AuthUserId;
  actorUserId: AuthUserId;
  reaction: RecommendationReactionKind;
  hasExistingEvent: boolean;
}): boolean {
  return (
    input.subjectUserId !== input.actorUserId &&
    input.reaction === "accepted" &&
    input.hasExistingEvent === false
  );
}
