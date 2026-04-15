import { Redirect } from "expo-router";

import { LoadingScreen } from "../src/app/ui/loading-screen";
import { useAuthSession } from "../src/features/auth/auth-session";

export default function IndexScreen() {
  const { status } = useAuthSession();

  if (status === "hydrating") {
    return <LoadingScreen label="Restoring your mobile workspace..." />;
  }

  if (status === "authenticated") {
    return <Redirect href="/(app)/home" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}
