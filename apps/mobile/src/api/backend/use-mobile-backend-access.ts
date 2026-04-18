import { createMobileBackendAccess } from "./create-mobile-backend-access";
import { useApiClient } from "../use-api-client";

export function useMobileBackendAccess() {
  const apiClient = useApiClient();

  return createMobileBackendAccess(apiClient);
}
