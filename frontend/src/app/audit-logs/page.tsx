"use client";

import { useCallback, useEffect, useState } from "react";
import { FileSearch, RefreshCw, Search } from "lucide-react";
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
import { listAuditLogsApi } from "@/services/operational-service";
import type { AuditLogItem } from "@/types/operational";

export default function AuditLogsPage() {
  const { user, isLoading: authLoading, showToast } = useAuth();
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
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
      const resp = await listAuditLogsApi({
        page,
        pageSize: 15,
        action: actionFilter || undefined,
        entityType: entityFilter || undefined,
      });
      setLogs(resp.items);
      setTotal(resp.total);
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
        <CardContent className="pt-5">
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
                    <th className="pb-2.5 pr-4">Action</th>
                    <th className="pb-2.5 pr-4">Entity Type / ID</th>
                    <th className="pb-2.5 pr-4">Client IP</th>
                    <th className="pb-2.5">Structured Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {logs.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-900/50">
                      <td className="py-2.5 pr-4 whitespace-nowrap text-slate-400">
                        {formatTimestamp(item.created_at)}
                      </td>
                      <td className="py-2.5 pr-4">
                        <Badge variant="default" className="font-mono">
                          {item.action}
                        </Badge>
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-slate-300">
                        {item.entity_type}{" "}
                        <span className="text-slate-500">
                          ({item.entity_id ?? "—"})
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-slate-400">
                        {item.ip_address ?? "local"}
                      </td>
                      <td className="py-2.5 font-mono text-[11px] text-slate-300">
                        {JSON.stringify(item.details_json)}
                      </td>
                    </tr>
                  ))}
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
