import { Redirect, Stack, router } from "expo-router";

import { LoadingScreen } from "../../src/app/ui/loading-screen";
import { useAuthSession } from "../../src/features/auth/auth-session";
import { AccessGateErrorScreen } from "../../src/features/auth/screens/access-gate-error-screen";
import { useProfileAccessGate } from "../../src/features/profile/data/use-profile-access-gate";

export default function OnboardingLayout() {
  const { clearSession } = useAuthSession();
  const gate = useProfileAccessGate();

  if (gate.status === "hydrating" || gate.status === "loading_profile") {
    return <LoadingScreen label="Checking your onboarding state..." />;
  }

  if (gate.status === "anonymous") {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (gate.status === "error") {
    return (
      <AccessGateErrorScreen
        message={gate.error.message}
        onRetry={() => {
          void gate.profileQuery.refetch();
        }}
        onClearSession={async () => {
          await clearSession();
          router.replace("/(auth)/sign-in");
        }}
      />
    );
  }

  if (gate.status === "ready") {
    return <Redirect href="/(app)/home" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
