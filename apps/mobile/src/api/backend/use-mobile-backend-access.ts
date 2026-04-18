import { createMobileBackendAccess } from "./create-mobile-backend-access";
import { useApiClient } from "../use-api-client";
import { useAuthSession } from "../../features/auth/auth-session";
import { resolveMobileSessionUserId } from "../../features/auth/session-user-id";

export function useMobileBackendAccess() {
  const apiClient = useApiClient();
  const { session } = useAuthSession();

  return createMobileBackendAccess(
    apiClient,
    session ? resolveMobileSessionUserId(session.userId) : null
  );
}
