import type { ApiErrorEnvelope } from "@/types/api";

const DEFAULT_API_BASE_URL = "http://localhost:8000/api/v1";
export const AUTH_TOKEN_STORAGE_KEY = "satria_sentinel_jwt_v2";
export const AUTH_USER_STORAGE_KEY = "satria_sentinel_user_v2";

export function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!configured) {
    return DEFAULT_API_BASE_URL;
  }
  return configured.replace(/\/+$/, "");
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export class ApiClientError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly requestId?: string;

  constructor(
    message: string,
    statusCode: number,
    code = "API_REQUEST_ERROR",
    requestId?: string
  ) {
    super(message);
    this.name = "ApiClientError";
    this.statusCode = statusCode;
    this.code = code;
    this.requestId = requestId;
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const normalizedPath = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${normalizedPath}`;

  const headers = new Headers(options.headers);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = getStoredToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    cache: "no-store",
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  if (!response.ok) {
    if (isJson) {
      const errBody = (await response.json()) as Partial<ApiErrorEnvelope>;
      if (errBody?.error) {
        throw new ApiClientError(
          errBody.error.message,
          response.status,
          errBody.error.code,
          errBody.error.request_id
        );
      }
    }
    throw new ApiClientError(
      `API request failed with HTTP ${response.status}`,
      response.status
    );
  }

  return (await response.json()) as T;
}
