import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { queryClient } from "../../api/query-client";
import { AuthSessionProvider } from "../../features/auth/auth-session";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <SafeAreaProvider>
      <AuthSessionProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          {children}
        </QueryClientProvider>
      </AuthSessionProvider>
    </SafeAreaProvider>
  );
}
