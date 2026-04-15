import type { ConfigContext, ExpoConfig } from "expo/config";

const APP_ENV_VALUES = ["development", "staging", "production"] as const;

type AppEnv = (typeof APP_ENV_VALUES)[number];

function resolveAppEnv(value: string | undefined): AppEnv {
  if (value && APP_ENV_VALUES.includes(value as AppEnv)) {
    return value as AppEnv;
  }

  return "development";
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const appEnv = resolveAppEnv(process.env.EXPO_PUBLIC_APP_ENV);

  return {
    ...config,
    name: appEnv === "production" ? "Savory" : `Savory (${appEnv})`,
    slug: "savory-mobile",
    scheme: "savory",
    orientation: "portrait",
    userInterfaceStyle: "light",
    jsEngine: "hermes",
    plugins: ["expo-router"],
    experiments: {
      typedRoutes: true
    },
    extra: {
      appEnv,
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? null,
      enableStubSession:
        process.env.EXPO_PUBLIC_ENABLE_STUB_SESSION === "true"
    }
  };
};
