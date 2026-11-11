"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  LayoutDashboard,
  RefreshCw,
  Server,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
import { SystemHealthPanel } from "@/features/health/system-health-panel";
import { formatTimestamp } from "@/lib/utils";
import {
  generateSyntheticTelemetryApi,
  getCorrelationsApi,
  getRiskSummaryApi,
} from "@/services/operational-service";
import type {
  CorrelationCluster,
  RiskSummaryResponse,
} from "@/types/operational";

export default function DashboardPage() {
  const { user, isLoading: authLoading, showToast } = useAuth();
  const [summary, setSummary] = useState<RiskSummaryResponse | null>(null);
  const [clusters, setClusters] = useState<CorrelationCluster[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [riskData, corrData] = await Promise.all([
        getRiskSummaryApi(),
        getCorrelationsApi(60),
      ]);
      setSummary(riskData);
      setClusters(corrData.clusters);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load operational telemetry."
      );
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      void loadDashboard();
    }
  }, [authLoading, loadDashboard]);

  async function handleGenerateDemoPack() {
    setIsGenerating(true);
    try {
      const res = await generateSyntheticTelemetryApi("all_scenarios");
      showToast(
        `Generated ${res.ingestion_summary.imported_count} synthetic events (${res.correlation_summary.clusters_count} correlated clusters).`,
        "success"
      );
      await loadDashboard();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to generate synthetic pack",
        "error"
      );
    } finally {
      setIsGenerating(false);
    }
  }

  const chartData = summary
    ? [
        {
          level: "Low (0-29)",
          count: summary.event_risk_distribution.low,
        },
        {
          level: "Medium (30-54)",
          count: summary.event_risk_distribution.medium,
        },
        {
          level: "High (55-79)",
          count: summary.event_risk_distribution.high,
        },
        {
          level: "Critical (80-100)",
          count: summary.event_risk_distribution.critical,
        },
      ]
    : [];

  const canWrite =
    user?.role === "admin" || user?.role === "security_analyst";

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
              SATRIA SENTINEL — Live Asset Posture, Threat Detections, Event
              Correlation & Risk Priority Overview
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canWrite ? (
            <Button
              size="sm"
              onClick={() => void handleGenerateDemoPack()}
              disabled={isGenerating}
              data-testid="dashboard-generate-synthetic-btn"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>
                {isGenerating
                  ? "Simulating..."
                  : "Simulate Synthetic Scenarios"}
              </span>
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadDashboard()}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Live API & PostgreSQL Health Probe */}
      <SystemHealthPanel />

      {error ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-4 text-xs text-rose-200">
          <p className="font-semibold">Operational Telemetry Error</p>
          <p className="mt-1 font-mono">{error}</p>
        </div>
      ) : null}

      {/* Live Operational Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              <span>Monitored Assets</span>
              <Server className="h-4 w-4 text-emerald-400" />
            </CardDescription>
            <CardTitle
              data-testid="metric-total-assets"
              className="text-2xl text-slate-100"
            >
              {isLoading ? "—" : summary?.total_assets ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-400">
            <Link
              href="/assets"
              className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
            >
              <span>Manage asset inventory</span>
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              <span>Security Events</span>
              <Activity className="h-4 w-4 text-emerald-400" />
            </CardDescription>
            <CardTitle
              data-testid="metric-total-events"
              className="text-2xl text-emerald-400"
            >
              {isLoading ? "—" : summary?.total_events ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-400">
            <Link
              href="/security-events"
              className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
            >
              <span>Inspect & ingest logs</span>
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              <span>Active / Total Incidents</span>
              <ShieldAlert className="h-4 w-4 text-amber-400" />
            </CardDescription>
            <CardTitle
              data-testid="metric-incidents"
              className="text-2xl text-slate-100"
            >
              {isLoading
                ? "—"
                : `${summary?.open_incidents ?? 0} / ${
                    summary?.total_incidents ?? 0
                  }`}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-400">
            <Link
              href="/incidents"
              className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
            >
              <span>View incident timeline</span>
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              <span>Peak / Avg Risk Score</span>
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </CardDescription>
            <CardTitle
              data-testid="metric-risk-score"
              className="text-2xl text-emerald-400"
            >
              {isLoading
                ? "—"
                : `${summary?.highest_event_risk_score ?? 0} / ${
                    summary?.average_event_risk_score ?? 0
                  }`}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-400">
            Deterministic 0–100 priority index (not probability)
          </CardContent>
        </Card>
      </div>

      {/* Live Risk Distribution & Correlated Clusters */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              Live Event Risk Level Distribution (Actual DB Records)
            </CardTitle>
            <CardDescription>
              Reflects actual stored SecurityEvents scored on the 0–100
              deterministic scale. Zero placeholder data is shown when the table
              is empty.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {summary && summary.total_events > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 16, left: -12, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="level"
                      stroke="#94a3b8"
                      fontSize={12}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={12}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#10b981",
                        borderRadius: "0.5rem",
                        color: "#f8fafc",
                        fontSize: "12px",
                      }}
                    />
                    <Bar
                      dataKey="count"
                      name="Events Count"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-slate-800 bg-slate-950/50 p-6 text-center">
                <p className="text-sm font-semibold text-slate-300">
                  No Security Events Ingested Yet
                </p>
                <p className="mt-1 max-w-md text-xs text-slate-400">
                  Click &ldquo;Simulate Synthetic Scenarios&rdquo; above or
                  import a CSV/JSON file on the Security Events page to populate
                  and analyze synthetic defensive logs.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Correlated Threat Clusters</CardTitle>
            <CardDescription>
              Grouped by shared source IP, target asset, and multi-stage
              progression within 60 minutes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {clusters.length === 0 ? (
              <p className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-400">
                No multi-event correlation clusters detected yet.
              </p>
            ) : (
              clusters.slice(0, 4).map((cluster) => (
                <div
                  key={cluster.correlation_group_id}
                  className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-emerald-400">
                      {cluster.correlation_group_id}
                    </span>
                    <Badge
                      variant={
                        cluster.risk_level === "critical"
                          ? "destructive"
                          : cluster.risk_level === "high"
                          ? "warning"
                          : "default"
                      }
                    >
                      Risk {cluster.risk_score}/100 ({cluster.risk_level})
                    </Badge>
                  </div>
                  <p className="text-slate-300">
                    {cluster.events_count} events • Playbook:{" "}
                    <span className="font-mono text-emerald-300">
                      {cluster.recommended_playbook_code}
                    </span>
                  </p>
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    {cluster.correlation_explanation}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Risk Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>Highest-Priority Flagged Security Events</CardTitle>
          <CardDescription>
            Ranked by deterministic 0–100 risk score with explainable factor
            breakdown.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!summary || summary.top_risk_events.length === 0 ? (
            <p className="text-xs text-slate-400">
              No security events recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-2.5 pr-4">Event Title</th>
                    <th className="pb-2.5 pr-4">Type</th>
                    <th className="pb-2.5 pr-4">Severity</th>
                    <th className="pb-2.5 pr-4">Risk Score</th>
                    <th className="pb-2.5">Occurred At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {summary.top_risk_events.map((ev) => (
                    <tr key={ev.id} className="hover:bg-slate-900/50">
                      <td className="py-2.5 pr-4 font-medium text-slate-100">
                        {ev.title}
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-emerald-300">
                        {ev.event_type}
                      </td>
                      <td className="py-2.5 pr-4 uppercase">{ev.severity}</td>
                      <td className="py-2.5 pr-4">
                        <Badge
                          variant={
                            ev.risk_level === "critical"
                              ? "destructive"
                              : ev.risk_level === "high"
                              ? "warning"
                              : "default"
                          }
                        >
                          {ev.risk_score}/100 ({ev.risk_level})
                        </Badge>
                      </td>
                      <td className="py-2.5 text-slate-400">
                        {formatTimestamp(ev.occurred_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
