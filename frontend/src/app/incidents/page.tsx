import { ShieldAlert } from "lucide-react";
import { ModuleFoundationView } from "@/features/modules/module-foundation-view";

export default function IncidentsPage() {
  return (
    <ModuleFoundationView
      title="Incidents"
      subtitle="Correlated security incident cases, risk scoring, lifecycle tracking, and event linkage."
      phaseBadge="Tables: incidents & incident_events"
      icon={ShieldAlert}
      schemaDescriptor={{
        tableName: "incidents / incident_events",
        entityName: "Incident & IncidentEvent",
        primaryKey: "id (UUIDv4)",
        foreignKeys: [
          "assigned_to_id -> users.id (ON DELETE SET NULL)",
          "playbook_id -> response_playbooks.id (ON DELETE SET NULL)",
          "incident_events.incident_id -> incidents.id (ON DELETE CASCADE)",
          "incident_events.security_event_id -> security_events.id (ON DELETE CASCADE)",
        ],
        indexedColumns: [
          "incident_number (UNIQUE)",
          "title",
          "severity",
          "status",
          "assigned_to_id",
          "playbook_id",
          "detected_at",
          "(status, severity)",
          "uq_incident_events_incident_security_event",
        ],
        purpose:
          "Manages end-to-end incident lifecycle (open -> investigating -> containment -> eradication -> recovered -> closed) and links correlated security events.",
      }}
      plannedCapabilities={[
        "Case creation and escalation from one or multiple correlated SecurityEvents",
        "Dynamic risk score calculation combining event severity and asset criticality",
        "Response playbook attachment and guided remediation tracking",
        "Post-incident root-cause documentation and resolution timeline tracking",
      ]}
      securityNotes={[
        "Unique composite constraint prevents duplicate linking of the same SecurityEvent to an Incident",
        "State changes are designed to emit structured entries into AuditLogs",
        "Cascading delete on incident_events keeps junction records clean without deleting underlying SecurityEvents",
      ]}
    />
  );
}
