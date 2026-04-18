import { ZodError } from "zod";

import {
  ApiAuthenticationError,
  ApiConfigurationError,
  ApiResponseError,
  ApiRuntimeNotReadyError
} from "../errors";

export const MOBILE_BACKEND_ERROR_CODES = [
  "configuration",
  "authentication",
  "runtime_not_ready",
  "contract_validation",
  "response",
  "unknown"
] as const;

export type MobileBackendErrorCode =
  (typeof MOBILE_BACKEND_ERROR_CODES)[number];

export class MobileBackendError extends Error {
  readonly code: MobileBackendErrorCode;
  readonly cause: unknown;
  readonly retryable: boolean;

  constructor(
    code: MobileBackendErrorCode,
    message: string,
    options?: {
      cause?: unknown;
      retryable?: boolean;
    }
  ) {
    super(message);
    this.name = "MobileBackendError";
    this.code = code;
    this.cause = options?.cause;
    this.retryable = options?.retryable ?? false;
  }
}

export function mapMobileBackendError(error: unknown): MobileBackendError {
  if (error instanceof MobileBackendError) {
    return error;
  }

  if (error instanceof ApiConfigurationError) {
    return new MobileBackendError("configuration", error.message, {
      cause: error
    });
  }

  if (error instanceof ApiAuthenticationError) {
    return new MobileBackendError("authentication", error.message, {
      cause: error
    });
  }

  if (error instanceof ApiRuntimeNotReadyError) {
    return new MobileBackendError("runtime_not_ready", error.message, {
      cause: error
    });
  }

  if (error instanceof ApiResponseError) {
    return new MobileBackendError(
      "response",
      error.message,
      {
        cause: error,
        retryable: error.status >= 500
      }
    );
  }

  if (error instanceof ZodError) {
    return new MobileBackendError(
      "contract_validation",
      "Backend payload did not match the shared contract.",
      { cause: error }
    );
  }

  if (error instanceof Error) {
    return new MobileBackendError("unknown", error.message, {
      cause: error,
      retryable: false
    });
  }

  return new MobileBackendError(
    "unknown",
    "An unknown mobile backend error occurred.",
    {
      cause: error,
      retryable: false
    }
  );
}
