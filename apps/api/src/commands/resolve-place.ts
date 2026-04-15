import type { Place } from "@savory/domain";
import type {
  PlaceResolution,
  ResolvePlaceCommand,
  ResolvedPlaceResponse
} from "@savory/contracts/places";
import {
  resolvePlaceCommandSchema,
  resolvedPlaceResponseSchema
} from "@savory/contracts/places";

import { assertCommandRule } from "./errors";
import { toPlaceDto } from "./mappers";
import type { BackendCommandTransaction } from "./ports";
import { defineBackendCommand } from "./runtime";

export interface ResolvedPlaceRecord {
  place: Place;
  resolution: PlaceResolution;
}

export async function resolvePlaceSelectionInTransaction(
  transaction: BackendCommandTransaction,
  selection: ResolvePlaceCommand["place"]
): Promise<ResolvedPlaceRecord> {
  if (selection.kind === "canonical") {
    const place = await transaction.places.findPlaceById(selection.placeId);

    assertCommandRule(
      place,
      "PLACE_NOT_FOUND",
      "The requested canonical place does not exist.",
      { placeId: selection.placeId }
    );

    return {
      place,
      resolution: "canonical_reused"
    };
  }

  const reference = {
    provider: selection.externalPlace.provider,
    providerPlaceId: selection.externalPlace.providerPlaceId
  };
  const existing = await transaction.places.findPlaceByProviderReference(
    reference
  );

  if (existing) {
    return {
      place: existing,
      resolution: "provider_reused"
    };
  }

  const createdPlace = await transaction.places.createPlace({
    name: selection.externalPlace.name,
    address: selection.externalPlace.address,
    coordinates: selection.externalPlace.coordinates
  });

  await transaction.places.createPrimaryProviderReference({
    placeId: createdPlace.id,
    reference
  });

  return {
    place: createdPlace,
    resolution: "created"
  };
}

export const resolvePlaceBackendCommand = defineBackendCommand<
  ResolvePlaceCommand,
  ResolvedPlaceResponse
>({
  name: "resolve_place",
  inputSchema: resolvePlaceCommandSchema,
  outputSchema: resolvedPlaceResponseSchema,
  async execute(context, input) {
    return context.transactions.runInTransaction(async (transaction) => {
      const resolved = await resolvePlaceSelectionInTransaction(
        transaction,
        input.place
      );

      return {
        place: toPlaceDto(resolved.place),
        resolution: resolved.resolution
      };
    });
  }
});
