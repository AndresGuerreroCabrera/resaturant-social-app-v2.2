import { ApiClient } from "./http-client";
import { useAuthSession } from "../features/auth/auth-session";

export function useApiClient() {
  const { session } = useAuthSession();

  return new ApiClient({
    getAccessToken: async () => session?.accessToken ?? null
  });
}
