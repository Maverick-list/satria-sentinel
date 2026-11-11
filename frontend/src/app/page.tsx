import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  BookOpenCheck,
  Database,
  FileSearch,
  LayoutDashboard,
  Server,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SchemaReadinessChart } from "@/features/health/schema-readiness-chart";
import { SystemHealthPanel } from "@/features/health/system-health-panel";

const CORE_MODULES = [
  {
    name: "Assets Inventory",
    href: "/assets",
    table: "assets",
    icon: Server,
    summary:
      "Tracks servers, containers, network devices, cloud workloads, criticality tiers, and owners.",
  },
  {
    name: "Security Events",
    href: "/security-events",
    table: "security_events",
    icon: Activity,
    summary:
      "Stores defensive telemetry, MITRE ATT&CK tactic/technique tags, and triage statuses.",
  },
  {
    name: "Incident Management",
    href: "/incidents",
    table: "incidents + incident_events",
    icon: ShieldAlert,
    summary:
      "Correlates security events into prioritized incidents with risk scores and root-cause notes.",
  },
  {
    name: "Response Playbooks",
    href: "/playbooks",
    table: "response_playbooks",
    icon: BookOpenCheck,
    summary:
      "Defines repeatable defensive containment, eradication, and recovery step checklists.",
  },
  {
    name: "Audit Trail",
    href: "/audit-logs",
    table: "audit_logs",
    icon: FileSearch,
    summary:
      "Records actor accountability, state transitions, and operational actions.",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-slate-800/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/15 text-emerald-400">
            <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1
              data-testid="page-heading"
              className="text-2xl font-bold tracking-tight text-slate-100"
            >
              Command Center Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              SATRIA SENTINEL (Security Asset & Threat Response Intelligence
              Assistant) — Phase 1 Foundation Status
            </p>
          </div>
        </div>
        <Badge variant="default" className="self-start sm:self-center">
          Phase 1 Foundation Active
        </Badge>
      </div>

      {/* Live API & PostgreSQL Health Probe */}
      <SystemHealthPanel />

      {/* Foundation Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Core Domain Entities</CardDescription>
            <CardTitle className="text-2xl text-emerald-400">
              7 Tables
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-400">
            Users, Assets, SecurityEvents, Incidents, IncidentEvents,
            ResponsePlaybooks, AuditLogs
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>API Version Prefix</CardDescription>
            <CardTitle className="font-mono text-2xl text-slate-100">
              /api/v1
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-400">
            FastAPI + Pydantic v2 strict validation + centralized exception
            handling
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Database Engine</CardDescription>
            <CardTitle className="text-2xl text-slate-100">
              PostgreSQL
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-400">
            SQLAlchemy 2.x ORM with UUIDv4 primary keys, JSONB metadata &
            Alembic migrations
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Security Baseline</CardDescription>
            <CardTitle className="flex items-center gap-1.5 text-2xl text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
              <span>Enforced</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-400">
            Env-driven CORS, sanitized error responses, no hardcoded secrets,
            defensive headers
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SchemaReadinessChart />
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-emerald-400" />
              <CardTitle>Domain Module Readiness</CardTitle>
            </div>
            <CardDescription>
              Navigate to inspect each Phase 1 module foundation and schema
              contract.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {CORE_MODULES.map((mod) => {
              const Icon = mod.icon;
              return (
                <Link
                  key={mod.href}
                  href={mod.href}
                  className="group block rounded-lg border border-slate-800 bg-slate-950/60 p-3 transition-colors hover:border-emerald-500/40 hover:bg-slate-900"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-emerald-400" />
                      <span className="text-xs font-semibold text-slate-100 group-hover:text-emerald-300">
                        {mod.name}
                      </span>
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-emerald-400" />
                  </div>
                  <p className="mt-1 font-mono text-[10px] text-emerald-400/90">
                    Table: {mod.table}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                    {mod.summary}
                  </p>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
