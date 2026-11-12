import { apiFetch } from "@/services/api-client";
import type {
  AssetItem,
  AuditLogItem,
  AuthUser,
  CorrelationCluster,
  DetectionRuleItem,
  IncidentItem,
  LogImportSummary,
  PaginatedResponse,
  PlaybookItem,
  RiskSummaryResponse,
  SecurityEventItem,
  TokenResponse,
} from "@/types/operational";

// --- Auth & Users ---
export async function loginApi(
  username: string,
  password: string
): Promise<TokenResponse> {
  return apiFetch<TokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function logoutApi(): Promise<{ status: string; message: string }> {
  return apiFetch<{ status: string; message: string }>("/auth/logout", {
    method: "POST",
  });
}

export async function getMeApi(): Promise<AuthUser> {
  return apiFetch<AuthUser>("/auth/me");
}

export async function listUsersApi(): Promise<PaginatedResponse<AuthUser>> {
  return apiFetch<PaginatedResponse<AuthUser>>("/users?page=1&page_size=50");
}

// --- Assets ---
export async function listAssetsApi(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  criticality?: string;
  status?: string;
  environment?: string;
}): Promise<PaginatedResponse<AssetItem>> {
  const sp = new URLSearchParams();
  sp.set("page", String(params.page ?? 1));
  sp.set("page_size", String(params.pageSize ?? 20));
  if (params.search) sp.set("search", params.search);
  if (params.criticality) sp.set("criticality", params.criticality);
  if (params.status) sp.set("status", params.status);
  if (params.environment) sp.set("environment", params.environment);
  return apiFetch<PaginatedResponse<AssetItem>>(`/assets?${sp.toString()}`);
}

