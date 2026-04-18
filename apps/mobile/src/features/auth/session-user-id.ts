const DEFAULT_MOBILE_STUB_USER_ID = "user_mobile_dev";

function normalizeUserIdCandidate(userId: string | null | undefined) {
  return userId?.trim() ?? "";
}

export function resolveMobileSessionUserId(
  userId: string | null | undefined
): string {
  const normalizedUserId = normalizeUserIdCandidate(userId);

  return normalizedUserId || DEFAULT_MOBILE_STUB_USER_ID;
}

export function createStubAccessToken(userId: string) {
  const issuedAt = Date.now();

  return `stub-session:${userId}:${issuedAt}`;
}

export { DEFAULT_MOBILE_STUB_USER_ID };
