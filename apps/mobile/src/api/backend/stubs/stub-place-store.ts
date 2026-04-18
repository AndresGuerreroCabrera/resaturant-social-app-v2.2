import * as SecureStore from "expo-secure-store";
import {
  externalPlaceCandidateDtoSchema,
  listMyUserPlaceEntriesQuerySchema,
  markPlaceVisitedCommandSchema,
  markPlaceVisitedResponseSchema,
  placeDtoSchema,
  placeResponseSchema,
  resolvedPlaceResponseSchema,
  resolvePlaceCommandSchema,
  savePlaceToWishlistCommandSchema,
  savePlaceToWishlistResponseSchema,
  searchPlacesQuerySchema,
  searchPlacesResponseSchema,
  userPlaceEntriesResponseSchema,
  userPlaceEntryDtoSchema,
  type ExternalPlaceCandidateDto,
  type ListMyUserPlaceEntriesQuery,
  type MarkPlaceVisitedCommand,
  type MarkPlaceVisitedResponse,
  type PlaceDto,
  type PlaceResponse,
  type ResolvedPlaceResponse,
  type ResolvePlaceCommand,
  type SavePlaceToWishlistCommand,
  type SavePlaceToWishlistResponse,
  type SearchPlacesQuery,
  type SearchPlacesResponse,
  type UserPlaceEntriesResponse,
  type UserPlaceEntryDto
} from "@savory/contracts";
import {
  PLACE_PROVIDER_VALUES,
  isEntryInSystemList,
  isPublicVisitedEntry
} from "@savory/domain";
import { Platform } from "react-native";
import { z } from "zod";

import { ApiResponseError } from "../../errors";
import { stubRecommendationFeedResponse } from "./stub-data";

const STORAGE_KEY = "savory.mobile.stub-place-store";

const stubProviderReferenceSchema = z.object({
  provider: z.enum(PLACE_PROVIDER_VALUES),
  providerPlaceId: z.string().trim().min(1).max(160)
});

const stubPlaceRecordSchema = z.object({
  place: placeDtoSchema,
  providerReferences: z.array(stubProviderReferenceSchema)
});

const stubPlaceStoreSchema = z.object({
  placesById: z.record(z.string(), stubPlaceRecordSchema),
  entriesByUserId: z.record(z.string(), z.array(userPlaceEntryDtoSchema))
});

type StubPlaceRecord = z.infer<typeof stubPlaceRecordSchema>;
type StubPlaceStore = z.infer<typeof stubPlaceStoreSchema>;

function createSeedPlaceRecord(
  place: PlaceDto,
  providerPlaceId: string
): StubPlaceRecord {
  return {
    place,
    providerReferences: [
      {
        provider: "google_places",
        providerPlaceId
      }
    ]
  };
}

const seedPlaceRecords = [
  createSeedPlaceRecord(
    stubRecommendationFeedResponse.items[0].place,
    "g_place_olive"
  ),
  createSeedPlaceRecord(
    stubRecommendationFeedResponse.items[1].place,
    "g_place_marea"
  ),
  createSeedPlaceRecord(
    placeDtoSchema.parse({
      id: "place_bento_sol",
      name: "Bento Sol",
      address: {
        formattedAddress: "Calle de Alcala 112, Madrid",
        locality: "Madrid",
        region: "Madrid",
        countryCode: "ES"
      },
      coordinates: {
        latitude: 40.4254,
        longitude: -3.6752
      }
    }),
    "g_place_bento_sol"
  ),
  createSeedPlaceRecord(
    placeDtoSchema.parse({
      id: "place_tasca_norte",
      name: "Tasca Norte",
      address: {
        formattedAddress: "Calle de Ponzano 41, Madrid",
        locality: "Madrid",
        region: "Madrid",
        countryCode: "ES"
      },
      coordinates: {
        latitude: 40.4422,
        longitude: -3.6987
      }
    }),
    "g_place_tasca_norte"
  )
] as const;

