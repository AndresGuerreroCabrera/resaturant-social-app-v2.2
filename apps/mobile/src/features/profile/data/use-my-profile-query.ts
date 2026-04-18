import { useQuery } from "@tanstack/react-query";

import { mapMobileBackendError } from "../../../api/backend/errors";
import { mobileQueryKeys } from "../../../api/backend/queries/query-keys";
import { useMobileBackendAccess } from "../../../api/backend/use-mobile-backend-access";
import { useAuthSession } from "../../auth/auth-session";
import { resolveMobileSessionUserId } from "../../auth/session-user-id";

interface UseMyProfileQueryOptions {
  enabled?: boolean;
}

export function useMyProfileQuery(options?: UseMyProfileQueryOptions) {
  const backend = useMobileBackendAccess();
  const { session } = useAuthSession();
  const sessionUserId = session ? resolveMobileSessionUserId(session.userId) : null;

  return useQuery({
    queryKey: mobileQueryKeys.myProfile(sessionUserId),
    queryFn: () => backend.queries.getMyProfile(),
    enabled: options?.enabled ?? true,
    throwOnError: false,
    meta: {
      errorMapper: mapMobileBackendError
    }
  });
}
