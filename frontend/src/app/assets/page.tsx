import { Server } from "lucide-react";
import { ModuleFoundationView } from "@/features/modules/module-foundation-view";

export default function AssetsPage() {
  return (
    <ModuleFoundationView
      title="Assets Inventory"
      subtitle="Digital asset registration, criticality profiling, environment classification, and ownership mapping."
      phaseBadge="Table: assets (Migrated)"
      icon={Server}
      schemaDescriptor={{
        tableName: "assets",
        entityName: "Asset",
        primaryKey: "id (UUIDv4)",
        foreignKeys: ["owner_id -> users.id (ON DELETE SET NULL)"],
        indexedColumns: [
          "asset_tag (UNIQUE)",
          "name",
          "hostname",
          "ip_address",
          "asset_type",
          "environment",
          "criticality",
          "status",
          "owner_id",
          "(criticality, status)",
        ],
        purpose:
          "Stores infrastructure and application assets monitored by SATRIA SENTINEL, supporting risk-weighted incident prioritization.",
      }}
      plannedCapabilities={[
        "CRUD asset inventory endpoints with filterable criticality, status, and environment views",
        "Asset ownership assignment to SOC analysts or system custodians",
        "Extensible JSONB metadata attributes for OS, cloud region, and tags",
        "Automated blast-radius context during security event and incident triage",
      ]}
      securityNotes={[
        "Unique asset_tag constraint prevents duplicate asset registration",
        "Deleting a User account preserves asset records via ON DELETE SET NULL",
        "Strict Pydantic enumeration validation on criticality, asset_type, and status",
      ]}
    />
  );
}
