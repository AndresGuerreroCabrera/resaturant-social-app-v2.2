import type { AuthUserId, IsoDateTimeString } from "./primitives";

export const AUTH_PROVIDER_VALUES = ["supabase_auth"] as const;
export type AuthProvider = (typeof AUTH_PROVIDER_VALUES)[number];

export interface AuthIdentity {
  userId: AuthUserId;
  provider: AuthProvider;
  issuedAt: IsoDateTimeString | null;
}

export function sameActor(
  left: Pick<AuthIdentity, "userId">,
  right: Pick<AuthIdentity, "userId">
): boolean {
  return left.userId === right.userId;
}
