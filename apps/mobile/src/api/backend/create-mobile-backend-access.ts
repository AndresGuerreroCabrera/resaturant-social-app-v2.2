import { ApiClient } from "../http-client";
import { getMobileBackendMode, type MobileBackendMode } from "./adapter-mode";
import type { MobileBackendAccess } from "./interfaces";
import { createHttpCommandAccess } from "./http/create-http-command-access";
import { createHttpQueryAccess } from "./http/create-http-query-access";
import { createStubCommandAccess } from "./stubs/create-stub-command-access";
import { createStubQueryAccess } from "./stubs/create-stub-query-access";

function composeAccess(mode: MobileBackendMode, apiClient: ApiClient) {
  if (mode === "http") {
    return {
      mode,
      queries: createHttpQueryAccess(apiClient),
      commands: createHttpCommandAccess(apiClient)
    } satisfies MobileBackendAccess;
  }

  return {
    mode,
    queries: createStubQueryAccess(),
    commands: createStubCommandAccess()
  } satisfies MobileBackendAccess;
}

export function createMobileBackendAccess(
  apiClient: ApiClient
): MobileBackendAccess {
  return composeAccess(getMobileBackendMode(), apiClient);
}
