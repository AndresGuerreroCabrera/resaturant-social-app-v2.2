import { useQuery } from "@tanstack/react-query";
import type { RecommendationFeedResponse } from "@savory/contracts";

import { ApiRuntimeNotReadyError } from "../../../api/errors";
import { useApiClient } from "../../../api/use-api-client";
import { stubRecommendationFeedResponse } from "./stub-recommendation-feed";

async function listRecommendationFeed(
  isApiConfigured: boolean
): Promise<RecommendationFeedResponse> {
  if (!isApiConfigured) {
    await new Promise((resolve) => setTimeout(resolve, 180));
    return stubRecommendationFeedResponse;
  }

  throw new ApiRuntimeNotReadyError(
    "The recommendation feed endpoint is not wired yet. This screen is using contracts and local stubs until apps/api exposes a real runtime."
  );
}

export function useRecommendationFeedQuery() {
  const apiClient = useApiClient();

  return useQuery({
    queryKey: ["recommendation-feed", apiClient.isConfigured()],
    queryFn: () => listRecommendationFeed(apiClient.isConfigured())
  });
}
