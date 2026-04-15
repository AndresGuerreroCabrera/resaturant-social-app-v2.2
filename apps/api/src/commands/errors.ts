export const BACKEND_COMMAND_ERROR_CODES = [
  "FRIENDSHIP_SELF_FORBIDDEN",
  "FRIEND_USER_NOT_FOUND",
  "PLACE_NOT_FOUND",
  "PROFILE_CREATE_REQUIRES_PUBLIC_FIELDS",
  "PROFILE_HANDLE_ALREADY_TAKEN",
  "RECOMMENDATION_ALREADY_RESPONDED",
  "RECOMMENDATION_NOT_FOUND",
  "RECOMMENDATION_NOT_PUBLISHABLE",
  "RECOMMENDATION_PLACE_ALREADY_PUBLISHED",
  "RECOMMENDATION_QUOTA_EXCEEDED",
  "RECOMMENDATION_SELF_RESPONSE_FORBIDDEN",
  "USER_PLACE_ENTRY_NOT_FOUND"
] as const;

export type BackendCommandErrorCode =
  (typeof BACKEND_COMMAND_ERROR_CODES)[number];

export class BackendCommandError extends Error {
  readonly code: BackendCommandErrorCode;
  readonly details: Readonly<Record<string, unknown>> | null;

  constructor(
    code: BackendCommandErrorCode,
    message: string,
    details?: Readonly<Record<string, unknown>>
  ) {
    super(message);
    this.name = "BackendCommandError";
    this.code = code;
    this.details = details ?? null;
  }
}

export function assertCommandRule(
  condition: unknown,
  code: BackendCommandErrorCode,
  message: string,
  details?: Readonly<Record<string, unknown>>
): asserts condition {
  if (!condition) {
    throw new BackendCommandError(code, message, details);
  }
}
