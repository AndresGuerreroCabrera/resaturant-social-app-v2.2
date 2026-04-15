import type { IsoDateTimeString } from "@savory/domain";

import type {
  BackendOutboxEventType,
  SocialOutboxEvent
} from "../commands/outbox-events";
import type { AsyncOutboxEventId, ClaimedOutboxEvent } from "./types";

export interface OutboxWriter {
  enqueue(events: readonly SocialOutboxEvent[]): Promise<void>;
}

export interface ClaimReadyOutboxEventsInput {
  workerId: string;
  now: IsoDateTimeString;
  limit: number;
  leaseDurationMs: number;
}

export interface CompleteOutboxEventInput {
  eventId: AsyncOutboxEventId;
  workerId: string;
  processedAt: IsoDateTimeString;
}

export interface RescheduleOutboxEventInput {
  eventId: AsyncOutboxEventId;
  workerId: string;
  nextRunAt: IsoDateTimeString;
  errorMessage: string;
  retryCount: number;
}

export interface FailOutboxEventInput {
  eventId: AsyncOutboxEventId;
  workerId: string;
  failedAt: IsoDateTimeString;
  errorMessage: string;
  retryCount: number;
}

export interface AsyncJobsStore extends OutboxWriter {
  claimReadyEvents(
    input: ClaimReadyOutboxEventsInput
  ): Promise<ClaimedOutboxEvent[]>;
  markProcessed(input: CompleteOutboxEventInput): Promise<void>;
  reschedule(input: RescheduleOutboxEventInput): Promise<void>;
  markFailed(input: FailOutboxEventInput): Promise<void>;
}

export interface AsyncEventHandlerContext {
  workerId: string;
  now: IsoDateTimeString;
}

export type AsyncEventHandler<
  TEvent extends SocialOutboxEvent = SocialOutboxEvent
> = (
  event: ClaimedOutboxEvent<TEvent>,
  context: AsyncEventHandlerContext
) => Promise<void>;

export type AsyncEventHandlerRegistry = {
  [K in BackendOutboxEventType]?: AsyncEventHandler<
    Extract<SocialOutboxEvent, { type: K }>
  >;
};
