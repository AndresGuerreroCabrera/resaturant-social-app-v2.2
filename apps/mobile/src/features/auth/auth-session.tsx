import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";

import {
  clearStoredApiSession,
  loadStoredApiSession,
  persistStoredApiSession
} from "./auth-storage";
import type { StoredApiSession } from "./types";

type AuthStatus = "hydrating" | "anonymous" | "authenticated";

interface AuthSessionContextValue {
  status: AuthStatus;
  session: StoredApiSession | null;
  saveSession: (session: StoredApiSession) => Promise<void>;
  clearSession: () => Promise<void>;
}

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

interface AuthSessionProviderProps {
  children: ReactNode;
}

export function AuthSessionProvider({ children }: AuthSessionProviderProps) {
  const [status, setStatus] = useState<AuthStatus>("hydrating");
  const [session, setSession] = useState<StoredApiSession | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function hydrate() {
      const storedSession = await loadStoredApiSession();

      if (!isMounted) {
        return;
      }

      setSession(storedSession);
      setStatus(storedSession ? "authenticated" : "anonymous");
    }

    hydrate().catch(() => {
      if (!isMounted) {
        return;
      }

      setSession(null);
      setStatus("anonymous");
    });

    return () => {
      isMounted = false;
    };
  }, []);

  async function saveSession(nextSession: StoredApiSession) {
    await persistStoredApiSession(nextSession);
    setSession(nextSession);
    setStatus("authenticated");
  }

  async function clearSession() {
    await clearStoredApiSession();
    setSession(null);
    setStatus("anonymous");
  }

  return (
    <AuthSessionContext.Provider
      value={{
        status,
        session,
        saveSession,
        clearSession
      }}
    >
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useAuthSession() {
  const context = useContext(AuthSessionContext);

  if (!context) {
    throw new Error("useAuthSession must be used inside AuthSessionProvider.");
  }

  return context;
}
