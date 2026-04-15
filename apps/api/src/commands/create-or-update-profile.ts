import type {
  CreateOrUpdateProfileCommand,
  ProfileMutationResponse
} from "@savory/contracts/profiles";
import {
  createOrUpdateProfileCommandSchema,
  profileMutationResponseSchema
} from "@savory/contracts/profiles";
import { normalizeProfileHandle } from "@savory/domain";

import { assertCommandRule, BackendCommandError } from "./errors";
import { toPrivateProfileDto, toPublicProfileDto } from "./mappers";
import { defineBackendCommand } from "./runtime";

export const createOrUpdateProfileBackendCommand = defineBackendCommand<
  CreateOrUpdateProfileCommand,
  ProfileMutationResponse
>({
  name: "create_or_update_profile",
  inputSchema: createOrUpdateProfileCommandSchema,
  outputSchema: profileMutationResponseSchema,
  async execute(context, input) {
    return context.transactions.runInTransaction(async (transaction) => {
      const currentPublicProfile =
        await transaction.profiles.getPublicProfileForUpdate(
          context.actor.userId
        );
      const currentPrivateProfile =
        await transaction.profiles.getPrivateProfileForUpdate(
          context.actor.userId
        );

      const nextHandle =
        input.publicProfile?.handle !== undefined
          ? normalizeProfileHandle(input.publicProfile.handle)
          : currentPublicProfile?.handle;
      const nextDisplayName =
        input.publicProfile?.displayName ?? currentPublicProfile?.displayName;

      if (nextHandle === undefined || nextDisplayName === undefined) {
        throw new BackendCommandError(
          "PROFILE_CREATE_REQUIRES_PUBLIC_FIELDS",
          "Creating a profile requires both handle and displayName.",
          { userId: context.actor.userId }
        );
      }

      if (nextHandle !== currentPublicProfile?.handle) {
        const conflictingProfile =
          await transaction.profiles.findPublicProfileByHandle(nextHandle);

        assertCommandRule(
          conflictingProfile == null ||
            conflictingProfile.userId === context.actor.userId,
          "PROFILE_HANDLE_ALREADY_TAKEN",
          "The requested handle is already in use.",
          { handle: nextHandle }
        );
      }

      const publicProfile = await transaction.profiles.upsertPublicProfile({
        userId: context.actor.userId,
        handle: nextHandle,
        displayName: nextDisplayName,
        avatarKey:
          input.publicProfile?.avatarKey ??
          currentPublicProfile?.avatarKey ??
          null,
        bio: input.publicProfile?.bio ?? currentPublicProfile?.bio ?? null
      });

      const privateProfile = await transaction.profiles.upsertPrivateProfile({
        userId: context.actor.userId,
        onboardingCompletedAt:
          input.privateProfile?.onboardingCompletedAt ??
          currentPrivateProfile?.onboardingCompletedAt ??
          null
      });

      return {
        publicProfile: toPublicProfileDto(publicProfile),
        privateProfile: toPrivateProfileDto(privateProfile)
      };
    });
  }
});
