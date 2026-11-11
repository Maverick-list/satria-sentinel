import { apiFetch } from "@/services/api-client";
import type { HealthCheckResponse } from "@/types/api";

/**
 * Fetch live backend and PostgreSQL health telemetry from GET /api/v1/health.
 */
export async function fetchBackendHealth(
  includeSchemaCheck = true
): Promise<HealthCheckResponse> {
  const query = includeSchemaCheck
    ? "?include_schema_check=true"
    : "?include_schema_check=false";
  return apiFetch<HealthCheckResponse>(`/health${query}`, {
    method: "GET",
  });
}
