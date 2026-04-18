import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ResolvePlaceCommand } from "@savory/contracts";

import { mobileQueryKeys } from "../../../api/backend/queries/query-keys";
import { useMobileBackendAccess } from "../../../api/backend/use-mobile-backend-access";

export function useResolvePlaceMutation() {
  const backend = useMobileBackendAccess();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ResolvePlaceCommand) => backend.commands.resolvePlace(input),
    async onSuccess(response) {
      queryClient.setQueryData(mobileQueryKeys.place(response.place.id), {
        place: response.place
      });

      await queryClient.invalidateQueries({
        queryKey: ["mobile-backend", "query", "search-places"]
      });
    }
  });
}
