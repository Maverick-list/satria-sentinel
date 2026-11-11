/**
 * Phase 2 Operational TypeScript Contracts matching SATRIA SENTINEL FastAPI Backend.
 */

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: "admin" | "security_analyst" | "viewer" | string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_at: string;
  user: AuthUser;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface AssetItem {
  id: string;
  asset_tag: string;
  name: string;
  hostname: string | null;
  ip_address: string | null;
  asset_type: string;
  environment: string;
  criticality: string;
  status: string;
  operating_system: string | null;
  owner_id: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DetectionFindingReason {
  rule_id: string;
  rule_name: string;
  rule_version: string;
  severity: string;
  confidence: number;
  mitre_tactic: string;
  mitre_technique: string;
  reason: string;
  recommended_action: string;
  playbook_code?: string;
  matched_at: string;
}

export interface RiskFactorItem {
  factor: string;
  weight_max: number;
  points: number;
  detail: string;
}

export interface RiskBreakdown {
  risk_score?: number;
  risk_level?: string;
  formula?: string;
  factors?: RiskFactorItem[];
  explanation?: string;
}

export interface SecurityEventItem {
  id: string;
  asset_id: string | null;
  event_type: string;
  source: string;
  severity: string;
  status: string;
  title: string;
  description: string | null;
  source_ip: string | null;
  destination_ip: string | null;
  mitre_tactic: string | null;
  mitre_technique: string | null;
  raw_payload: Record<string, unknown>;
  event_fingerprint: string | null;
  is_synthetic: boolean;
  detection_reasons: DetectionFindingReason[];
  correlation_group_id: string | null;
  risk_score: number;
  risk_level: string;
  risk_breakdown: RiskBreakdown;
  occurred_at: string;
  created_at: string;
  updated_at: string;
}

export interface LogImportSummary {
  source_format: string;
  total_received: number;
  imported_count: number;
  duplicates_skipped: number;
  failed_count: number;
  detections_triggered: number;
  imported_event_ids: string[];
  errors: Array<{ row_number: number; reason: string }>;
}

export interface CorrelationCluster {
  correlation_group_id: string;
  events_count: number;
  first_seen_at: string;
  last_seen_at: string;
  span_minutes: number;
  source_ips: string[];
  asset_ids: string[];
  asset_tags: string[];
  event_progression: string[];
  mitre_tactics: string[];
  mitre_techniques: string[];
  highest_severity: string;
  risk_score: number;
  risk_level: string;
  risk_breakdown: RiskBreakdown;
  recommended_playbook_code: string;
  criteria_matched: string[];
  correlation_explanation: string;
  events: Array<{
    id: string;
    title: string;
    event_type: string;
    severity: string;
    source_ip: string | null;
    destination_ip: string | null;
    asset_id: string | null;
    occurred_at: string;
    risk_score: number;
    risk_level: string;
  }>;
}

export interface DetectionRuleItem {
  rule_id: string;
  rule_name: string;
  version: string;
  description: string;
  detection_condition: string;
  severity: string;
  confidence: number;
  mitre_tactic: string;
  mitre_technique: string;
  recommended_action: string;
  playbook_code: string;
}

export interface AssetRiskOverviewItem {
  id: string;
  asset_tag: string;
  name: string;
  hostname: string | null;
  ip_address: string | null;
  environment: string;
  criticality: string;
  status: string;
  event_count: number;
  detections_count: number;
  peak_risk_score: number;
  risk_level: string;
}

export interface RiskSummaryResponse {
  total_assets: number;
  critical_assets_count?: number;
  total_events: number;
  synthetic_events_count?: number;
  non_synthetic_events_count?: number;
  high_risk_findings_count?: number;
  total_incidents: number;
  open_incidents: number;
  average_event_risk_score: number;
  highest_event_risk_score: number;
  event_risk_distribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  event_severity_distribution?: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  top_risk_events: Array<{
    id: string;
    title: string;
    event_type: string;
    severity: string;
    is_synthetic?: boolean;
    asset_tag?: string | null;
    risk_score: number;
    risk_level: string;
    risk_breakdown: RiskBreakdown;
    occurred_at: string;
  }>;
  recent_detections?: Array<{
    id: string;
    title: string;
    event_type: string;
    source: string;
    severity: string;
    risk_score: number;
    risk_level: string;
    is_synthetic: boolean;
    asset_id: string | null;
    asset_tag: string | null;
    source_ip: string | null;
    detection_reasons: DetectionFindingReason[];
    occurred_at: string;
  }>;
  recent_incidents?: Array<{
    id: string;
    incident_number: string;
    title: string;
    severity: string;
    status: string;
    risk_score: number;
    risk_level: string;
    assigned_to_id: string | null;
    detected_at: string;
    updated_at: string;
  }>;
  asset_risk_overview?: AssetRiskOverviewItem[];
  detection_trend?: Array<{
    bucket: string;
    events: number;
    detections: number;
  }>;
}

export interface IncidentTimelineEntry {
  id: string;
  timestamp: string;
  entry_type: string;
  actor_username: string;
  title: string;
  notes?: string | null;
}

export interface LinkedIncidentEvent {
  id: string;
  security_event_id: string;
  correlation_role: string;
  analyst_notes: string | null;
  linked_at: string;
  event_title: string | null;
  event_type: string | null;
  event_severity: string | null;
  source_ip: string | null;
}

export interface IncidentItem {
  id: string;
  incident_number: string;
  title: string;
  summary: string | null;
  severity: string;
  status: string;
  risk_score: number;
  risk_level: string;
  risk_breakdown: RiskBreakdown;
  correlation_explanation: string | null;
  timeline_json: IncidentTimelineEntry[];
  assigned_to_id: string | null;
  playbook_id: string | null;
  detected_at: string;
  resolved_at: string | null;
  root_cause_notes: string | null;
  linked_events: LinkedIncidentEvent[];
  created_at: string;
  updated_at: string;
}

export interface PlaybookStep {
  step_number: number;
  phase: string;
  title: string;
  instruction: string;
  verification: string;
}

export interface PlaybookItem {
  id: string;
  code: string;
  name: string;
  category: string;
  target_severity: string;
  description: string | null;
  steps_json: PlaybookStep[];
  is_active: boolean;
  version: string;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLogItem {
  id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  details_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
