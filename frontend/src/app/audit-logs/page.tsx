import { FileSearch } from "lucide-react";
import { ModuleFoundationView } from "@/features/modules/module-foundation-view";

export default function AuditLogsPage() {
  return (
    <ModuleFoundationView
      title="Audit Logs"
      subtitle="Accountability and operational audit trail for all security-sensitive actions."
      phaseBadge="Table: audit_logs (Migrated)"
      icon={FileSearch}
      schemaDescriptor={{
        tableName: "audit_logs",
        entityName: "AuditLog",
        primaryKey: "id (UUIDv4)",
        foreignKeys: ["actor_user_id -> users.id (ON DELETE SET NULL)"],
        indexedColumns: [
          "actor_user_id",
          "action",
          "entity_type",
          "entity_id",
          "(entity_type, entity_id)",
          "(action, created_at)",
        ],
        purpose:
          "Records an append-focused audit trail capturing who performed an action, against which entity, when, and with what structured context.",
      }}
      plannedCapabilities={[
        "Automatic audit recording on incident escalation, status transitions, and asset status changes",
        "Filtering by actor_user_id, action category, target entity_type, and time range",
        "Structured JSONB diff/context recording without storing sensitive credentials",
        "Exportable compliance verification view for SOC leads and security auditors",
      ]}
      securityNotes={[
        "Deleting a User retains historical audit entries via ON DELETE SET NULL",
        "Composite index on (entity_type, entity_id) enables rapid entity history lookups",
        "Sanitized details_json policy prohibits logging tokens, passwords, or PII",
      ]}
    />
  );
}
