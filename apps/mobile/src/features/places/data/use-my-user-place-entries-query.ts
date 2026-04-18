import { useQuery } from "@tanstack/react-query";

import type { UserPlaceList } from "@savory/domain";

import { mapMobileBackendError } from "../../../api/backend/errors";
import { mobileQueryKeys } from "../../../api/backend/queries/query-keys";
import { useMobileBackendAccess } from "../../../api/backend/use-mobile-backend-access";
import { useAuthSession } from "../../auth/auth-session";
import { resolveMobileSessionUserId } from "../../auth/session-user-id";

export function useMyUserPlaceEntriesQuery(list: UserPlaceList) {
  const backend = useMobileBackendAccess();
  const { session } = useAuthSession();
  const sessionUserId = session ? resolveMobileSessionUserId(session.userId) : null;

  return useQuery({
    queryKey: mobileQueryKeys.userPlaceEntries(sessionUserId, {
      list,
      limit: 20
    }),
    queryFn: () =>
      backend.queries.listMyUserPlaceEntries({
        list,
        limit: 20
      }),
    enabled: Boolean(sessionUserId),
    throwOnError: false,
    meta: {
      errorMapper: mapMobileBackendError
    }
  });
}
