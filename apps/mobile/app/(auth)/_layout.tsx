import { Redirect, Stack } from "expo-router";

import { LoadingScreen } from "../../src/app/ui/loading-screen";
import { useAuthSession } from "../../src/features/auth/auth-session";

export default function AuthLayout() {
  const { status } = useAuthSession();

  if (status === "hydrating") {
    return <LoadingScreen label="Restoring your mobile session..." />;
  }

  if (status === "authenticated") {
    return <Redirect href="/(app)/home" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
