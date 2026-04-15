export class ApiConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiConfigurationError";
  }
}

export class ApiAuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiAuthenticationError";
  }
}

export class ApiRuntimeNotReadyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiRuntimeNotReadyError";
  }
}

export class ApiResponseError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(status: number, payload: unknown, message?: string) {
    super(message ?? `API request failed with status ${status}.`);
    this.name = "ApiResponseError";
    this.status = status;
    this.payload = payload;
  }
}
