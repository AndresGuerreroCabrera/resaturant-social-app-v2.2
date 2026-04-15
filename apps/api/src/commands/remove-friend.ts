import type {
  RemoveFriendCommand,
  RemoveFriendResponse
} from "@savory/contracts/friendships";
import {
  removeFriendCommandSchema,
  removeFriendResponseSchema
} from "@savory/contracts/friendships";
import { normalizeFriendshipPair } from "@savory/domain";

import { assertCommandRule } from "./errors";
import { defineBackendCommand } from "./runtime";

export const removeFriendBackendCommand = defineBackendCommand<
  RemoveFriendCommand,
  RemoveFriendResponse
>({
  name: "remove_friend",
  inputSchema: removeFriendCommandSchema,
  outputSchema: removeFriendResponseSchema,
  async execute(context, input) {
    return context.transactions.runInTransaction(async (transaction) => {
      assertCommandRule(
        input.friendUserId !== context.actor.userId,
        "FRIENDSHIP_SELF_FORBIDDEN",
        "A user cannot remove themselves from friendship.",
        { friendUserId: input.friendUserId }
      );

      const pair = normalizeFriendshipPair(
        context.actor.userId,
        input.friendUserId
      );
      const removed = await transaction.friendships.deleteFriendshipByUsers(
        pair.userIdA,
        pair.userIdB
      );

      return {
        friendUserId: input.friendUserId,
        action: removed ? "removed" : "not_friends"
      };
    });
  }
});
