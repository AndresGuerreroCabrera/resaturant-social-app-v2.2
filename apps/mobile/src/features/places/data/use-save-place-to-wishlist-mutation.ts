import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { SavePlaceToWishlistCommand } from "@savory/contracts";

import { mobileQueryKeys } from "../../../api/backend/queries/query-keys";
import { useMobileBackendAccess } from "../../../api/backend/use-mobile-backend-access";
import { useAuthSession } from "../../auth/auth-session";
import { resolveMobileSessionUserId } from "../../auth/session-user-id";

export function useSavePlaceToWishlistMutation() {
  const backend = useMobileBackendAccess();
  const queryClient = useQueryClient();
  const { session } = useAuthSession();
  const sessionUserId = session ? resolveMobileSessionUserId(session.userId) : null;

  return useMutation({
    mutationFn: (input: SavePlaceToWishlistCommand) =>
      backend.commands.savePlaceToWishlist(input),
    async onSuccess(response) {
      queryClient.setQueryData(mobileQueryKeys.place(response.entry.place.id), {
        place: response.entry.place
      });

      await queryClient.invalidateQueries({
        queryKey: ["mobile-backend", "query", "user-place-entries", sessionUserId]
      });
    }
  });
}
