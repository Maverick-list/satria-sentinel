"use client";

import { useEffect, useState } from "react";
import { Settings, ShieldCheck, Sliders, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/features/auth/auth-context";
import { SystemHealthPanel } from "@/features/health/system-health-panel";
import { getApiBaseUrl } from "@/services/api-client";
import {
  listDetectionRulesApi,
  listUsersApi,
} from "@/services/operational-service";
import type { AuthUser, DetectionRuleItem } from "@/types/operational";

export default function SettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [rules, setRules] = useState<DetectionRuleItem[]>([]);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const apiBaseUrl = getApiBaseUrl();

  useEffect(() => {
    if (authLoading || !user) return;
    void (async () => {
      try {
        const [rulesData, usersData] = await Promise.all([
          listDetectionRulesApi(),
          listUsersApi(),
        ]);
        setRules(rulesData.rules);
        setUsers(usersData.items);
      } catch {
        // Keep empty if unauthorized
      }
    })();
  }, [authLoading, user]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-slate-800/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/15 text-emerald-400">
            <Settings className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1
              data-testid="page-heading"
              className="text-2xl font-bold tracking-tight text-slate-100"
            >
              Platform Settings & Security Baseline
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              RBAC role matrix, deterministic detection rule catalog, and
              runtime environment configuration.
            </p>
          </div>
        </div>
        <Badge variant="default" className="self-start sm:self-center">
          Phase 2 Security Engine Active
        </Badge>
      </div>

      <SystemHealthPanel />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-400" />
              <CardTitle>RBAC Accounts & Access Control Matrix</CardTitle>
            </div>
            <CardDescription>
              Registered platform accounts (passwords hashed via RFC 7914
              scrypt).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/70 p-3"
              >
                <div>
                  <p className="font-semibold text-slate-100">
                    {u.full_name} (@{u.username})
                  </p>
                  <p className="font-mono text-[11px] text-slate-400">
                    {u.email}
                  </p>
                </div>
                <Badge variant="default" className="font-mono uppercase">
                  {u.role}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <CardTitle>Enforced Security Baseline</CardTitle>
            </div>
            <CardDescription>
              API Endpoint: <code className="font-mono text-emerald-400">{apiBaseUrl}</code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li className="flex items-start gap-2.5">
                <Sliders className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                <span>
                  <strong>Memory-Hard Password Hashing & HS256 JWT:</strong>{" "}
                  Credentials hashed with random-salted{" "}
                  <code className="font-mono text-emerald-300">scrypt</code>;
                  revocation enforced immediately on logout.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Sliders className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                <span>
                  <strong>Role-Based Access Control (RBAC):</strong>{" "}
                  <code className="font-mono text-emerald-300">admin</code>{" "}
                  (Asset & User CRUD),{" "}
                  <code className="font-mono text-emerald-300">
                    security_analyst
                  </code>{" "}
                  (Log Ingestion, Detection, Incident Lifecycle), and{" "}
                  <code className="font-mono text-emerald-300">viewer</code>{" "}
                  (Read-Only).
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Sliders className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                <span>
                  <strong>Safe Log Ingestion:</strong> Strictly bounded payload
                  size, schema validation, SHA-256 deduplication, and zero code
                  execution.
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Detection Rules Catalog */}
      <Card>
        <CardHeader>
          <CardTitle>
            Rule-Based Threat Detection Catalog ({rules.length} Active Rules)
          </CardTitle>
          <CardDescription>
            Transparent deterministic rules with MITRE ATT&CK mapping (no
            black-box AI/ML claims).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {rules.map((rule) => (
              <div
                key={rule.rule_id}
                className="rounded-lg border border-slate-800 bg-slate-950/70 p-3.5 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-emerald-400">
                    {rule.rule_id} (v{rule.version})
                  </span>
                  <Badge
                    variant={
                      rule.severity === "critical" ? "destructive" : "warning"
                    }
                  >
                    {rule.severity.toUpperCase()} • Conf{" "}
                    {Math.round(rule.confidence * 100)}%
                  </Badge>
                </div>
                <p className="font-semibold text-slate-100">{rule.rule_name}</p>
                <p className="text-slate-400">{rule.description}</p>
                <p className="font-mono text-[11px] text-emerald-300">
                  Condition: {rule.detection_condition}
                </p>
                <p className="text-[11px] text-slate-300">
                  MITRE: {rule.mitre_tactic} / {rule.mitre_technique}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
