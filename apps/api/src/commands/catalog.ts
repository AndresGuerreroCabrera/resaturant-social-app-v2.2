import { addFriendBackendCommand } from "./add-friend";
import { createOrUpdateProfileBackendCommand } from "./create-or-update-profile";
import { markPlaceVisitedBackendCommand } from "./mark-place-visited";
import { publishRecommendationBackendCommand } from "./publish-recommendation";
import { removeFriendBackendCommand } from "./remove-friend";
import { resolvePlaceBackendCommand } from "./resolve-place";
import { respondToRecommendationBackendCommand } from "./respond-to-recommendation";
import { savePlaceToWishlistBackendCommand } from "./save-place-to-wishlist";

export const backendCommandCatalog = {
  resolve_place: resolvePlaceBackendCommand,
  create_or_update_profile: createOrUpdateProfileBackendCommand,
  save_place_to_wishlist: savePlaceToWishlistBackendCommand,
  mark_place_visited: markPlaceVisitedBackendCommand,
  publish_recommendation: publishRecommendationBackendCommand,
  respond_to_recommendation: respondToRecommendationBackendCommand,
  add_friend: addFriendBackendCommand,
  remove_friend: removeFriendBackendCommand
} as const;

export type BackendCommandName = keyof typeof backendCommandCatalog;
