import type { LucideIcon } from "lucide-react";
import { Database, Layers, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { SchemaEntityDescriptor } from "@/types/domain";

interface ModuleFoundationViewProps {
  title: string;
  subtitle: string;
  phaseBadge: string;
  icon: LucideIcon;
  schemaDescriptor: SchemaEntityDescriptor;
  plannedCapabilities: string[];
  securityNotes: string[];
}

export function ModuleFoundationView({
  title,
  subtitle,
  phaseBadge,
  icon: Icon,
  schemaDescriptor,
  plannedCapabilities,
  securityNotes,
}: ModuleFoundationViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-slate-800/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/15 text-emerald-400">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1
              data-testid="page-heading"
              className="text-2xl font-bold tracking-tight text-slate-100"
            >
              {title}
            </h1>
            <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
          </div>
        </div>
        <Badge variant="default" className="self-start sm:self-center">
          {phaseBadge}
        </Badge>
      </div>

      <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/15 p-4 text-xs leading-relaxed text-slate-300">
        <span className="font-semibold text-emerald-300">
          Phase 1 Transparency Notice:
        </span>{" "}
        This module’s PostgreSQL table (<code className="font-mono text-emerald-300">{schemaDescriptor.tableName}</code>),
        SQLAlchemy 2.0 ORM model (<code className="font-mono text-emerald-300">{schemaDescriptor.entityName}</code>),
        foreign keys, and indexes are provisioned and verified via Alembic. In
        accordance with Phase 1 engineering rules, no fabricated telemetry or
        simulated security charts are displayed here prior to Phase 2 service
        ingestion.
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-emerald-400" />
              <CardTitle>Database Entity Specification</CardTitle>
            </div>
            <CardDescription>{schemaDescriptor.purpose}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <div>
                <p className="text-slate-400">PostgreSQL Table</p>
                <p className="mt-1 font-mono font-semibold text-emerald-400">
                  {schemaDescriptor.tableName}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Primary Key</p>
                <p className="mt-1 font-mono text-slate-200">
                  {schemaDescriptor.primaryKey}
                </p>
              </div>
            </div>

            <div>
              <p className="font-semibold text-slate-300">
                Relational Foreign Keys
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {schemaDescriptor.foreignKeys.map((fk) => (
                  <span
                    key={fk}
                    className="rounded border border-slate-800 bg-slate-950 px-2.5 py-1 font-mono text-[11px] text-slate-300"
                  >
                    {fk}
                  </span>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <p className="font-semibold text-slate-300">
                Provisioned Database Indexes
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {schemaDescriptor.indexedColumns.map((idx) => (
                  <Badge key={idx} variant="secondary" className="font-mono">
                    {idx}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-400" />
                <CardTitle>Module Roadmap (Phase 2 Integration)</CardTitle>
              </div>
              <CardDescription>
                Capabilities wired to this foundational schema in the next
                development phase.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5 text-xs text-slate-300">
                {plannedCapabilities.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-emerald-400" />
                <CardTitle>Defensive Security Controls</CardTitle>
              </div>
              <CardDescription>
                Guardrails enforced at the schema and API boundary.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-xs text-slate-300">
                {securityNotes.map((note) => (
                  <li key={note} className="flex items-start gap-2.5">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
