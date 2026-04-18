import { useQuery } from "@tanstack/react-query";

import { mapMobileBackendError } from "../../../api/backend/errors";
import { mobileQueryKeys } from "../../../api/backend/queries/query-keys";
import { useMobileBackendAccess } from "../../../api/backend/use-mobile-backend-access";

export function useMyProfileQuery() {
  const backend = useMobileBackendAccess();

  return useQuery({
    queryKey: mobileQueryKeys.myProfile(),
    queryFn: () => backend.queries.getMyProfile(),
    throwOnError: false,
    meta: {
      errorMapper: mapMobileBackendError
    }
  });
}
