import * as SecureStore from "expo-secure-store";
import {
  myProfileResponseSchema,
  profileMutationResponseSchema,
  publicProfileResponseSchema,
  type CreateOrUpdateProfileCommand,
  type MyProfileResponse,
  type ProfileMutationResponse,
  type PublicProfileResponse
} from "@savory/contracts";
import { normalizeProfileHandle } from "@savory/domain";
import { Platform } from "react-native";
import { z } from "zod";

import { ApiResponseError } from "../../errors";
import { stubMyProfileResponse, stubRecommendationFeedResponse } from "./stub-data";
import { countPublicVisitedEntriesForUser } from "./stub-place-store";

const STORAGE_KEY = "savory.mobile.stub-profile-store";

const stubProfileStoreSchema = z.object({
  profilesByUserId: z.record(z.string(), myProfileResponseSchema)
});

type StubProfileStore = z.infer<typeof stubProfileStoreSchema>;

function buildSeedProfiles(): Record<string, MyProfileResponse> {
  const feedProfiles = Object.fromEntries(
    stubRecommendationFeedResponse.items.map((item) => [
      item.author.userId,
      myProfileResponseSchema.parse({
        publicProfile: item.author,
        privateProfile: {
          userId: item.author.userId,
          onboardingCompletedAt: item.author.createdAt,
          updatedAt: item.author.updatedAt
        },
        publicStats: item.authorStats
      })
    ])
  );

  return {
    [stubMyProfileResponse.publicProfile.userId]: stubMyProfileResponse,
    ...feedProfiles
  };
}

const seedProfilesByUserId = buildSeedProfiles();

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

async function loadStore(): Promise<StubProfileStore> {
  const rawValue = await readRawStoreValue();

  if (!rawValue) {
    return {
      profilesByUserId: {}
    };
  }

  return stubProfileStoreSchema.parse(JSON.parse(rawValue));
}

async function persistStore(store: StubProfileStore) {
  await writeRawStoreValue(JSON.stringify(store));
}

function sanitizeHandleCandidate(userId: string) {
  const candidate = normalizeProfileHandle(userId)
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[^a-z0-9]+/, "")
    .slice(0, 30)
    .replace(/[^a-z0-9]+$/, "");

  return candidate || "member";
}

function createDisplayName(userId: string) {
  const compact = userId
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!compact) {
    return "New member";
  }

  return compact
    .split(" ")
    .slice(0, 3)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

function createDefaultProfile(userId: string): MyProfileResponse {
  const timestamp = new Date().toISOString();

  return myProfileResponseSchema.parse({
    publicProfile: {
      userId,
      handle: sanitizeHandleCandidate(userId),
      displayName: createDisplayName(userId),
      avatarKey: null,
      bio: null,
      createdAt: timestamp,
      updatedAt: timestamp
    },
    privateProfile: {
      userId,
      onboardingCompletedAt: null,
      updatedAt: timestamp
    },
    publicStats: {
      publicVisitedCount: 0,
      publishedRecommendationCount: 0,
      acceptedRecommendationCount: 0,
      reputationScore: 1000,
      expertiseLevelLabel: "Basico"
    }
  });
}

function buildPublicProfileResponse(
  profile: MyProfileResponse
): PublicProfileResponse {
  return publicProfileResponseSchema.parse({
    publicProfile: profile.publicProfile,
    publicStats: profile.publicStats
  });
}

async function applyDerivedPublicStats(profile: MyProfileResponse) {
  const publicVisitedCount = await countPublicVisitedEntriesForUser(
    profile.publicProfile.userId
  );

  return myProfileResponseSchema.parse({
    ...profile,
    publicStats: {
      ...profile.publicStats,
      publicVisitedCount
    }
  });
}

export async function loadOrCreateStubMyProfile(
  userId: string
): Promise<MyProfileResponse> {
  const store = await loadStore();
  const storedProfile = store.profilesByUserId[userId];

  if (storedProfile) {
    return applyDerivedPublicStats(myProfileResponseSchema.parse(storedProfile));
  }

  const seedProfile = seedProfilesByUserId[userId] ?? createDefaultProfile(userId);
  const nextStore = {
    ...store,
    profilesByUserId: {
      ...store.profilesByUserId,
      [userId]: seedProfile
    }
  } satisfies StubProfileStore;

  await persistStore(nextStore);

  return applyDerivedPublicStats(seedProfile);
}

export async function loadStubPublicProfile(
  userId: string
): Promise<PublicProfileResponse> {
  const store = await loadStore();
  const storedProfile = store.profilesByUserId[userId];
  const profile = storedProfile ?? seedProfilesByUserId[userId];

  if (!profile) {
    throw new ApiResponseError(404, {
      code: "profile_not_found",
      userId
    });
  }

  return buildPublicProfileResponse(await applyDerivedPublicStats(profile));
}

export async function saveStubProfileMutation(
  userId: string,
  command: CreateOrUpdateProfileCommand
): Promise<ProfileMutationResponse> {
  const currentProfile = await loadOrCreateStubMyProfile(userId);
  const timestamp = new Date().toISOString();
  const nextProfile = myProfileResponseSchema.parse({
    publicProfile: {
      ...currentProfile.publicProfile,
      ...command.publicProfile,
      updatedAt: timestamp
    },
    privateProfile: {
      ...currentProfile.privateProfile,
      ...command.privateProfile,
      updatedAt: timestamp
    },
    publicStats: currentProfile.publicStats
  });

  const store = await loadStore();
  const nextStore = {
    ...store,
    profilesByUserId: {
      ...store.profilesByUserId,
      [userId]: nextProfile
    }
  } satisfies StubProfileStore;

  await persistStore(nextStore);

  return profileMutationResponseSchema.parse({
    publicProfile: nextProfile.publicProfile,
    privateProfile: nextProfile.privateProfile
  });
}
