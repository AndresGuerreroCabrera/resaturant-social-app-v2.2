import type { GeoPoint, IsoDateTimeString, PlaceId } from "./primitives";

export const PLACE_PROVIDER_VALUES = ["google_places"] as const;
export type PlaceProvider = (typeof PLACE_PROVIDER_VALUES)[number];

export interface PlaceAddress {
  formattedAddress: string | null;
  locality: string | null;
  region: string | null;
  countryCode: string | null;
}

export interface PlaceProviderReference {
  provider: PlaceProvider;
  providerPlaceId: string;
}

export interface Place {
  id: PlaceId;
  name: string;
  address: PlaceAddress;
  coordinates: GeoPoint | null;
  providerReferences: readonly PlaceProviderReference[];
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

export interface ExternalPlaceCandidate {
  provider: PlaceProvider;
  providerPlaceId: string;
  name: string;
  address: PlaceAddress;
  coordinates: GeoPoint | null;
}

export function hasCoordinates(place: Pick<Place, "coordinates">): boolean {
  return place.coordinates !== null;
}
