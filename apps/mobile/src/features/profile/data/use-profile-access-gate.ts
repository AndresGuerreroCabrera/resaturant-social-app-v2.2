import { mapMobileBackendError } from "../../../api/backend/errors";
import { useAuthSession } from "../../auth/auth-session";
import { useMyProfileQuery } from "./use-my-profile-query";

export type ProfileAccessGateStatus =
  | "hydrating"
  | "anonymous"
  | "loading_profile"
  | "needs_onboarding"
  | "ready"
  | "error";

export function useProfileAccessGate() {
  const { status: authStatus } = useAuthSession();
  const profileQuery = useMyProfileQuery({
    enabled: authStatus === "authenticated"
  });

  if (authStatus === "hydrating") {
    return {
      status: "hydrating" as const,
      profileQuery,
      error: null
    };
  }

  if (authStatus === "anonymous") {
    return {
      status: "anonymous" as const,
      profileQuery,
      error: null
    };
  }

  if (profileQuery.isLoading && !profileQuery.data) {
    return {
      status: "loading_profile" as const,
      profileQuery,
      error: null
    };
  }

  if (profileQuery.error && !profileQuery.data) {
    return {
      status: "error" as const,
      profileQuery,
      error: mapMobileBackendError(profileQuery.error)
    };
  }

  const onboardingCompleted = Boolean(
    profileQuery.data?.privateProfile.onboardingCompletedAt
  );

  return {
    status: onboardingCompleted ? ("ready" as const) : ("needs_onboarding" as const),
    profileQuery,
    error: null
  };
}
