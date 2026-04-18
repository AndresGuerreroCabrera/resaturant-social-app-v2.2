import { useMutation, useQueryClient } from "@tanstack/react-query";

import type {
  CreateOrUpdateProfileCommand,
  MyProfileResponse,
  PublicProfileResponse
} from "@savory/contracts";

import { useMobileBackendAccess } from "../../../api/backend/use-mobile-backend-access";
import { mobileQueryKeys } from "../../../api/backend/queries/query-keys";
import { useAuthSession } from "../../auth/auth-session";
import { resolveMobileSessionUserId } from "../../auth/session-user-id";

export function useCreateOrUpdateProfileMutation() {
  const backend = useMobileBackendAccess();
  const queryClient = useQueryClient();
  const { session } = useAuthSession();
  const sessionUserId = session ? resolveMobileSessionUserId(session.userId) : null;

  return useMutation({
    mutationFn: (input: CreateOrUpdateProfileCommand) =>
      backend.commands.createOrUpdateProfile(input),
    async onSuccess(response) {
      queryClient.setQueryData(
        mobileQueryKeys.myProfile(sessionUserId),
        (currentProfile: MyProfileResponse | undefined) =>
          currentProfile
            ? {
                ...currentProfile,
                publicProfile: response.publicProfile,
                privateProfile: response.privateProfile
              }
            : currentProfile
      );

      if (sessionUserId) {
        queryClient.setQueryData(
          mobileQueryKeys.publicProfile({
            profileUserId: sessionUserId
          }),
          (currentPublicProfile: PublicProfileResponse | undefined) =>
            currentPublicProfile
              ? {
                  ...currentPublicProfile,
                  publicProfile: response.publicProfile
                }
              : currentPublicProfile
        );
      }

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
