import { BookOpenCheck } from "lucide-react";
import { ModuleFoundationView } from "@/features/modules/module-foundation-view";

export default function PlaybooksPage() {
  return (
    <ModuleFoundationView
      title="Response Playbooks"
      subtitle="Standardized defensive response procedures for containment, eradication, and recovery."
      phaseBadge="Table: response_playbooks (Migrated)"
      icon={BookOpenCheck}
      schemaDescriptor={{
        tableName: "response_playbooks",
        entityName: "ResponsePlaybook",
        primaryKey: "id (UUIDv4)",
        foreignKeys: ["created_by_id -> users.id (ON DELETE SET NULL)"],
        indexedColumns: [
          "code (UNIQUE)",
          "name",
          "category",
          "target_severity",
          "is_active",
          "created_by_id",
        ],
        purpose:
          "Stores structured, versioned defensive response playbooks with ordered step checklists in JSONB format.",
      }}
      plannedCapabilities={[
        "Standardized response templates for unauthorized access, anomalous processes, and data exfiltration indicators",
        "Ordered JSONB step checklists with verification criteria and role ownership",
        "Playbook versioning and active/inactive lifecycle state management",
        "Direct association with active Incidents for guided analyst execution",
      ]}
      securityNotes={[
        "Strictly defensive containment and remediation guidance — no offensive actions",
        "Unique playbook code constraint (e.g., PB-IR-001) ensures unambiguous operator reference",
        "Author attribution preserved via foreign key to users.id",
      ]}
    />
  );
}
