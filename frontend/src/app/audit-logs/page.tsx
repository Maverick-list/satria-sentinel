"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileSearch, RefreshCw, Search, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/features/auth/auth-context";
import { formatTimestamp } from "@/lib/utils";
import { listAuditLogsApi, listUsersApi } from "@/services/operational-service";
import type { AuditLogItem, AuthUser } from "@/types/operational";

const QUICK_ACTION_FILTERS = [
  { label: "All Actions", value: "" },
  { label: "Logins", value: "auth.login_success" },
  { label: "Assets", value: "asset.created" },
  { label: "Log Imports", value: "events.imported" },
  { label: "Synthetic Sim", value: "events.synthetic_generated" },
  { label: "Incidents Created", value: "incident.created" },
  { label: "Incidents Resolved", value: "incident.resolved" },
];

export default function AuditLogsPage() {
  const { user, isLoading: authLoading, showToast } = useAuth();
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [resp, usersResp] = await Promise.all([
        listAuditLogsApi({
          page,
          pageSize: 15,
          action: actionFilter || undefined,
          entityType: entityFilter || undefined,
        }),
        listUsersApi(),
      ]);
      setLogs(resp.items);
      setTotal(resp.total);
      setUsers(usersResp.items);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to load audit trail",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  }, [user, page, actionFilter, entityFilter, showToast]);

  useEffect(() => {
    if (!authLoading) {
      void loadLogs();
    }
  }, [authLoading, loadLogs]);

  const usersById = useMemo(() => {
    const map: Record<string, AuthUser> = {};
    for (const u of users) {
      map[u.id] = u;
    }
    return map;
  }, [users]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-slate-800/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/15 text-emerald-400">
            <FileSearch className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1
              data-testid="page-heading"
              className="text-2xl font-bold tracking-tight text-slate-100"
            >
              Audit Logs
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Accountability and operational audit trail for authentication,
              asset modifications, log ingestion, and incident lifecycle actions.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadLogs()}
          disabled={isLoading}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
          />
          <span>Refresh Trail</span>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-5 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Filter by action (e.g., auth.login_success, incident.created, asset.created)..."
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
                data-testid="audit-action-filter"
                className="w-full rounded-md border border-slate-700 bg-slate-950 pl-9 pr-3 py-2 text-xs text-slate-100"
              />
            </div>

            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by Entity Type"
              data-testid="audit-entity-filter"
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100"
            >
              <option value="">All Entity Types</option>
              <option value="User">User</option>
              <option value="Asset">Asset</option>
              <option value="SecurityEventBatch">SecurityEventBatch</option>
              <option value="SecurityEvent">SecurityEvent</option>
              <option value="Incident">Incident</option>
              <option value="DetectionEngine">DetectionEngine</option>
              <option value="CorrelationEngine">CorrelationEngine</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-slate-400 mr-1">Quick Filter:</span>
            {QUICK_ACTION_FILTERS.map((qf) => (
              <button
                key={qf.label}
                type="button"
                onClick={() => {
                  setActionFilter(qf.value);
                  setPage(1);
                }}
                className={`rounded border px-2 py-0.5 font-mono transition-colors ${
                  actionFilter === qf.value
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                    : "border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200"
                }`}
              >
                {qf.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recorded Audit Trail Entries ({total})</CardTitle>
          <CardDescription>
            Sanitized operational telemetry — passwords, tokens, and secrets are
            automatically stripped before persistence.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-8 text-center text-xs text-slate-400">
              Loading audit trail...
            </p>
          ) : logs.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">
              No audit log entries match the current filter.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table
                data-testid="audit-logs-table"
                className="w-full text-left text-xs"
              >
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-2.5 pr-4">Timestamp</th>
                    <th className="pb-2.5 pr-4">Actor</th>
                    <th className="pb-2.5 pr-4">Action</th>
                    <th className="pb-2.5 pr-4">Resource (Entity / ID)</th>
                    <th className="pb-2.5">Structured Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {logs.map((item) => {
                    const actor = item.actor_user_id
                      ? usersById[item.actor_user_id]
                      : null;
                    const detailUsername =
                      typeof item.details_json?.username === "string"
                        ? item.details_json.username
                        : null;
                    return (
                      <tr key={item.id} className="hover:bg-slate-900/50">
                        <td className="py-2.5 pr-4 whitespace-nowrap font-mono text-[11px] text-slate-400">
                          {formatTimestamp(item.created_at)}
                        </td>
                        <td className="py-2.5 pr-4 whitespace-nowrap">
                          {actor ? (
                            <div className="flex items-center gap-1.5">
                              <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                              <div>
                                <span className="font-mono font-semibold text-slate-200">
                                  @{actor.username}
                                </span>
                                <span className="ml-1.5 font-mono text-[10px] uppercase text-emerald-400">
                                  ({actor.role})
                                </span>
                              </div>
                            </div>
                          ) : detailUsername ? (
                            <span className="font-mono text-amber-300">
                              @{detailUsername} (unverified)
                            </span>
                          ) : (
                            <span className="font-mono text-slate-500">
                              system
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 pr-4">
                          <Badge variant="default" className="font-mono">
                            {item.action}
                          </Badge>
                        </td>
                        <td className="py-2.5 pr-4 font-mono text-slate-300">
                          <span className="font-semibold text-emerald-300">
                            {item.entity_type}
                          </span>{" "}
                          <span className="text-[11px] text-slate-500">
                            ({item.entity_id ?? "—"})
                          </span>
                        </td>
                        <td className="py-2.5 font-mono text-[11px] text-slate-300">
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(item.details_json || {}).map(
                              ([k, v]) => (
                                <span
                                  key={k}
                                  className="rounded border border-slate-800 bg-slate-950/90 px-2 py-0.5"
                                >
                                  <span className="text-slate-500">{k}:</span>{" "}
                                  <span className="text-slate-200">
                                    {typeof v === "object"
                                      ? JSON.stringify(v)
                                      : String(v)}
                                  </span>
                                </span>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3 text-xs text-slate-400">
            <span>
              Page {page} • Total {total} audit record(s)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * 15 >= total}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
