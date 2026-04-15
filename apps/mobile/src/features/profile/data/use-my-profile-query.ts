import { useQuery } from "@tanstack/react-query";
import type { MyProfileResponse } from "@savory/contracts";

import { ApiRuntimeNotReadyError } from "../../../api/errors";
import { useApiClient } from "../../../api/use-api-client";
import { stubMyProfileResponse } from "./stub-my-profile";

async function getMyProfile(
  isApiConfigured: boolean
): Promise<MyProfileResponse> {
  if (!isApiConfigured) {
    await new Promise((resolve) => setTimeout(resolve, 160));
    return stubMyProfileResponse;
  }

  throw new ApiRuntimeNotReadyError(
    "The my-profile query is waiting for the real apps/api runtime."
  );
}

export function useMyProfileQuery() {
  const apiClient = useApiClient();

  return useQuery({
    queryKey: ["my-profile", apiClient.isConfigured()],
    queryFn: () => getMyProfile(apiClient.isConfigured())
  });
}
