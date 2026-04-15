import type { ZodType } from "zod";

import { env } from "../config/env";
import {
  ApiAuthenticationError,
  ApiConfigurationError,
  ApiResponseError
} from "./errors";

interface ApiClientOptions {
  getAccessToken: () => Promise<string | null>;
}

interface RequestOptions<T> {
  path: string;
  schema: ZodType<T>;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  requiresAuth?: boolean;
}

export class ApiClient {
  private readonly getAccessToken: () => Promise<string | null>;

  constructor(options: ApiClientOptions) {
    this.getAccessToken = options.getAccessToken;
  }

  isConfigured(): boolean {
    return Boolean(env.apiBaseUrl);
  }

  async request<T>({
    path,
    schema,
    method = "GET",
    body,
    requiresAuth = false
  }: RequestOptions<T>): Promise<T> {
    if (!env.apiBaseUrl) {
      throw new ApiConfigurationError(
        "EXPO_PUBLIC_API_BASE_URL is not configured for apps/mobile."
      );
    }

    const token = await this.getAccessToken();

    if (requiresAuth && !token) {
      throw new ApiAuthenticationError(
        "A mobile session is required for this request."
      );
    }

    const headers = new Headers({
      Accept: "application/json"
    });

    if (body !== undefined) {
      headers.set("Content-Type", "application/json");
    }

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${env.apiBaseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });

    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;

    if (!response.ok) {
      throw new ApiResponseError(response.status, payload);
    }

    return schema.parse(payload);
  }
}
