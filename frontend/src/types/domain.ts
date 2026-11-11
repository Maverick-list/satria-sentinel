/**
 * Foundational domain entity types mirroring the SQLAlchemy Phase 1 schema.
 */

export type UserRole = "admin" | "soc_lead" | "soc_analyst" | "auditor";
export type AssetType =
  | "server"
  | "workstation"
  | "container"
  | "network_device"
  | "cloud_service"
  | "database";
export type AssetCriticality = "low" | "medium" | "high" | "critical";
export type AssetStatus =
  | "active"
  | "maintenance"
  | "isolated"
  | "decommissioned";
export type SeverityLevel =
  | "informational"
  | "low"
  | "medium"
  | "high"
  | "critical";
export type SecurityEventStatus =
  | "new"
  | "triaged"
  | "linked"
  | "false_positive"
  | "archived";
export type IncidentStatus =
  | "open"
  | "investigating"
  | "containment"
  | "eradication"
  | "recovered"
  | "closed";

export interface SchemaEntityDescriptor {
  tableName: string;
  entityName: string;
  primaryKey: string;
  foreignKeys: string[];
  indexedColumns: string[];
  purpose: string;
}
