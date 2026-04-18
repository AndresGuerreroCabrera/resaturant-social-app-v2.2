import { env } from "../../config/env";

export type MobileBackendMode = "stub" | "http";

export function getMobileBackendMode(): MobileBackendMode {
  return env.backendMode;
}
