import type { AuthUserId, IsoDateTimeString } from "./primitives";

export const PROFILE_HANDLE_PATTERN =
  /^[a-z0-9](?:[a-z0-9._-]{1,28}[a-z0-9])?$/;

export interface PublicProfile {
  userId: AuthUserId;
  handle: string;
  displayName: string;
  avatarKey: string | null;
  bio: string | null;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

export interface PrivateProfile {
  userId: AuthUserId;
  onboardingCompletedAt: IsoDateTimeString | null;
  updatedAt: IsoDateTimeString;
}

export interface PublicProfileStats {
  publicVisitedCount: number;
  publishedRecommendationCount: number;
  acceptedRecommendationCount: number;
  reputationScore: number;
  expertiseLevelLabel: string | null;
}

export function normalizeProfileHandle(handle: string): string {
  return handle.trim().toLowerCase();
}

export function isValidProfileHandle(handle: string): boolean {
  return PROFILE_HANDLE_PATTERN.test(normalizeProfileHandle(handle));
}
