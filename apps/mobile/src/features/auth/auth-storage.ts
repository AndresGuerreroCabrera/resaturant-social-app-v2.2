import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import type { StoredApiSession } from "./types";

const STORAGE_KEY = "savory.mobile.api-session";

async function readRawValue() {
  if (Platform.OS === "web") {
    return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null;
  }

  return SecureStore.getItemAsync(STORAGE_KEY);
}

async function writeRawValue(value: string) {
  if (Platform.OS === "web") {
    globalThis.localStorage?.setItem(STORAGE_KEY, value);
    return;
  }

  await SecureStore.setItemAsync(STORAGE_KEY, value);
}

async function clearRawValue() {
  if (Platform.OS === "web") {
    globalThis.localStorage?.removeItem(STORAGE_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(STORAGE_KEY);
}

export async function loadStoredApiSession(): Promise<StoredApiSession | null> {
  const rawValue = await readRawValue();

  if (!rawValue) {
    return null;
  }

  return JSON.parse(rawValue) as StoredApiSession;
}

export async function persistStoredApiSession(session: StoredApiSession) {
  await writeRawValue(JSON.stringify(session));
}

export async function clearStoredApiSession() {
  await clearRawValue();
}
