import Constants from "expo-constants";
import { z } from "zod";

const mobileEnvSchema = z.object({
  appEnv: z.enum(["development", "staging", "production"]),
  apiBaseUrl: z.string().url().nullable(),
  backendMode: z.enum(["stub", "http"]),
  enableStubSession: z.boolean()
});

const rawExtra = (Constants.expoConfig?.extra ?? {}) as unknown;

export const env = mobileEnvSchema.parse(rawExtra);
