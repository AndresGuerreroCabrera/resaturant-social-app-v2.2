import { useQuery } from "@tanstack/react-query";

import { mapMobileBackendError } from "../../../api/backend/errors";
import { mobileQueryKeys } from "../../../api/backend/queries/query-keys";
import { useMobileBackendAccess } from "../../../api/backend/use-mobile-backend-access";

export function usePlaceSearchQuery(searchQuery: string) {
  const backend = useMobileBackendAccess();
  const normalizedQuery = searchQuery.trim();
  const isEnabled = normalizedQuery.length >= 2;

  return useQuery({
    queryKey: mobileQueryKeys.searchPlaces({
      query: normalizedQuery || "__empty__",
      limit: 8
    }),
    queryFn: () =>
      backend.queries.searchPlaces({
        query: normalizedQuery,
        limit: 8
      }),
    enabled: isEnabled,
    throwOnError: false,
    meta: {
      errorMapper: mapMobileBackendError
    }
  });
}
