import { Activity } from "lucide-react";
import { ModuleFoundationView } from "@/features/modules/module-foundation-view";

export default function SecurityEventsPage() {
  return (
    <ModuleFoundationView
      title="Security Events"
      subtitle="Defensive telemetry ingestion, MITRE ATT&CK classification, and analyst triage queue."
      phaseBadge="Table: security_events (Migrated)"
      icon={Activity}
      schemaDescriptor={{
        tableName: "security_events",
        entityName: "SecurityEvent",
        primaryKey: "id (UUIDv4)",
        foreignKeys: ["asset_id -> assets.id (ON DELETE SET NULL)"],
        indexedColumns: [
          "asset_id",
          "event_type",
          "source",
          "severity",
          "status",
          "source_ip",
          "destination_ip",
          "mitre_technique",
          "occurred_at",
          "(severity, occurred_at)",
          "(asset_id, occurred_at)",
        ],
        purpose:
          "Captures normalized security telemetry and synthetic defensive logs linked to monitored assets and MITRE ATT&CK techniques.",
      }}
      plannedCapabilities={[
        "Synthetic defensive log ingestion pipeline for safe hackathon demonstration",
        "Multi-attribute filtering by severity, MITRE technique, source IP, and time window",
        "Analyst triage workflow (new -> triaged -> linked / false_positive)",
        "One-click correlation of related security events into an escalated Incident",
      ]}
      securityNotes={[
        "Uses synthetic security telemetry only — no offensive scanning or live malware payloads",
        "Composite indexes on (severity, occurred_at) and (asset_id, occurred_at) prevent slow table scans",
        "Raw event payloads are isolated inside a structured JSONB column",
      ]}
    />
  );
}
