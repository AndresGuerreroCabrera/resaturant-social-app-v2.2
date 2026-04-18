import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { MarkPlaceVisitedCommand } from "@savory/contracts";

import { mobileQueryKeys } from "../../../api/backend/queries/query-keys";
import { useMobileBackendAccess } from "../../../api/backend/use-mobile-backend-access";
import { useAuthSession } from "../../auth/auth-session";
import { resolveMobileSessionUserId } from "../../auth/session-user-id";

export function useMarkPlaceVisitedMutation() {
  const backend = useMobileBackendAccess();
  const queryClient = useQueryClient();
  const { session } = useAuthSession();
  const sessionUserId = session ? resolveMobileSessionUserId(session.userId) : null;

  return useMutation({
    mutationFn: (input: MarkPlaceVisitedCommand) =>
      backend.commands.markPlaceVisited(input),
    async onSuccess(response) {
      queryClient.setQueryData(mobileQueryKeys.place(response.entry.place.id), {
        place: response.entry.place
      });

      await queryClient.invalidateQueries({
        queryKey: ["mobile-backend", "query", "user-place-entries", sessionUserId]
      });

      await queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.myProfile(sessionUserId)
      });

      if (sessionUserId) {
        await queryClient.invalidateQueries({
          queryKey: mobileQueryKeys.publicProfile({
            profileUserId: sessionUserId
          })
        });
      }
    }
  });
}
