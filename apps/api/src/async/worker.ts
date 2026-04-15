import type { IsoDateTimeString } from "@savory/domain";

import type { SocialOutboxEvent } from "../commands/outbox-events";
import type {
  AsyncEventHandler,
  AsyncEventHandlerContext,
  AsyncEventHandlerRegistry,
  AsyncJobsStore
} from "./ports";
import type {
  AsyncBatchResult,
  AsyncWorkerSettings,
  ClaimedOutboxEvent
} from "./types";
import { DEFAULT_ASYNC_WORKER_SETTINGS } from "./types";

export interface AsyncWorkerClock {
  now(): IsoDateTimeString;
}

export interface ProcessAsyncBatchDependencies {
  store: AsyncJobsStore;
  handlers: AsyncEventHandlerRegistry;
  clock: AsyncWorkerClock;
  workerId: string;
  settings?: Partial<AsyncWorkerSettings>;
}

export interface AsyncPollingWorker {
  workerId: string;
  settings: AsyncWorkerSettings;
  runOnce(): Promise<AsyncBatchResult>;
}

export function resolveAsyncWorkerSettings(
  overrides?: Partial<AsyncWorkerSettings>
): AsyncWorkerSettings {
  return {
    ...DEFAULT_ASYNC_WORKER_SETTINGS,
    ...overrides
  };
}

export function computeRetryDelayMs(input: {
  retryCount: number;
  settings?: Partial<Pick<AsyncWorkerSettings, "retryBaseDelayMs" | "retryMaxDelayMs">>;
}): number {
  const settings = {
    retryBaseDelayMs:
      input.settings?.retryBaseDelayMs ??
      DEFAULT_ASYNC_WORKER_SETTINGS.retryBaseDelayMs,
    retryMaxDelayMs:
      input.settings?.retryMaxDelayMs ??
      DEFAULT_ASYNC_WORKER_SETTINGS.retryMaxDelayMs
  };
  const exponentialDelay =
    settings.retryBaseDelayMs * 2 ** Math.max(input.retryCount - 1, 0);

  return Math.min(exponentialDelay, settings.retryMaxDelayMs);
}

export function createAsyncPollingWorker(
  dependencies: ProcessAsyncBatchDependencies
): AsyncPollingWorker {
  const settings = resolveAsyncWorkerSettings(dependencies.settings);

  return {
    workerId: dependencies.workerId,
    settings,
    runOnce() {
      return processAsyncBatch({
        ...dependencies,
        settings
      });
    }
  };
}

export async function processAsyncBatch(
  dependencies: ProcessAsyncBatchDependencies
): Promise<AsyncBatchResult> {
  const settings = resolveAsyncWorkerSettings(dependencies.settings);
  const now = dependencies.clock.now();
  const claimedEvents = await dependencies.store.claimReadyEvents({
    workerId: dependencies.workerId,
    now,
    limit: settings.batchSize,
    leaseDurationMs: settings.leaseDurationMs
  });

  const result: AsyncBatchResult = {
    claimed: claimedEvents.length,
    processed: 0,
    rescheduled: 0,
    failed: 0
  };

  for (const claimedEvent of claimedEvents) {
    const handler = getAsyncEventHandler(
      dependencies.handlers,
      claimedEvent
    );

    try {
      await handler(claimedEvent, {
        workerId: dependencies.workerId,
        now
      });

      await dependencies.store.markProcessed({
        eventId: claimedEvent.id,
        workerId: dependencies.workerId,
        processedAt: dependencies.clock.now()
      });
      result.processed += 1;
    } catch (error) {
      const retryCount = claimedEvent.retryCount + 1;
      const errorMessage = formatAsyncProcessingError(error);

      if (retryCount > claimedEvent.maxRetries) {
        await dependencies.store.markFailed({
          eventId: claimedEvent.id,
          workerId: dependencies.workerId,
          failedAt: dependencies.clock.now(),
          errorMessage,
          retryCount
        });
        result.failed += 1;
        continue;
      }

      await dependencies.store.reschedule({
        eventId: claimedEvent.id,
        workerId: dependencies.workerId,
        nextRunAt: addMillisecondsToIsoDateTime(
          dependencies.clock.now(),
          computeRetryDelayMs({
            retryCount,
            settings
          })
        ),
        errorMessage,
        retryCount
      });
      result.rescheduled += 1;
    }
  }

  return result;
}

function getAsyncEventHandler(
  handlers: AsyncEventHandlerRegistry,
  claimedEvent: ClaimedOutboxEvent
): AsyncEventHandler<SocialOutboxEvent> {
  const handler = handlers[claimedEvent.event.type];

  if (!handler) {
    return async (_event: ClaimedOutboxEvent<SocialOutboxEvent>) => {
      throw new Error(
        `No async handler is configured for event type '${claimedEvent.event.type}'.`
      );
    };
  }

  return (
    event: ClaimedOutboxEvent<SocialOutboxEvent>,
    context: AsyncEventHandlerContext
  ) => handler(event as never, context);
}

function addMillisecondsToIsoDateTime(
  isoDateTime: IsoDateTimeString,
  milliseconds: number
): IsoDateTimeString {
  return new Date(Date.parse(isoDateTime) + milliseconds).toISOString();
}

function formatAsyncProcessingError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown async processing error.";
}
