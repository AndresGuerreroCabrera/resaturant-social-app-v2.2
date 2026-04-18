import { useQuery } from "@tanstack/react-query";

import { mapMobileBackendError } from "../../../api/backend/errors";
import { useMobileBackendAccess } from "../../../api/backend/use-mobile-backend-access";
import { mobileQueryKeys } from "../../../api/backend/queries/query-keys";

export function useRecommendationFeedQuery() {
  const backend = useMobileBackendAccess();

  return useQuery({
    queryKey: mobileQueryKeys.recommendationFeed(),
    queryFn: () => backend.queries.listRecommendationFeed(),
    throwOnError: false,
    meta: {
      errorMapper: mapMobileBackendError
    }
  });
}
