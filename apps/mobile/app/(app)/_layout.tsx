import Feather from "@expo/vector-icons/Feather";
import { Redirect, Tabs } from "expo-router";

import { theme } from "../../src/app/theme";
import { LoadingScreen } from "../../src/app/ui/loading-screen";
import { useAuthSession } from "../../src/features/auth/auth-session";

export default function AppLayout() {
  const { status } = useAuthSession();

  if (status === "hydrating") {
    return <LoadingScreen label="Preparing your app shell..." />;
  }

  if (status !== "authenticated") {
    return <Redirect href="/(auth)/sign-in" />;
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
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Feather color={color} name="home" size={size} />
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
    </Tabs>
  );
}