const seedExternalCandidates = [
  externalPlaceCandidateDtoSchema.parse({
    provider: "google_places",
    providerPlaceId: "g_ext_sake_room",
    name: "Sake Room",
    address: {
      formattedAddress: "Calle de Santa Isabel 42, Madrid",
      locality: "Madrid",
      region: "Madrid",
      countryCode: "ES"
    },
    coordinates: {
      latitude: 40.4123,
      longitude: -3.6988
    }
  }),
  externalPlaceCandidateDtoSchema.parse({
    provider: "google_places",
    providerPlaceId: "g_ext_luna_burger",
    name: "Luna Burger",
    address: {
      formattedAddress: "Calle de Fuencarral 78, Madrid",
      locality: "Madrid",
      region: "Madrid",
      countryCode: "ES"
    },
    coordinates: {
      latitude: 40.4239,
      longitude: -3.7013
    }
  }),
  externalPlaceCandidateDtoSchema.parse({
    provider: "google_places",
    providerPlaceId: "g_ext_verde_bowl",
    name: "Verde Bowl",
    address: {
      formattedAddress: "Calle del Pez 29, Madrid",
      locality: "Madrid",
      region: "Madrid",
      countryCode: "ES"
    },
    coordinates: {
      latitude: 40.4249,
      longitude: -3.7077
    }
  })
] as const;

async function readRawStoreValue() {
  if (Platform.OS === "web") {
    return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null;
  }

  return SecureStore.getItemAsync(STORAGE_KEY);
}

async function writeRawStoreValue(value: string) {
  if (Platform.OS === "web") {
    globalThis.localStorage?.setItem(STORAGE_KEY, value);
    return;
  }

  await SecureStore.setItemAsync(STORAGE_KEY, value);
}

async function loadStore(): Promise<StubPlaceStore> {
  const rawValue = await readRawStoreValue();

  if (!rawValue) {
    return {
      placesById: {},
      entriesByUserId: {}
    };
  }

  return stubPlaceStoreSchema.parse(JSON.parse(rawValue));
}

async function persistStore(store: StubPlaceStore) {
  await writeRawStoreValue(JSON.stringify(store));
}

function buildMergedPlaceRecords(store: StubPlaceStore) {
  const merged = new Map<string, StubPlaceRecord>();

  for (const record of seedPlaceRecords) {
    merged.set(record.place.id, record);
  }

  for (const record of Object.values(store.placesById)) {
    merged.set(record.place.id, record);
  }

  return [...merged.values()];
}

function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase();
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function titleize(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
    .join(" ");
}

function createGeneratedExternalCandidate(
  query: string
): ExternalPlaceCandidateDto {
  const normalizedSlug = slugify(query) || "custom-place";
  const title = titleize(query) || "Custom place";

  return externalPlaceCandidateDtoSchema.parse({
    provider: "google_places",
    providerPlaceId: `g_generated_${normalizedSlug}`,
    name: title,
    address: {
      formattedAddress: `${title}, Madrid`,
      locality: "Madrid",
      region: "Madrid",
      countryCode: "ES"
    },
    coordinates: null
  });
}

function findPlaceRecordById(
  placeRecords: readonly StubPlaceRecord[],
  placeId: string
) {
  return placeRecords.find((record) => record.place.id === placeId) ?? null;
}

function findPlaceRecordByProviderReference(
  placeRecords: readonly StubPlaceRecord[],
  candidate: Pick<ExternalPlaceCandidateDto, "provider" | "providerPlaceId">
) {
  return (
    placeRecords.find((record) =>
      record.providerReferences.some(
        (reference) =>
          reference.provider === candidate.provider &&
          reference.providerPlaceId === candidate.providerPlaceId
      )
    ) ?? null
  );
}

function createPlaceFromExternalCandidate(
  candidate: ExternalPlaceCandidateDto,
  placeRecords: readonly StubPlaceRecord[]
): StubPlaceRecord {
  const baseId = `place_${slugify(
    `${candidate.provider}_${candidate.providerPlaceId}`
  )}`;
  let nextId = baseId || `place_${Date.now().toString(36)}`;
  let suffix = 1;

  while (placeRecords.some((record) => record.place.id === nextId)) {
    nextId = `${baseId}_${suffix}`;
    suffix += 1;
  }

  return {
    place: placeDtoSchema.parse({
      id: nextId,
      name: candidate.name,
      address: candidate.address,
      coordinates: candidate.coordinates
    }),
    providerReferences: [
      {
        provider: candidate.provider,
        providerPlaceId: candidate.providerPlaceId
      }
    ]
  };
}

function buildEntryMessagePlace(entry: UserPlaceEntryDto, place: PlaceDto) {
  return {
    ...entry,
    place
  } satisfies UserPlaceEntryDto;
}

function sortEntriesByUpdatedAt(entries: readonly UserPlaceEntryDto[]) {
  return [...entries].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt)
  );
}

function createEntryId(userId: string, placeId: string) {
  return `upe_${slugify(`${userId}_${placeId}`)}_${Date.now().toString(36)}`;
}