export async function createAssetApi(
  payload: Record<string, unknown>
): Promise<AssetItem> {
  return apiFetch<AssetItem>("/assets", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAssetApi(
  assetId: string,
  payload: Record<string, unknown>
): Promise<AssetItem> {
  return apiFetch<AssetItem>(`/assets/${assetId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteAssetApi(assetId: string): Promise<void> {
  await apiFetch<void>(`/assets/${assetId}`, {
    method: "DELETE",
  });
}

// --- Security Events & Log Ingestion ---
export async function listSecurityEventsApi(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  severity?: string;
  status?: string;
  eventType?: string;
  assetId?: string;
}): Promise<PaginatedResponse<SecurityEventItem>> {
  const sp = new URLSearchParams();
  sp.set("page", String(params.page ?? 1));
  sp.set("page_size", String(params.pageSize ?? 20));
  if (params.search) sp.set("search", params.search);
  if (params.severity) sp.set("severity", params.severity);
  if (params.status) sp.set("status", params.status);
  if (params.eventType) sp.set("event_type", params.eventType);
  if (params.assetId) sp.set("asset_id", params.assetId);
  return apiFetch<PaginatedResponse<SecurityEventItem>>(
    `/security-events?${sp.toString()}`
  );
}

export async function updateSecurityEventStatusApi(
  eventId: string,
  status: string
): Promise<SecurityEventItem> {
  return apiFetch<SecurityEventItem>(`/security-events/${eventId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function generateSyntheticTelemetryApi(
  scenario = "all_scenarios"
): Promise<{
  scenario: string;
  simulation_run_tag: string;
  synthetic_marker: string;
  disclaimer: string;
  ingestion_summary: LogImportSummary;
  correlation_summary: {
    clusters_count: number;
    clusters: CorrelationCluster[];
  };
}> {
  return apiFetch("/log-ingestion/generate-synthetic", {
    method: "POST",
    body: JSON.stringify({ scenario, auto_correlate: true }),
  });
}

export async function importSecurityLogsApi(payload: {
  format: "csv" | "json";
  content: string;
  filename?: string;
}): Promise<LogImportSummary> {
  return apiFetch<LogImportSummary>("/log-ingestion/import", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// --- Detections, Correlations & Risk ---
export async function listDetectionRulesApi(): Promise<{
  engine_type: string;
  rules_count: number;
  rules: DetectionRuleItem[];
}> {
  return apiFetch("/detections/rules");
}

export async function listDetectionFindingsApi(): Promise<{
  total_events_evaluated: number;
  flagged_events_count: number;
  findings: Array<{
    event_id: string;
    title: string;
    event_type: string;
    severity: string;
    source_ip: string | null;
    asset_id: string | null;
    occurred_at: string;
    risk_score: number;
    risk_level: string;
    detection_reasons: Array<{
      rule_id: string;
      rule_name: string;
      rule_version: string;
      severity: string;
      confidence: number;
      mitre_tactic: string;
      mitre_technique: string;
      reason: string;
      recommended_action: string;
      playbook_code: string;
      matched_at: string;
    }>;
  }>;
}> {
  return apiFetch("/detections/findings");
}

export async function runDetectionScanApi(): Promise<{
  evaluated_events_count: number;
  flagged_events_count: number;
  total_findings_count: number;
}> {
  return apiFetch("/detections/run", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function getCorrelationsApi(
  windowMinutes = 60
): Promise<{
  window_minutes: number;
  total_events_analyzed: number;
  clusters_count: number;
  clusters: CorrelationCluster[];
}> {
  return apiFetch(`/correlations?window_minutes=${windowMinutes}`);
}

export async function runCorrelationsApi(
  windowMinutes = 60
): Promise<{
  window_minutes: number;
  total_events_analyzed: number;
  clusters_count: number;
  clusters: CorrelationCluster[];
}> {
  return apiFetch("/correlations/run", {
    method: "POST",
    body: JSON.stringify({ window_minutes: windowMinutes, min_cluster_size: 2 }),
  });
}

export async function getRiskSummaryApi(): Promise<RiskSummaryResponse> {
  return apiFetch<RiskSummaryResponse>("/risk-assessments/summary");
}

// --- Incidents ---
export async function listIncidentsApi(params: {
  page?: number;
  pageSize?: number;
  status?: string;
  severity?: string;
  search?: string;
}): Promise<PaginatedResponse<IncidentItem>> {
  const sp = new URLSearchParams();
  sp.set("page", String(params.page ?? 1));
  sp.set("page_size", String(params.pageSize ?? 20));
  if (params.status) sp.set("status", params.status);
  if (params.severity) sp.set("severity", params.severity);
  if (params.search) sp.set("search", params.search);
  return apiFetch<PaginatedResponse<IncidentItem>>(
    `/incidents?${sp.toString()}`
  );
}

export async function createIncidentApi(payload: {
  title: string;
  summary?: string;
  severity: string;
  security_event_ids?: string[];
  correlation_explanation?: string;
  playbook_id?: string;
}): Promise<IncidentItem> {
  return apiFetch<IncidentItem>("/incidents", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function changeIncidentStatusApi(
  incidentId: string,
  status: string,
  notes?: string
): Promise<IncidentItem> {
  return apiFetch<IncidentItem>(`/incidents/${incidentId}/status`, {
    method: "POST",
    body: JSON.stringify({ status, notes }),
  });
}

export async function addIncidentNoteApi(
  incidentId: string,
  note: string
): Promise<IncidentItem> {
  return apiFetch<IncidentItem>(`/incidents/${incidentId}/notes`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
}

export async function resolveIncidentApi(
  incidentId: string,
  rootCauseNotes: string,
  resolutionStatus: "recovered" | "closed" = "recovered"
): Promise<IncidentItem> {
  return apiFetch<IncidentItem>(`/incidents/${incidentId}/resolve`, {
    method: "POST",
    body: JSON.stringify({
      root_cause_notes: rootCauseNotes,
      resolution_status: resolutionStatus,
    }),
  });
}

export async function assignIncidentApi(
  incidentId: string,
  assignedToId: string | null,
  notes?: string
): Promise<IncidentItem> {
  return apiFetch<IncidentItem>(`/incidents/${incidentId}/assign`, {
    method: "POST",
    body: JSON.stringify({ assigned_to_id: assignedToId, notes }),
  });
}

export async function linkIncidentEventsApi(
  incidentId: string,
  securityEventIds: string[],
  correlationRole = "correlated_indicator",
  analystNotes?: string
): Promise<IncidentItem> {
  return apiFetch<IncidentItem>(`/incidents/${incidentId}/link-events`, {
    method: "POST",
    body: JSON.stringify({
      security_event_ids: securityEventIds,
      correlation_role: correlationRole,
      analyst_notes: analystNotes,
    }),
  });
}

// --- Playbooks & Audit Logs ---
export async function listPlaybooksApi(
  category?: string
): Promise<PlaybookItem[]> {
  const q = category ? `?category=${encodeURIComponent(category)}` : "";
  return apiFetch<PlaybookItem[]>(`/playbooks${q}`);
}

export async function recommendPlaybookApi(incidentType: string): Promise<{
  advisory_only: boolean;
  execution_mode: string;
  requested_type: string;
  recommended_playbook: PlaybookItem | null;
}> {
  return apiFetch(
    `/playbooks/recommend?incident_type=${encodeURIComponent(incidentType)}`
  );
}

export async function listAuditLogsApi(params: {
  page?: number;
  pageSize?: number;
  action?: string;
  entityType?: string;
}): Promise<PaginatedResponse<AuditLogItem>> {
  const sp = new URLSearchParams();
  sp.set("page", String(params.page ?? 1));
  sp.set("page_size", String(params.pageSize ?? 20));
  if (params.action) sp.set("action", params.action);
  if (params.entityType) sp.set("entity_type", params.entityType);
  return apiFetch<PaginatedResponse<AuditLogItem>>(
    `/audit-logs?${sp.toString()}`
  );
}
