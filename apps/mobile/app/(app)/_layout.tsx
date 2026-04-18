import Feather from "@expo/vector-icons/Feather";
import { Redirect, Tabs, router } from "expo-router";

import { theme } from "../../src/app/theme";
import { LoadingScreen } from "../../src/app/ui/loading-screen";
import { useAuthSession } from "../../src/features/auth/auth-session";
import { AccessGateErrorScreen } from "../../src/features/auth/screens/access-gate-error-screen";
import { useProfileAccessGate } from "../../src/features/profile/data/use-profile-access-gate";

export default function AppLayout() {
  const { clearSession } = useAuthSession();
  const gate = useProfileAccessGate();

  if (gate.status === "hydrating" || gate.status === "loading_profile") {
    return <LoadingScreen label="Preparing your app shell..." />;
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

  if (gate.status === "needs_onboarding") {
    return <Redirect href="/(onboarding)/profile-setup" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          height: 72,
          paddingBottom: 10,
          paddingTop: 10
        }
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Places",
          tabBarIcon: ({ color, size }) => (
            <Feather color={color} name="map-pin" size={size} />
          )
        }}
      />
      <Tabs.Screen
        name="recommendations"
        options={{
          title: "Rules",
          tabBarIcon: ({ color, size }) => (
            <Feather color={color} name="star" size={size} />
          )
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Feather color={color} name="user" size={size} />
          )
        }}
      />
      <Tabs.Screen
        name="profiles/[userId]"
        options={{
          href: null
        }}
      />
    </Tabs>
  );
}