function createWishlistEntry(
  userId: string,
  place: PlaceDto,
  command: SavePlaceToWishlistCommand
): UserPlaceEntryDto {
  const timestamp = new Date().toISOString();

  return userPlaceEntryDtoSchema.parse({
    id: createEntryId(userId, place.id),
    userId,
    placeId: place.id,
    place,
    status: "wishlist",
    visibility: "private",
    visitedAt: null,
    rating: null,
    note: command.note ?? null,
    tags: command.tags ?? [],
    priceTier: null,
    isHidden: command.isHidden ?? false,
    createdAt: timestamp,
    updatedAt: timestamp
  });
}

function createVisitedEntry(
  userId: string,
  place: PlaceDto,
  command: MarkPlaceVisitedCommand
): UserPlaceEntryDto {
  const timestamp = new Date().toISOString();

  return userPlaceEntryDtoSchema.parse({
    id: createEntryId(userId, place.id),
    userId,
    placeId: place.id,
    place,
    status: "visited",
    visibility: command.visibility,
    visitedAt: command.visitedAt ?? null,
    rating: command.rating ?? null,
    note: command.note ?? null,
    tags: command.tags ?? [],
    priceTier: command.priceTier ?? null,
    isHidden: command.isHidden ?? false,
    createdAt: timestamp,
    updatedAt: timestamp
  });
}

function replaceEntry(
  entries: readonly UserPlaceEntryDto[],
  nextEntry: UserPlaceEntryDto
) {
  const nextEntries = [...entries];
  const existingIndex = nextEntries.findIndex((entry) => entry.id === nextEntry.id);

  if (existingIndex >= 0) {
    nextEntries[existingIndex] = nextEntry;
    return nextEntries;
  }

  nextEntries.unshift(nextEntry);
  return nextEntries;
}

function ensureEntryBelongsToActor(
  entries: readonly UserPlaceEntryDto[],
  entryId: string
) {
  const entry = entries.find((item) => item.id === entryId) ?? null;

  if (!entry) {
    throw new ApiResponseError(
      404,
      {
        code: "USER_PLACE_ENTRY_NOT_FOUND",
        entryId
      },
      "The selected place entry does not exist for this local session."
    );
  }

  return entry;
}

async function resolvePlaceSelectionInternal(
  store: StubPlaceStore,
  command: ResolvePlaceCommand
) {
  const parsedCommand = resolvePlaceCommandSchema.parse(command);
  const placeRecords = buildMergedPlaceRecords(store);

  if (parsedCommand.place.kind === "canonical") {
    const existingRecord = findPlaceRecordById(
      placeRecords,
      parsedCommand.place.placeId
    );

    if (!existingRecord) {
      throw new ApiResponseError(
        404,
        {
          code: "PLACE_NOT_FOUND",
          placeId: parsedCommand.place.placeId
        },
        "The selected canonical place does not exist."
      );
    }

    return resolvedPlaceResponseSchema.parse({
      place: existingRecord.place,
      resolution: "canonical_reused"
    });
  }

  const existingByProvider = findPlaceRecordByProviderReference(
    placeRecords,
    parsedCommand.place.externalPlace
  );

  if (existingByProvider) {
    return resolvedPlaceResponseSchema.parse({
      place: existingByProvider.place,
      resolution: "provider_reused"
    });
  }

  const createdRecord = createPlaceFromExternalCandidate(
    parsedCommand.place.externalPlace,
    placeRecords
  );
  const nextStore = {
    ...store,
    placesById: {
      ...store.placesById,
      [createdRecord.place.id]: createdRecord
    }
  } satisfies StubPlaceStore;

  await persistStore(nextStore);

  return resolvedPlaceResponseSchema.parse({
    place: createdRecord.place,
    resolution: "created"
  });
}

export async function resolveStubPlace(
  command: ResolvePlaceCommand
): Promise<ResolvedPlaceResponse> {
  const store = await loadStore();

  return resolvePlaceSelectionInternal(store, command);
}

