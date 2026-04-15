import type { IsoDateTimeString } from "@savory/domain";

import type { SocialOutboxEvent } from "../commands/outbox-events";

export const ASYNC_OUTBOX_STATUS_VALUES = [
  "pending",
  "processing",
  "processed",
  "failed"
] as const;

export type AsyncOutboxStatus = (typeof ASYNC_OUTBOX_STATUS_VALUES)[number];

export type AsyncOutboxEventId = string;

export interface PersistedOutboxEvent<TEvent extends SocialOutboxEvent = SocialOutboxEvent> {
  id: AsyncOutboxEventId;
  event: TEvent;
  status: AsyncOutboxStatus;
  retryCount: number;
  maxRetries: number;
  nextRunAt: IsoDateTimeString;
  lockedAt: IsoDateTimeString | null;
  lockedBy: string | null;
  leaseExpiresAt: IsoDateTimeString | null;
  errorMessage: string | null;
  processedAt: IsoDateTimeString | null;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

export interface ClaimedOutboxEvent<
  TEvent extends SocialOutboxEvent = SocialOutboxEvent
> extends PersistedOutboxEvent<TEvent> {
  status: "processing";
  lockedAt: IsoDateTimeString;
  lockedBy: string;
  leaseExpiresAt: IsoDateTimeString;
  processedAt: null;
}

export interface AsyncWorkerSettings {
  batchSize: number;
  pollIntervalMs: number;
  leaseDurationMs: number;
  retryBaseDelayMs: number;
  retryMaxDelayMs: number;
  defaultMaxRetries: number;
}

export const DEFAULT_ASYNC_WORKER_SETTINGS: AsyncWorkerSettings = {
  batchSize: 25,
  pollIntervalMs: 5000,
  leaseDurationMs: 60000,
  retryBaseDelayMs: 30000,
  retryMaxDelayMs: 1800000,
  defaultMaxRetries: 12
};

export interface AsyncBatchResult {
  claimed: number;
  processed: number;
  rescheduled: number;
  failed: number;
}
