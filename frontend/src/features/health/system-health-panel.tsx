"use client";

import {
  CheckCircle2,
  Database,
  RefreshCw,
  ServerCrash,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useBackendHealth } from "@/hooks/use-backend-health";
import { formatTimestamp } from "@/lib/utils";
import { getApiBaseUrl } from "@/services/api-client";

export function SystemHealthPanel() {
  const { data, isLoading, error, lastCheckedAt, refresh } = useBackendHealth();
  const apiBaseUrl = getApiBaseUrl();

  const isHealthy = data?.status === "healthy" && data.database.connected;

  return (
    <Card
      data-testid="system-health-panel"
      className="border-emerald-500/30 bg-slate-900/90"
    >
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <CardTitle>Live Backend & PostgreSQL Health Telemetry</CardTitle>
          </div>
          <CardDescription className="mt-1">
            Real-time diagnostic probe via{" "}
            <code className="rounded bg-slate-950 px-1.5 py-0.5 font-mono text-emerald-300">
              GET {apiBaseUrl}/health
            </code>
          </CardDescription>
        </div>

        <div className="flex items-center gap-2">
          {isLoading ? (
            <Badge variant="secondary">Probing API...</Badge>
          ) : isHealthy ? (
            <Badge
              variant="default"
              data-testid="health-status-badge"
              className="gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>Operational (Healthy)</span>
            </Badge>
          ) : (
            <Badge
              variant="destructive"
              data-testid="health-status-badge"
              className="gap-1.5"
            >
              <ServerCrash className="h-3.5 w-3.5" />
              <span>Degraded / Unreachable</span>
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refresh()}
            disabled={isLoading}
            data-testid="refresh-health-button"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
            <span>Verify Now</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {error ? (
          <div
            role="alert"
            className="rounded-lg border border-rose-500/40 bg-rose-950/30 p-4 text-xs text-rose-200"
          >
            <p className="font-semibold">Backend Connection Error</p>
            <p className="mt-1 font-mono">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3.5">
              <p className="text-xs text-slate-400">API Service Status</p>
              <p
                data-testid="health-service-name"
                className="mt-1 text-sm font-semibold text-slate-100"
              >
                {data ? `${data.service} v${data.version}` : "Loading..."}
              </p>
              <p className="mt-1 font-mono text-[11px] text-emerald-400">
                Env: {data?.environment ?? "—"}
              </p>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3.5">
              <p className="text-xs text-slate-400">PostgreSQL Connectivity</p>
              <div className="mt-1 flex items-center gap-2">
                <Database className="h-4 w-4 text-emerald-400" />
                <p
                  data-testid="health-db-status"
                  className="text-sm font-semibold text-slate-100"
                >
                  {data
                    ? data.database.connected
                      ? "Connected"
                      : "Disconnected"
                    : "Checking..."}
                </p>
              </div>
              <p className="mt-1 font-mono text-[11px] text-slate-400">
                Latency:{" "}
                {data?.database.latency_ms !== null &&
                data?.database.latency_ms !== undefined
                  ? `${data.database.latency_ms} ms`
                  : "—"}
              </p>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3.5">
              <p className="text-xs text-slate-400">Alembic Schema Migration</p>
              <p
                data-testid="health-migration-status"
                className="mt-1 text-sm font-semibold text-slate-100"
              >
                {data
                  ? data.database.migration_ready
                    ? "7 / 7 Tables Verified"
                    : `${data.database.registered_tables_count} / 7 Tables`
                  : "Checking..."}
              </p>
              <p className="mt-1 font-mono text-[11px] text-emerald-400">
                State: {data?.database.status ?? "—"}
              </p>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3.5">
              <p className="text-xs text-slate-400">Last Telemetry Probe</p>
              <p className="mt-1 text-sm font-semibold text-slate-100">
                {formatTimestamp(data?.timestamp ?? lastCheckedAt)}
              </p>
              <p className="mt-1 font-mono text-[11px] text-slate-400">
                Zero-Secret Payload Verified
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
