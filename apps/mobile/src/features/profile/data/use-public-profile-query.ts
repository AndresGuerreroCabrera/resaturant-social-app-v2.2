import { useQuery } from "@tanstack/react-query";

import { mapMobileBackendError } from "../../../api/backend/errors";
import { mobileQueryKeys } from "../../../api/backend/queries/query-keys";
import { useMobileBackendAccess } from "../../../api/backend/use-mobile-backend-access";

interface UsePublicProfileQueryOptions {
  enabled?: boolean;
}

export function usePublicProfileQuery(
  profileUserId: string | null,
  options?: UsePublicProfileQueryOptions
) {
  const backend = useMobileBackendAccess();

  return useQuery({
    queryKey: mobileQueryKeys.publicProfile({
      profileUserId: profileUserId ?? "missing-profile-user-id"
    }),
    queryFn: () =>
      backend.queries.getPublicProfile({
        profileUserId: profileUserId ?? "missing-profile-user-id"
      }),
    enabled: (options?.enabled ?? true) && Boolean(profileUserId),
    throwOnError: false,
    meta: {
      errorMapper: mapMobileBackendError
    }
  });
}
