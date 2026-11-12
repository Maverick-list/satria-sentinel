"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  Flame,
  Layers,
  LayoutDashboard,
  Network,
  RefreshCw,
  Search,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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

const SEVERITY_COLORS: Record<string, string> = {
  low: "#10b981",
  medium: "#38bdf8",
  high: "#f59e0b",
  critical: "#ef4444",
};

const RISK_TIER_COLORS: Record<string, string> = {
  "Low (0-29)": "#10b981",
  "Medium (30-54)": "#38bdf8",
  "High (55-79)": "#f59e0b",
  "Critical (80-100)": "#ef4444",
};

export default function DashboardPage() {
  const { user, isLoading: authLoading, showToast } = useAuth();
  const [summary, setSummary] = useState<RiskSummaryResponse | null>(null);
  const [clusters, setClusters] = useState<CorrelationCluster[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  // Table filters
  const [eventSearch, setEventSearch] = useState<string>("");
  const [eventSeverityFilter, setEventSeverityFilter] = useState<string>("all");

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
      setLastRefreshed(new Date());
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

  const riskChartData = useMemo(() => {
    if (!summary) return [];
    return [
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
    ];
  }, [summary]);

  const severityChartData = useMemo(() => {
    if (!summary?.event_severity_distribution) return [];
    return [
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
    ];
  }, [summary]);

  const trendData = useMemo(() => {
    if (!summary?.detection_trend || summary.detection_trend.length === 0) {
      return [];
    }
    return summary.detection_trend;
  }, [summary]);

  const incidentLifecycleData = useMemo(() => {
    const incidents = summary?.recent_incidents ?? [];
    const counts = { open: 0, investigating: 0, contained: 0, closed: 0 };
    incidents.forEach((inc) => {
      const st = inc.status.toLowerCase();
      if (st === "open") counts.open++;
      else if (st === "investigating") counts.investigating++;
      else if (st === "contained" || st === "containment") counts.contained++;
      else if (st === "closed" || st === "recovered" || st === "resolved")
        counts.closed++;
      else counts.open++;
    });
    return [
      { status: "Open", count: counts.open, color: "#ef4444" },
      { status: "Investigating", count: counts.investigating, color: "#f59e0b" },
      { status: "Contained", count: counts.contained, color: "#38bdf8" },
      { status: "Closed", count: counts.closed, color: "#10b981" },
    ];
  }, [summary]);

  const canWrite =
    user?.role === "admin" || user?.role === "security_analyst";

  // Build Analyst Priority Queue
  const activeIncidents = (summary?.recent_incidents ?? []).filter(
    (inc) => inc.status !== "recovered" && inc.status !== "closed"
  );
  const highRiskClusters = clusters.filter((c) => c.risk_score >= 65);
  const recentDetections = summary?.recent_detections ?? [];
  const assetRiskOverview = summary?.asset_risk_overview ?? [];

  // Filtered top risk events
  const filteredEvents = useMemo(() => {
    if (!summary?.top_risk_events) return [];
    return summary.top_risk_events.filter((ev) => {
      const matchesSeverity =
        eventSeverityFilter === "all" ||
        ev.severity.toLowerCase() === eventSeverityFilter.toLowerCase();
      const q = eventSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        ev.title.toLowerCase().includes(q) ||
        ev.event_type.toLowerCase().includes(q) ||
        (ev.asset_tag && ev.asset_tag.toLowerCase().includes(q));
      return matchesSeverity && matchesSearch;
    });
  }, [summary, eventSearch, eventSeverityFilter]);

  return (
    <div className="space-y-6">
      {/* Top Command Banner */}
      <div className="flex flex-col gap-4 border-b border-slate-800/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-inner">
            <LayoutDashboard className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1
                data-testid="page-heading"
                className="text-2xl font-bold tracking-tight text-slate-100"
              >
                Command Center Dashboard
              </h1>
              <Badge
                variant="default"
                className="font-mono text-[10px] tracking-wide"
              >
                DEFENSIVE TELEMETRY // SOC OPERATIONS
              </Badge>
              {lastRefreshed ? (
                <span className="hidden items-center gap-1 font-mono text-[11px] text-slate-500 sm:inline-flex">
                  <Clock className="h-3 w-3" />
                  Synced {lastRefreshed.toLocaleTimeString()}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-slate-400">
              SATRIA SENTINEL — Real-Time Digital Asset Posture, Explainable Threat
              Detections & Multi-Stage Event Correlation
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
              className="bg-emerald-600 font-medium text-slate-950 hover:bg-emerald-500"
            >
              <Sparkles
                className={`h-3.5 w-3.5 ${isGenerating ? "animate-spin" : ""}`}
              />
              <span>
                {isGenerating
                  ? "Simulating Scenarios..."
                  : "Simulate Synthetic Scenarios"}
              </span>
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadDashboard()}
            disabled={isLoading}
            className="border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300"
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
        <div className="flex items-center gap-3 rounded-xl border border-rose-500/40 bg-rose-950/30 p-4 text-xs text-rose-200">
          <AlertOctagon className="h-5 w-5 shrink-0 text-rose-400" />
          <div>
            <p className="font-semibold">Operational Telemetry Synchronization Error</p>
            <p className="mt-0.5 font-mono text-[11px] text-rose-300">{error}</p>
          </div>
        </div>
      ) : null}

      {/* Executive Security Overview: 6 Summary KPI Cards */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Executive Security Posture Overview
            </h2>
          </div>
          <span className="font-mono text-[11px] text-slate-500">
            PostgreSQL 16 Ground Truth
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {/* Card 1: Monitored Assets */}
          <Card className="border-slate-800/80 bg-slate-900/60 p-4 transition-all hover:border-emerald-500/40 hover:bg-slate-900/90">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Monitored Assets</span>
              <Server className="h-4 w-4 text-emerald-400" />
            </div>
            <div
              data-testid="metric-total-assets"
              className="mt-2 text-2xl font-bold tracking-tight text-slate-100"
            >
              {isLoading ? "—" : summary?.total_assets ?? 0}
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Inventory</span>
              <Link
                href="/assets"
                className="inline-flex items-center gap-0.5 text-emerald-400 hover:underline"
              >
                <span>Manage</span>
                <ArrowRight className="h-2.5 w-2.5" />
              </Link>
            </div>
          </Card>

          {/* Card 2: Critical Assets */}
          <Card className="border-slate-800/80 bg-slate-900/60 p-4 transition-all hover:border-amber-500/40 hover:bg-slate-900/90">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Critical Tier</span>
              <ShieldAlert className="h-4 w-4 text-amber-400" />
            </div>
            <div
              data-testid="metric-critical-assets"
              className="mt-2 text-2xl font-bold tracking-tight text-amber-400"
            >
              {isLoading ? "—" : summary?.critical_assets_count ?? 0}
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Tier-1 Assets</span>
              <Link
                href="/assets"
                className="inline-flex items-center gap-0.5 text-amber-400 hover:underline"
              >
                <span>Filter</span>
                <ArrowRight className="h-2.5 w-2.5" />
              </Link>
            </div>
          </Card>

          {/* Card 3: Security Telemetry Events */}
          <Card className="border-slate-800/80 bg-slate-900/60 p-4 transition-all hover:border-emerald-500/40 hover:bg-slate-900/90">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Telemetry Events</span>
              <Activity className="h-4 w-4 text-emerald-400" />
            </div>
            <div
              data-testid="metric-total-events"
              className="mt-2 text-2xl font-bold tracking-tight text-emerald-400"
            >
              {isLoading ? "—" : summary?.total_events ?? 0}
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="truncate text-slate-400">
                {summary?.synthetic_events_count ?? 0} sim
              </span>
              <Link
                href="/security-events"
                className="inline-flex items-center gap-0.5 text-emerald-400 hover:underline"
              >
                <span>Logs</span>
                <ArrowRight className="h-2.5 w-2.5" />
              </Link>
            </div>
          </Card>

          {/* Card 4: Threat Findings */}
          <Card className="border-slate-800/80 bg-slate-900/60 p-4 transition-all hover:border-rose-500/40 hover:bg-slate-900/90">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Flagged Findings</span>
              <Flame className="h-4 w-4 text-rose-400" />
            </div>
            <div
              data-testid="metric-high-risk-findings"
              className="mt-2 text-2xl font-bold tracking-tight text-rose-400"
            >
              {isLoading ? "—" : summary?.high_risk_findings_count ?? 0}
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Detections</span>
              <Link
                href="/detection-correlation"
                className="inline-flex items-center gap-0.5 text-rose-400 hover:underline"
              >
                <span>Catalog</span>
                <ArrowRight className="h-2.5 w-2.5" />
              </Link>
            </div>
          </Card>

          {/* Card 5: Open Incidents */}
          <Card className="border-slate-800/80 bg-slate-900/60 p-4 transition-all hover:border-amber-500/40 hover:bg-slate-900/90">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Open Incidents</span>
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            </div>
            <div
              data-testid="metric-incidents"
              className="mt-2 text-2xl font-bold tracking-tight text-slate-100"
            >
              {isLoading
                ? "—"
                : `${summary?.open_incidents ?? 0} / ${
                    summary?.total_incidents ?? 0
                  }`}
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Cases</span>
              <Link
                href="/incidents"
                className="inline-flex items-center gap-0.5 text-amber-400 hover:underline"
              >
                <span>Triage</span>
                <ArrowRight className="h-2.5 w-2.5" />
              </Link>
            </div>
          </Card>

          {/* Card 6: Peak / Average Risk Exposure */}
          <Card className="border-slate-800/80 bg-slate-900/60 p-4 transition-all hover:border-sky-500/40 hover:bg-slate-900/90">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Peak / Avg Risk</span>
              <TrendingUp className="h-4 w-4 text-sky-400" />
            </div>
            <div
              data-testid="metric-risk-score"
              className="mt-2 text-2xl font-bold tracking-tight text-sky-400"
            >
              {isLoading
                ? "—"
                : `${summary?.highest_event_risk_score ?? 0} / ${
                    summary?.average_event_risk_score ?? 0
                  }`}
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">0–100 Scale</span>
              <span className="font-mono text-emerald-400">Explainable</span>
            </div>
          </Card>
        </div>
      </div>

      {/* Analyst Priority Attention Section */}
      <Card
        data-testid="analyst-priority-section"
        className="border-emerald-500/30 bg-slate-900/70 shadow-lg"
      >
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/15 text-amber-400">
                <Flame className="h-4 w-4" />
              </div>
              <CardTitle className="text-base text-slate-100">
                Analyst Priority Attention Queue
              </CardTitle>
            </div>
            <Badge variant="secondary" className="font-mono text-[10px]">
              RANKED BY COMPOSITE RISK & LIFECYCLE STATE
            </Badge>
          </div>
          <CardDescription className="text-xs text-slate-400">
            Deterministic triage focus highlighting active incidents, multi-event
            correlation clusters, and elevated asset exposures requiring immediate SOC review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-28 animate-pulse rounded-lg border border-slate-800 bg-slate-950/60"
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
                  Zero open incidents or unreviewed high-risk clusters in queue. Click &ldquo;Simulate Synthetic Scenarios&rdquo; to test defensive workflows.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {/* Priority 1: Active Incidents */}
              <div className="flex flex-col justify-between rounded-lg border border-slate-800/90 bg-slate-950/80 p-3.5 text-xs">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-semibold text-amber-300">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>1. Unresolved Incidents</span>
                    </span>
                    <Badge
                      variant={
                        activeIncidents.length > 0 ? "destructive" : "secondary"
                      }
                      className="text-[10px]"
                    >
                      {activeIncidents.length} Active
                    </Badge>
                  </div>
                  {activeIncidents.length === 0 ? (
                    <p className="text-slate-400">
                      All incidents in{" "}
                      <code className="font-mono text-emerald-300">recovered</code>{" "}
                      or{" "}
                      <code className="font-mono text-emerald-300">closed</code>{" "}
                      state.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {activeIncidents.slice(0, 2).map((inc) => (
                        <div
                          key={inc.id}
                          className="rounded border border-slate-800 bg-slate-900/70 p-2"
                        >
                          <div className="flex items-center justify-between font-mono text-[11px]">
                            <span className="font-bold text-emerald-400">
                              {inc.incident_number}
                            </span>
                            <span className="uppercase text-amber-300">
                              {inc.status} • Risk {inc.risk_score}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate font-medium text-slate-200">
                            {inc.title}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Link
                  href="/incidents"
                  className="mt-3 inline-flex items-center gap-1 font-medium text-emerald-400 hover:underline"
                >
                  <span>Go to Incident Investigation</span>
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>

              {/* Priority 2: High-Risk Correlated Clusters */}
              <div className="flex flex-col justify-between rounded-lg border border-slate-800/90 bg-slate-950/80 p-3.5 text-xs">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-semibold text-emerald-300">
                      <Network className="h-3.5 w-3.5" />
                      <span>2. Correlated Clusters</span>
                    </span>
                    <Badge
                      variant={
                        highRiskClusters.length > 0 ? "warning" : "secondary"
                      }
                      className="text-[10px]"
                    >
                      {highRiskClusters.length} High-Risk
                    </Badge>
                  </div>
                  {highRiskClusters.length === 0 ? (
                    <p className="text-slate-400">
                      No high-risk clusters in 60m sliding correlation window.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {highRiskClusters.slice(0, 2).map((cl) => (
                        <div
                          key={cl.correlation_group_id}
                          className="rounded border border-slate-800 bg-slate-900/70 p-2"
                        >
                          <div className="flex items-center justify-between font-mono text-[11px]">
                            <span className="font-bold text-emerald-400">
                              {cl.correlation_group_id}
                            </span>
                            <span className="text-amber-300">
                              {cl.events_count} events • Risk {cl.risk_score}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-slate-300">
                            Playbook:{" "}
                            <span className="font-mono text-emerald-300">
                              {cl.recommended_playbook_code}
                            </span>
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Link
                  href="/detection-correlation"
                  className="mt-3 inline-flex items-center gap-1 font-medium text-emerald-400 hover:underline"
                >
                  <span>Review Correlation Clusters</span>
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>

              {/* Priority 3: Asset Exposure Focus */}
              <div className="flex flex-col justify-between rounded-lg border border-slate-800/90 bg-slate-950/80 p-3.5 text-xs">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-200">
                      <Server className="h-3.5 w-3.5" />
                      <span>3. Asset Exposure Focus</span>
                    </span>
                    <Badge variant="default" className="text-[10px]">
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
                      No security events currently mapped to registered assets.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {assetRiskOverview
                        .filter((a) => a.event_count > 0)
                        .slice(0, 2)
                        .map((asset) => (
                          <div
                            key={asset.id}
                            className="rounded border border-slate-800 bg-slate-900/70 p-2"
                          >
                            <div className="flex items-center justify-between font-mono text-[11px]">
                              <span className="font-bold text-emerald-400">
                                {asset.asset_tag}
                              </span>
                              <span className="text-slate-300">
                                Peak Risk {asset.peak_risk_score}/100
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-slate-300">
                              {asset.name} ({asset.criticality.toUpperCase()})
                            </p>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
                <Link
                  href="/assets"
                  className="mt-3 inline-flex items-center gap-1 font-medium text-emerald-400 hover:underline"
                >
                  <span>Inspect Asset Inventory</span>
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recharts Visualizations Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Chart 1: Ingestion & Threat Detection Timeline */}
        <Card className="lg:col-span-2 border-slate-800/80 bg-slate-900/60">
          <CardHeader>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base text-slate-100">
                  Telemetry & Threat Detection Activity Trend
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Time-bucketed security telemetry ingestion vs flagged detection findings.
                </CardDescription>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px]">
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span>Events</span>
                </div>
                <div className="flex items-center gap-1.5 text-sky-400">
                  <div className="h-2.5 w-2.5 rounded-full bg-sky-400" />
                  <span>Detections</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {trendData.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={trendData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="eventColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="detColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="bucket"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0a1120",
                        borderColor: "#334155",
                        borderRadius: "0.5rem",
                        color: "#f8fafc",
                        fontSize: "12px",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="events"
                      name="Events"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#eventColor)"
                    />
                    <Area
                      type="monotone"
                      dataKey="detections"
                      name="Detections"
                      stroke="#38bdf8"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#detColor)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-slate-800 bg-slate-950/40 p-6 text-center">
                <Activity className="h-8 w-8 text-slate-600 mb-2" />
                <p className="text-xs font-semibold text-slate-300">
                  No Telemetry Trend Data Yet
                </p>
                <p className="mt-1 text-[11px] text-slate-500 max-w-sm">
                  Click &ldquo;Simulate Synthetic Scenarios&rdquo; to populate activity time buckets.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chart 2: Threat Severity Distribution */}
        <Card className="border-slate-800/80 bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-base text-slate-100">
              Event Severity Breakdown
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Categorized by NIST/CVSS telemetry severity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {severityChartData.length > 0 &&
            severityChartData.some((d) => d.count > 0) ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={severityChartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="severity"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0a1120",
                        borderColor: "#334155",
                        borderRadius: "0.5rem",
                        color: "#f8fafc",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="count" name="Count" radius={[4, 4, 0, 0]}>
                      {severityChartData.map((entry, index) => (
                        <Cell
                          key={`cell-sev-${index}`}
                          fill={
                            SEVERITY_COLORS[entry.severity.toLowerCase()] ||
                            "#38bdf8"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-slate-800 bg-slate-950/40 p-6 text-center">
                <Shield className="h-8 w-8 text-slate-600 mb-2" />
                <p className="text-xs text-slate-400">
                  No severity telemetry available.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Secondary Charts: Composite Risk & Incident Pipeline */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chart 3: Composite Risk Level Distribution */}
        <Card className="border-slate-800/80 bg-slate-900/60">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-slate-100">
                  Composite Risk Level Distribution (0–100)
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Calculated via 5-factor weighted defensive formula.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="font-mono text-[10px]">
                Deterministic
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {riskChartData.length > 0 &&
            riskChartData.some((d) => d.count > 0) ? (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={riskChartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="level"
                      stroke="#64748b"
                      fontSize={10}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0a1120",
                        borderColor: "#334155",
                        borderRadius: "0.5rem",
                        color: "#f8fafc",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="count" name="Events" radius={[4, 4, 0, 0]}>
                      {riskChartData.map((entry, index) => (
                        <Cell
                          key={`cell-risk-${index}`}
                          fill={RISK_TIER_COLORS[entry.level] || "#10b981"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-56 flex-col items-center justify-center rounded-lg border border-dashed border-slate-800 bg-slate-950/40 p-6 text-center">
                <TrendingUp className="h-8 w-8 text-slate-600 mb-2" />
                <p className="text-xs text-slate-400">
                  No risk scores calculated yet.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chart 4: Incident Response Pipeline */}
        <Card className="border-slate-800/80 bg-slate-900/60">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-slate-100">
                  Incident Response Lifecycle Pipeline
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  NIST SP 800-61 incident status workflow.
                </CardDescription>
              </div>
              <Link
                href="/incidents"
                className="text-xs font-medium text-emerald-400 hover:underline"
              >
                View cases
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={incidentLifecycleData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="status"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0a1120",
                      borderColor: "#334155",
                      borderRadius: "0.5rem",
                      color: "#f8fafc",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="count" name="Incidents" radius={[4, 4, 0, 0]}>
                    {incidentLifecycleData.map((entry, index) => (
                      <Cell key={`cell-life-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Asset Risk Overview & Recent Incident Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Asset Risk Overview Table */}
        <Card
          data-testid="asset-risk-overview"
          className="border-slate-800/80 bg-slate-900/60"
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-slate-100">
                  Asset Risk Overview
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Monitored digital infrastructure ranked by peak risk score.
                </CardDescription>
              </div>
              <Link
                href="/assets"
                className="text-xs font-medium text-emerald-400 hover:underline"
              >
                Manage all
              </Link>
            </div>
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
                      <th className="pb-2.5 pr-3 font-medium">Asset Tag & Name</th>
                      <th className="pb-2.5 pr-3 font-medium">Criticality</th>
                      <th className="pb-2.5 pr-3 font-medium">Telemetry</th>
                      <th className="pb-2.5 font-medium">Peak Risk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {assetRiskOverview.map((asset) => (
                      <tr
                        key={asset.id}
                        className="transition-colors hover:bg-slate-900/70"
                      >
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
                            className="text-[10px]"
                          >
                            {asset.criticality.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-2.5 pr-3 font-mono text-slate-300">
                          {asset.event_count} ev • {asset.detections_count} det
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
                            className="font-mono text-[10px]"
                          >
                            {asset.peak_risk_score}/100
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

        {/* Recent Incident Activity */}
        <Card
          data-testid="recent-incidents-panel"
          className="border-slate-800/80 bg-slate-900/60"
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-slate-100">
                  Recent Incident Activity
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Latest security investigations and status updates.
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
              summary.recent_incidents.slice(0, 4).map((inc) => (
                <div
                  key={inc.id}
                  className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/70 p-3 transition-colors hover:border-slate-700"
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-emerald-400">
                        {inc.incident_number}
                      </span>
                      <Badge variant="secondary" className="text-[10px] uppercase">
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
                    className="font-mono text-[10px]"
                  >
                    {inc.risk_score}/100
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Flagged Security Events Table with Interactive Search & Filter */}
      <Card className="border-slate-800/80 bg-slate-900/60">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base text-slate-100">
                Highest-Priority Flagged Security Events
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Ranked by 5-factor deterministic risk score with simulation flags.
              </CardDescription>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter events..."
                  value={eventSearch}
                  onChange={(e) => setEventSearch(e.target.value)}
                  className="h-8 rounded-lg border border-slate-800 bg-slate-950/80 pl-8 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:border-emerald-500/50 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950/60 p-0.5 text-[11px]">
                {["all", "critical", "high", "medium", "low"].map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setEventSeverityFilter(sev)}
                    className={`rounded px-2 py-1 font-medium capitalize transition-colors ${
                      eventSeverityFilter === sev
                        ? "bg-emerald-500/20 text-emerald-300 font-semibold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!summary || filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-800 bg-slate-950/40 p-8 text-center">
              <ShieldAlert className="h-8 w-8 text-slate-600 mb-2" />
              <p className="text-xs font-semibold text-slate-300">
                No matching security events
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                {eventSearch || eventSeverityFilter !== "all"
                  ? "Try adjusting search query or severity filter."
                  : "No events ingested yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-2.5 pr-4 font-medium">Event Title & Origin</th>
                    <th className="pb-2.5 pr-4 font-medium">Asset</th>
                    <th className="pb-2.5 pr-4 font-medium">Type</th>
                    <th className="pb-2.5 pr-4 font-medium">Severity</th>
                    <th className="pb-2.5 pr-4 font-medium">Risk Score</th>
                    <th className="pb-2.5 font-medium">Occurred At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {filteredEvents.slice(0, 10).map((ev) => (
                    <tr
                      key={ev.id}
                      className="transition-colors hover:bg-slate-900/60"
                    >
                      <td className="py-2.5 pr-4 font-medium text-slate-100">
                        <div className="flex items-center gap-1.5">
                          {ev.is_synthetic !== false ? (
                            <Badge
                              variant="secondary"
                              className="font-mono text-[9px] uppercase tracking-wide"
                            >
                              SIM
                            </Badge>
                          ) : null}
                          <span className="truncate max-w-sm">{ev.title}</span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-emerald-400">
                        {ev.asset_tag ?? "—"}
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-slate-300">
                        {ev.event_type}
                      </td>
                      <td className="py-2.5 pr-4">
                        <Badge
                          variant={
                            ev.severity.toLowerCase() === "critical"
                              ? "destructive"
                              : ev.severity.toLowerCase() === "high"
                              ? "warning"
                              : "secondary"
                          }
                          className="text-[10px] uppercase"
                        >
                          {ev.severity}
                        </Badge>
                      </td>
                      <td className="py-2.5 pr-4">
                        <Badge
                          variant={
                            ev.risk_level === "critical"
                              ? "destructive"
                              : ev.risk_level === "high"
                              ? "warning"
                              : "default"
                          }
                          className="font-mono text-[10px]"
                        >
                          {ev.risk_score}/100
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
