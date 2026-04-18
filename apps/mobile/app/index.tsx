import { Redirect } from "expo-router";

import { LoadingScreen } from "../src/app/ui/loading-screen";
import { useAuthSession } from "../src/features/auth/auth-session";
import { AccessGateErrorScreen } from "../src/features/auth/screens/access-gate-error-screen";
import { useProfileAccessGate } from "../src/features/profile/data/use-profile-access-gate";

export default function IndexScreen() {
  const { clearSession } = useAuthSession();
  const gate = useProfileAccessGate();

  if (gate.status === "hydrating" || gate.status === "loading_profile") {
    return <LoadingScreen label="Restoring your mobile workspace..." />;
  }

  if (gate.status === "error") {
    return (
      <AccessGateErrorScreen
        message={gate.error.message}
        onRetry={() => {
          void gate.profileQuery.refetch();
        }}
        onClearSession={clearSession}
      />
    );
  }

  if (gate.status === "needs_onboarding") {
    return <Redirect href="/(onboarding)/profile-setup" />;
  }

  if (gate.status === "ready") {
    return <Redirect href="/(app)/home" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}
