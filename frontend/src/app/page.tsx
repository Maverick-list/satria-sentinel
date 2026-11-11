"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Flame,
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
        err instanceof Error
          ? err.message
          : "Failed to generate synthetic pack",
        "error"
      );
    } finally {
      setIsGenerating(false);
    }
  }

  const riskChartData = summary
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

  const severityChartData = summary?.event_severity_distribution
    ? [
        {
          severity: "Low",
          count: summary.event_severity_distribution.low,
        },
        {
          severity: "Medium",
          count: summary.event_severity_distribution.medium,
        },
        {
          severity: "High",
          count: summary.event_severity_distribution.high,
        },
        {
          severity: "Critical",
          count: summary.event_severity_distribution.critical,
        },
      ]
    : [];

  const canWrite =
    user?.role === "admin" || user?.role === "security_analyst";

  // Build Analyst Priority Queue from actual active incidents, high-risk clusters, and detections
  const activeIncidents = (summary?.recent_incidents ?? []).filter(
    (inc) => inc.status !== "recovered" && inc.status !== "closed"
  );
  const highRiskClusters = clusters.filter((c) => c.risk_score >= 65);
  const recentDetections = summary?.recent_detections ?? [];
  const assetRiskOverview = summary?.asset_risk_overview ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-slate-800/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/15 text-emerald-400">
            <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1
                data-testid="page-heading"
                className="text-2xl font-bold tracking-tight text-slate-100"
              >
                Command Center Dashboard
              </h1>
              <Badge variant="secondary" className="font-mono text-[10px]">
                DEFENSIVE TELEMETRY
              </Badge>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              SATRIA SENTINEL — Live Asset Posture, Explainable Threat
              Detections, Event Correlation & Risk Priority Overview
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

      {/* Primary KPI Grid */}
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
          <CardContent className="space-y-1 text-xs text-slate-400">
            <p data-testid="metric-critical-assets">
              Critical Tier Assets:{" "}
              <span className="font-mono font-semibold text-amber-300">
                {isLoading ? "—" : summary?.critical_assets_count ?? 0}
              </span>
            </p>
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
          <CardContent className="space-y-1 text-xs text-slate-400">
            <p>
              Synthetic Sim:{" "}
              <span className="font-mono text-slate-200">
                {isLoading ? "—" : summary?.synthetic_events_count ?? 0}
              </span>{" "}
              • Standard:{" "}
              <span className="font-mono text-slate-200">
                {isLoading ? "—" : summary?.non_synthetic_events_count ?? 0}
              </span>
            </p>
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
          <CardContent className="space-y-1 text-xs text-slate-400">
            <p>
              {(summary?.open_incidents ?? 0) === 0
                ? "No open active incidents"
                : `${summary?.open_incidents} case(s) awaiting resolution`}
            </p>
            <Link
              href="/incidents"
              className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
            >
              <span>Open investigation workflow</span>
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              <span>High-Risk Findings & Peak Score</span>
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
          <CardContent className="space-y-1 text-xs text-slate-400">
            <p data-testid="metric-high-risk-findings">
              High-Risk / Flagged Findings:{" "}
              <span className="font-mono font-semibold text-amber-300">
                {isLoading ? "—" : summary?.high_risk_findings_count ?? 0}
              </span>
            </p>
            <p className="text-[11px] text-slate-500">
              Deterministic 0–100 priority index (not probability)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analyst Priority Attention Section */}
      <Card
        data-testid="analyst-priority-section"
        className="border-emerald-500/30 bg-slate-900/70"
      >
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-amber-400" />
              <CardTitle>Analyst Priority Attention Queue</CardTitle>
            </div>
            <Badge variant="secondary" className="font-mono text-[10px]">
              RANKED BY COMPOSITE RISK & LIFECYCLE STATE
            </Badge>
          </div>
          <CardDescription>
            Actionable triage queue highlighting unresolved incidents,
            multi-stage correlation clusters, and highest-scoring detections
            requiring analyst review first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-24 animate-pulse rounded-lg border border-slate-800 bg-slate-950/60"
                />
              ))}
            </div>
          ) : activeIncidents.length === 0 &&
            highRiskClusters.length === 0 &&
            recentDetections.length === 0 ? (
            <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-300">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
              <div>
                <p className="font-semibold text-slate-100">
                  No Immediate High-Priority Escalations
                </p>
                <p className="mt-0.5 text-slate-400">
                  There are currently zero open incidents or unreviewed
                  high-risk detections. Click &ldquo;Simulate Synthetic
                  Scenarios&rdquo; above to test a multi-stage defensive
                  triage scenario.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {/* Priority 1: Active Incidents */}
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3.5 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>1. Unresolved Incidents</span>
                  </span>
                  <Badge
                    variant={
                      activeIncidents.length > 0 ? "destructive" : "secondary"
                    }
                  >
                    {activeIncidents.length} Active
                  </Badge>
                </div>
                {activeIncidents.length === 0 ? (
                  <p className="text-slate-400">
                    All recorded incidents are currently in{" "}
                    <code className="font-mono text-emerald-300">
                      recovered
                    </code>{" "}
                    or{" "}
                    <code className="font-mono text-emerald-300">closed</code>{" "}
                    state.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {activeIncidents.slice(0, 2).map((inc) => (
                      <div
                        key={inc.id}
                        className="rounded border border-slate-800/90 bg-slate-900/60 p-2"
                      >
                        <div className="flex items-center justify-between font-mono text-[11px]">
                          <span className="text-emerald-400 font-bold">
                            {inc.incident_number}
                          </span>
                          <span className="uppercase text-amber-300">
                            {inc.status} • Risk {inc.risk_score}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-slate-200 font-medium">
                          {inc.title}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                <Link
                  href="/incidents"
                  className="inline-flex items-center gap-1 font-medium text-emerald-400 hover:underline"
                >
                  <span>Go to Incident Investigation</span>
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>

              {/* Priority 2: High-Risk Correlated Clusters */}
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3.5 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-emerald-300">
                    2. Correlated Threat Clusters
                  </span>
                  <Badge
                    variant={
                      highRiskClusters.length > 0 ? "warning" : "secondary"
                    }
                  >
                    {highRiskClusters.length} High-Risk
                  </Badge>
                </div>
                {highRiskClusters.length === 0 ? (
                  <p className="text-slate-400">
                    No high-risk multi-event clusters detected in the current
                    60-minute correlation window.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {highRiskClusters.slice(0, 2).map((cl) => (
                      <div
                        key={cl.correlation_group_id}
                        className="rounded border border-slate-800/90 bg-slate-900/60 p-2"
                      >
                        <div className="flex items-center justify-between font-mono text-[11px]">
                          <span className="text-emerald-400 font-bold">
                            {cl.correlation_group_id}
                          </span>
                          <span className="text-amber-300">
                            {cl.events_count} events • Risk {cl.risk_score}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-slate-300">
                          Assets: {cl.asset_tags.join(", ") || "Unassigned"} •
                          Playbook: {cl.recommended_playbook_code}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                <Link
                  href="/security-events"
                  className="inline-flex items-center gap-1 font-medium text-emerald-400 hover:underline"
                >
                  <span>Review & Escalate Clusters</span>
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>

              {/* Priority 3: Highest-Risk Monitored Assets */}
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3.5 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">
                    3. Asset Exposure Focus
                  </span>
                  <Badge variant="default">
                    {
                      assetRiskOverview.filter((a) => a.peak_risk_score >= 55)
                        .length
                    }{" "}
                    Elevated
                  </Badge>
                </div>
                {assetRiskOverview.filter((a) => a.event_count > 0).length ===
                0 ? (
                  <p className="text-slate-400">
                    No security events currently linked to registered assets.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {assetRiskOverview
                      .filter((a) => a.event_count > 0)
                      .slice(0, 2)
                      .map((asset) => (
                        <div
                          key={asset.id}
                          className="rounded border border-slate-800/90 bg-slate-900/60 p-2"
                        >
                          <div className="flex items-center justify-between font-mono text-[11px]">
                            <span className="text-emerald-400 font-bold">
                              {asset.asset_tag}
                            </span>
                            <span className="text-slate-300">
                              Peak Risk {asset.peak_risk_score}/100 (
                              {asset.detections_count} detections)
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-slate-300">
                            {asset.name} ({asset.criticality.toUpperCase()})
                          </p>
                        </div>
                      ))}
                  </div>
                )}
                <Link
                  href="/assets"
                  className="inline-flex items-center gap-1 font-medium text-emerald-400 hover:underline"
                >
                  <span>Inspect Asset Posture</span>
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts: Risk Level Distribution & Severity Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              Live Event Risk Level Distribution (Actual DB Records)
            </CardTitle>
            <CardDescription>
              Reflects stored SecurityEvents scored on the 0–100 deterministic
              scale. Zero placeholder data is shown when the table is empty.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {summary && summary.total_events > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="h-60 w-full">
                  <p className="mb-2 text-xs font-semibold text-slate-300">
                    By Composite Risk Level (0–100)
                  </p>
                  <ResponsiveContainer width="100%" height="90%">
                    <BarChart
                      data={riskChartData}
                      margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis
                        dataKey="level"
                        stroke="#94a3b8"
                        fontSize={11}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={11}
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

                <div className="h-60 w-full">
                  <p className="mb-2 text-xs font-semibold text-slate-300">
                    By Event Severity Classification
                  </p>
                  <ResponsiveContainer width="100%" height="90%">
                    <BarChart
                      data={severityChartData}
                      margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis
                        dataKey="severity"
                        stroke="#94a3b8"
                        fontSize={11}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={11}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          borderColor: "#38bdf8",
                          borderRadius: "0.5rem",
                          color: "#f8fafc",
                          fontSize: "12px",
                        }}
                      />
                      <Bar
                        dataKey="count"
                        name="Severity Count"
                        fill="#38bdf8"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="flex h-60 flex-col items-center justify-center rounded-lg border border-dashed border-slate-800 bg-slate-950/50 p-6 text-center">
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

        {/* Correlated Threat Clusters */}
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
              clusters.slice(0, 3).map((cluster) => (
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
                  <p className="text-[11px] leading-relaxed text-slate-400 line-clamp-3">
                    {cluster.correlation_explanation}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Asset Risk Overview & Recent Incident Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card data-testid="asset-risk-overview">
          <CardHeader>
            <CardTitle>Asset Risk Overview</CardTitle>
            <CardDescription>
              Monitored infrastructure ranked by peak event risk score and
              matched detection count.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assetRiskOverview.length === 0 ? (
              <p className="text-xs text-slate-400">
                No monitored assets registered yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="pb-2 pr-3">Asset Tag & Name</th>
                      <th className="pb-2 pr-3">Criticality</th>
                      <th className="pb-2 pr-3">Events / Detections</th>
                      <th className="pb-2">Peak Risk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {assetRiskOverview.map((asset) => (
                      <tr key={asset.id} className="hover:bg-slate-900/50">
                        <td className="py-2.5 pr-3">
                          <div className="font-mono font-bold text-emerald-400">
                            {asset.asset_tag}
                          </div>
                          <div className="text-[11px] text-slate-300">
                            {asset.name}
                          </div>
                        </td>
                        <td className="py-2.5 pr-3">
                          <Badge
                            variant={
                              asset.criticality === "critical"
                                ? "destructive"
                                : asset.criticality === "high"
                                ? "warning"
                                : "secondary"
                            }
                          >
                            {asset.criticality.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-2.5 pr-3 font-mono text-slate-300">
                          {asset.event_count} ev / {asset.detections_count} det
                        </td>
                        <td className="py-2.5">
                          <Badge
                            variant={
                              asset.peak_risk_score >= 80
                                ? "destructive"
                                : asset.peak_risk_score >= 55
                                ? "warning"
                                : "default"
                            }
                          >
                            {asset.peak_risk_score}/100 ({asset.risk_level})
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="recent-incidents-panel">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Incident Activity</CardTitle>
                <CardDescription>
                  Latest security cases, status transitions, and risk scores.
                </CardDescription>
              </div>
              <Link
                href="/incidents"
                className="text-xs font-medium text-emerald-400 hover:underline"
              >
                View all cases
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5 text-xs">
            {!summary?.recent_incidents ||
            summary.recent_incidents.length === 0 ? (
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-slate-400">
                No security incidents opened yet. Escalate a correlated cluster
                or create a case on the Incidents page.
              </div>
            ) : (
              summary.recent_incidents.map((inc) => (
                <div
                  key={inc.id}
                  className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/70 p-3"
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-emerald-400">
                        {inc.incident_number}
                      </span>
                      <Badge variant="secondary" className="uppercase">
                        {inc.status}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate font-medium text-slate-100">
                      {inc.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      Updated: {formatTimestamp(inc.updated_at)}
                    </p>
                  </div>
                  <Badge
                    variant={
                      inc.risk_level === "critical"
                        ? "destructive"
                        : inc.risk_level === "high"
                        ? "warning"
                        : "default"
                    }
                  >
                    {inc.risk_score}/100
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Risk Events & Recent Detections Table */}
      <Card>
        <CardHeader>
          <CardTitle>Highest-Priority Flagged Security Events</CardTitle>
          <CardDescription>
            Ranked by deterministic 0–100 risk score with explicit simulation
            labels and target asset tags.
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
                    <th className="pb-2.5 pr-4">Event Title & Origin</th>
                    <th className="pb-2.5 pr-4">Asset</th>
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
                        <div className="flex items-center gap-1.5">
                          {ev.is_synthetic !== false ? (
                            <Badge
                              variant="secondary"
                              className="font-mono text-[10px]"
                            >
                              SYNTHETIC SIM
                            </Badge>
                          ) : null}
                          <span>{ev.title}</span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-emerald-400">
                        {ev.asset_tag ?? "—"}
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-slate-300">
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