export async function searchStubPlaces(
  query: SearchPlacesQuery
): Promise<SearchPlacesResponse> {
  const parsedQuery = searchPlacesQuerySchema.parse(query);
  const store = await loadStore();
  const normalizedQuery = normalizeSearchValue(parsedQuery.query);
  const placeRecords = buildMergedPlaceRecords(store);
  const limit = parsedQuery.limit ?? 8;

  const canonicalResults = placeRecords
    .filter((record) => {
      const haystack = [
        record.place.name,
        record.place.address.formattedAddress ?? "",
        record.place.address.locality ?? "",
        record.place.address.region ?? ""
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    })
    .map((record) => ({
      kind: "canonical" as const,
      place: record.place
    }));

  const externalResults = seedExternalCandidates
    .filter((candidate) => {
      if (findPlaceRecordByProviderReference(placeRecords, candidate)) {
        return false;
      }

      const haystack = [
        candidate.name,
        candidate.address.formattedAddress ?? "",
        candidate.address.locality ?? "",
        candidate.address.region ?? ""
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    })
    .map((candidate) => ({
      kind: "external" as const,
      externalPlace: candidate
    }));

  const generatedExternalResult =
    canonicalResults.length === 0 && externalResults.length === 0
      ? [
          {
            kind: "external" as const,
            externalPlace: createGeneratedExternalCandidate(parsedQuery.query)
          }
        ]
      : [];

  return searchPlacesResponseSchema.parse({
    results: [...canonicalResults, ...externalResults, ...generatedExternalResult].slice(
      0,
      limit
    )
  });
}

export async function getStubPlace(placeId: string): Promise<PlaceResponse> {
  const store = await loadStore();
  const placeRecord = findPlaceRecordById(buildMergedPlaceRecords(store), placeId);

  if (!placeRecord) {
    throw new ApiResponseError(
      404,
      {
        code: "PLACE_NOT_FOUND",
        placeId
      },
      "The requested place does not exist."
    );
  }

  return placeResponseSchema.parse({
    place: placeRecord.place
  });
}

export async function listStubUserPlaceEntries(
  userId: string,
  query: ListMyUserPlaceEntriesQuery
): Promise<UserPlaceEntriesResponse> {
  const parsedQuery = listMyUserPlaceEntriesQuerySchema.parse(query);
  const store = await loadStore();
  const userEntries = sortEntriesByUpdatedAt(store.entriesByUserId[userId] ?? []);
  const filteredEntries = userEntries.filter((entry) =>
    isEntryInSystemList(entry, parsedQuery.list)
  );
  const startIndex = parsedQuery.cursor
    ? filteredEntries.findIndex((entry) => entry.id === parsedQuery.cursor) + 1
    : 0;
  const limitedEntries = filteredEntries.slice(
    startIndex,
    startIndex + (parsedQuery.limit ?? 20)
  );

  return userPlaceEntriesResponseSchema.parse({
    entries: limitedEntries
  });
}

export async function saveStubPlaceToWishlist(
  userId: string,
  command: SavePlaceToWishlistCommand
): Promise<SavePlaceToWishlistResponse> {
  const parsedCommand = savePlaceToWishlistCommandSchema.parse(command);
  const store = await loadStore();
  const resolvedPlace = await resolvePlaceSelectionInternal(store, {
    place: parsedCommand.place
  });
  const latestStore = await loadStore();
  const currentEntries = latestStore.entriesByUserId[userId] ?? [];
  const existingEntry =
    currentEntries.find((entry) => entry.placeId === resolvedPlace.place.id) ?? null;

  if (!existingEntry) {
    const createdEntry = createWishlistEntry(
      userId,
      resolvedPlace.place,
      parsedCommand
    );
    const nextStore = {
      ...latestStore,
      entriesByUserId: {
        ...latestStore.entriesByUserId,
        [userId]: replaceEntry(currentEntries, createdEntry)
      }
    } satisfies StubPlaceStore;

    await persistStore(nextStore);

    return savePlaceToWishlistResponseSchema.parse({
      entry: createdEntry,
      action: "created_wishlist",
      placeResolution: resolvedPlace.resolution
    });
  }

  if (existingEntry.status === "wishlist") {
    const updatedEntry = userPlaceEntryDtoSchema.parse({
      ...buildEntryMessagePlace(existingEntry, resolvedPlace.place),
      note: parsedCommand.note ?? existingEntry.note,
      tags: parsedCommand.tags ?? existingEntry.tags,
      isHidden: parsedCommand.isHidden ?? existingEntry.isHidden,
      updatedAt: new Date().toISOString()
    });
    const nextStore = {
      ...latestStore,
      entriesByUserId: {
        ...latestStore.entriesByUserId,
        [userId]: replaceEntry(currentEntries, updatedEntry)
      }
    } satisfies StubPlaceStore;

    await persistStore(nextStore);

    return savePlaceToWishlistResponseSchema.parse({
      entry: updatedEntry,
      action: "updated_wishlist",
      placeResolution: resolvedPlace.resolution
    });
  }

  return savePlaceToWishlistResponseSchema.parse({
    entry: buildEntryMessagePlace(existingEntry, resolvedPlace.place),
    action: "kept_existing_visited",
    placeResolution: resolvedPlace.resolution
  });
}

export async function markStubPlaceVisited(
  userId: string,
  command: MarkPlaceVisitedCommand
): Promise<MarkPlaceVisitedResponse> {
  const parsedCommand = markPlaceVisitedCommandSchema.parse(command);
  const initialStore = await loadStore();
  let resolvedPlace: ResolvedPlaceResponse | null = null;
  let latestStore = initialStore;
  let existingEntry: UserPlaceEntryDto | null = null;
  let place: PlaceDto | null = null;

  if (parsedCommand.target === "place") {
    resolvedPlace = await resolvePlaceSelectionInternal(initialStore, {
      place: parsedCommand.place
    });
    latestStore = await loadStore();
    place = resolvedPlace.place;
    existingEntry =
      (latestStore.entriesByUserId[userId] ?? []).find(
        (entry) => entry.placeId === place.id
      ) ?? null;
  } else {
    const currentEntries = latestStore.entriesByUserId[userId] ?? [];
    existingEntry = ensureEntryBelongsToActor(
      currentEntries,
      parsedCommand.userPlaceEntryId
    );
    place = existingEntry.place;
  }

  if (!place) {
    throw new ApiResponseError(
      404,
      {
        code: "PLACE_NOT_FOUND"
      },
      "The selected place does not exist."
    );
  }

  const currentEntries = latestStore.entriesByUserId[userId] ?? [];

  if (!existingEntry) {
    const createdEntry = createVisitedEntry(userId, place, parsedCommand);
    const nextStore = {
      ...latestStore,
      entriesByUserId: {
        ...latestStore.entriesByUserId,
        [userId]: replaceEntry(currentEntries, createdEntry)
      }
    } satisfies StubPlaceStore;

    await persistStore(nextStore);

    return markPlaceVisitedResponseSchema.parse({
      entry: createdEntry,
      action: "created_visited",
      placeResolution: resolvedPlace?.resolution ?? null
    });
  }

  if (existingEntry.status === "wishlist") {
    const promotedEntry = userPlaceEntryDtoSchema.parse({
      ...buildEntryMessagePlace(existingEntry, place),
      status: "visited",
      visibility: parsedCommand.visibility,
      visitedAt: parsedCommand.visitedAt ?? null,
      rating: parsedCommand.rating ?? null,
      note: parsedCommand.note ?? existingEntry.note,
      tags: parsedCommand.tags ?? existingEntry.tags,
      priceTier: parsedCommand.priceTier ?? null,
      isHidden: parsedCommand.isHidden ?? existingEntry.isHidden,
      updatedAt: new Date().toISOString()
    });
    const nextStore = {
      ...latestStore,
      entriesByUserId: {
        ...latestStore.entriesByUserId,
        [userId]: replaceEntry(currentEntries, promotedEntry)
      }
    } satisfies StubPlaceStore;

    await persistStore(nextStore);

    return markPlaceVisitedResponseSchema.parse({
      entry: promotedEntry,
      action: "promoted_from_wishlist",
      placeResolution: resolvedPlace?.resolution ?? null
    });
  }

  const updatedEntry = userPlaceEntryDtoSchema.parse({
    ...buildEntryMessagePlace(existingEntry, place),
    visibility: parsedCommand.visibility,
    visitedAt: parsedCommand.visitedAt ?? existingEntry.visitedAt,
    rating: parsedCommand.rating ?? existingEntry.rating,
    note: parsedCommand.note ?? existingEntry.note,
    tags: parsedCommand.tags ?? existingEntry.tags,
    priceTier: parsedCommand.priceTier ?? existingEntry.priceTier,
    isHidden: parsedCommand.isHidden ?? existingEntry.isHidden,
    updatedAt: new Date().toISOString()
  });
  const nextStore = {
    ...latestStore,
    entriesByUserId: {
      ...latestStore.entriesByUserId,
      [userId]: replaceEntry(currentEntries, updatedEntry)
    }
  } satisfies StubPlaceStore;

  await persistStore(nextStore);

  return markPlaceVisitedResponseSchema.parse({
    entry: updatedEntry,
    action: "updated_visited",
    placeResolution: resolvedPlace?.resolution ?? null
  });
}

export async function countPublicVisitedEntriesForUser(userId: string) {
  const store = await loadStore();
  const entries = store.entriesByUserId[userId] ?? [];

  return entries.filter((entry) => isPublicVisitedEntry(entry)).length;
}
