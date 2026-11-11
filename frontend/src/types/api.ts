/**
 * API contract types matching SATRIA SENTINEL FastAPI Backend (/api/v1).
 */

export type SystemHealthStatus = "healthy" | "degraded";
export type DatabaseConnectionState = "healthy" | "degraded" | "unreachable";

export interface DatabaseStatus {
  connected: boolean;
  latency_ms: number | null;
  migration_ready: boolean;
  registered_tables_count: number;
  status: DatabaseConnectionState;
}

export interface HealthCheckResponse {
  status: SystemHealthStatus;
  service: string;
  version: string;
  environment: string;
  timestamp: string;
  database: DatabaseStatus;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  request_id: string;
  timestamp: string;
  details?: Array<Record<string, unknown>>;
}

export interface ApiErrorEnvelope {
  error: ApiErrorDetail;
}
