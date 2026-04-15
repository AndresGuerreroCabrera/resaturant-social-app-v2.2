import type {
  AddFriendCommand,
  AddFriendResponse
} from "@savory/contracts/friendships";
import {
  addFriendCommandSchema,
  addFriendResponseSchema
} from "@savory/contracts/friendships";
import { normalizeFriendshipPair } from "@savory/domain";

import { assertCommandRule } from "./errors";
import { toFriendshipDto } from "./mappers";
import { defineBackendCommand } from "./runtime";

export const addFriendBackendCommand = defineBackendCommand<
  AddFriendCommand,
  AddFriendResponse
>({
  name: "add_friend",
  inputSchema: addFriendCommandSchema,
  outputSchema: addFriendResponseSchema,
  async execute(context, input) {
    return context.transactions.runInTransaction(async (transaction) => {
      assertCommandRule(
        input.friendUserId !== context.actor.userId,
        "FRIENDSHIP_SELF_FORBIDDEN",
        "A user cannot become friends with themselves.",
        { friendUserId: input.friendUserId }
      );

      const friendExists = await transaction.authUsers.userExists(
        input.friendUserId
      );

      assertCommandRule(
        friendExists,
        "FRIEND_USER_NOT_FOUND",
        "The target user for friendship does not exist.",
        { friendUserId: input.friendUserId }
      );

      const pair = normalizeFriendshipPair(
        context.actor.userId,
        input.friendUserId
      );
      const existingFriendship =
        await transaction.friendships.findFriendshipByUsers(
          pair.userIdA,
          pair.userIdB
        );

      if (existingFriendship) {
        return {
          friendship: toFriendshipDto(existingFriendship),
          action: "already_friends"
        };
      }

      const friendship = await transaction.friendships.createFriendship({
        userIdA: pair.userIdA,
        userIdB: pair.userIdB
      });

      return {
        friendship: toFriendshipDto(friendship),
        action: "created"
      };
    });
  }
});
