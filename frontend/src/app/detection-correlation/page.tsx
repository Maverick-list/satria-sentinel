"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Code2,
  Database,
  Filter,
  Layers,
  Network,
  RefreshCw,
  Search,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Zap,
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
import { useAuth } from "@/features/auth/auth-context";
import { formatTimestamp } from "@/lib/utils";
import {
  getCorrelationsApi,
  listDetectionFindingsApi,
  listDetectionRulesApi,
  runCorrelationsApi,
  runDetectionScanApi,
} from "@/services/operational-service";
import type {
  CorrelationCluster,
  DetectionFindingItem,
  DetectionRuleItem,
} from "@/types/operational";

export default function DetectionCorrelationPage() {
  const { user, isLoading: authLoading, showToast } = useAuth();
  const [activeTab, setActiveTab] = useState<"rules" | "findings" | "clusters">(
    "rules"
  );
  const [rules, setRules] = useState<DetectionRuleItem[]>([]);
  const [findings, setFindings] = useState<DetectionFindingItem[]>([]);
  const [clusters, setClusters] = useState<CorrelationCluster[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isCorrelating, setIsCorrelating] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [correlationWindow, setCorrelationWindow] = useState<number>(60);
  const [selectedRule, setSelectedRule] = useState<DetectionRuleItem | null>(
    null
  );
  const [selectedCluster, setSelectedCluster] =
    useState<CorrelationCluster | null>(null);

  const canMutate =
    user?.role === "admin" ||
    user?.role === "security_analyst" ||
    user?.role === "analyst";

  const loadData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [rulesRes, findingsRes, corrRes] = await Promise.all([
        listDetectionRulesApi(),
        listDetectionFindingsApi().catch(() => ({
          total_events_evaluated: 0,
          flagged_events_count: 0,
          findings: [],
        })),
        getCorrelationsApi(correlationWindow).catch(() => ({
          window_minutes: correlationWindow,
          total_events_analyzed: 0,
          clusters_count: 0,
          clusters: [],
        })),
      ]);
      setRules(rulesRes.rules || []);
      setFindings(findingsRes.findings || []);
      setClusters(corrRes.clusters || []);
      if (rulesRes.rules?.length > 0 && !selectedRule) {
        setSelectedRule(rulesRes.rules[0]);
      }
      if (corrRes.clusters?.length > 0 && !selectedCluster) {
        setSelectedCluster(corrRes.clusters[0]);
      }
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : "Failed to load detection & correlation data",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  }, [user, correlationWindow, showToast, selectedRule, selectedCluster]);

  useEffect(() => {
    if (!authLoading) {
      void loadData();
    }
  }, [authLoading, loadData]);

  async function handleRunScan() {
    if (!canMutate) {
      showToast(
        "Viewer role has read-only access. Switch to Analyst or Admin to run detection scan.",
        "error"
      );
      return;
    }
    setIsScanning(true);
    try {
      const res = await runDetectionScanApi();
      showToast(
        `Detection Scan Complete: Evaluated ${res.evaluated_events_count} events, flagged ${res.flagged_events_count} security anomalies (${res.total_findings_count} rule matches).`,
        "success"
      );
      await loadData();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to execute detection scan",
        "error"
      );
    } finally {
      setIsScanning(false);
    }
  }

  async function handleRunCorrelation() {
    if (!canMutate) {
      showToast(
        "Viewer role has read-only access. Switch to Analyst or Admin to run correlation analysis.",
        "error"
      );
      return;
    }
    setIsCorrelating(true);
    try {
      const res = await runCorrelationsApi(correlationWindow);
      showToast(
        `Correlation Analysis Complete: Identified ${res.clusters_count} multi-factor clusters across ${res.total_events_analyzed} events (Window: ${res.window_minutes}m).`,
        "success"
      );
      await loadData();
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : "Failed to execute correlation analysis",
        "error"
      );
    } finally {
      setIsCorrelating(false);
    }
  }

  const filteredFindings = findings.filter((f) => {
    const matchesSearch =
      searchQuery === "" ||
      f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.event_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.source_ip && f.source_ip.includes(searchQuery)) ||
      f.detection_reasons.some(
        (r) =>
          r.rule_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.rule_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchesSeverity =
      severityFilter === "all" ||
      f.severity.toLowerCase() === severityFilter.toLowerCase();
    return matchesSearch && matchesSeverity;
  });

  const filteredRules = rules.filter((r) => {
    const matchesSearch =
      searchQuery === "" ||
      r.rule_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.rule_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.mitre_technique.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.mitre_tactic.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity =
      severityFilter === "all" ||
      r.severity.toLowerCase() === severityFilter.toLowerCase();
    return matchesSearch && matchesSeverity;
  });

  function getSeverityColor(sev: string) {
    switch (sev.toLowerCase()) {
      case "critical":
        return "bg-red-500/20 text-red-300 border-red-500/40";
      case "high":
        return "bg-orange-500/20 text-orange-300 border-orange-500/40";
      case "medium":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      default:
        return "bg-slate-500/20 text-slate-300 border-slate-500/40";
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Overview */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1
              data-testid="page-heading"
              className="text-2xl font-bold tracking-tight text-slate-100"
            >
              Detection &amp; Correlation Engine
            </h1>
            <Badge
              variant="outline"
              className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-mono text-xs"
            >
              Deterministic 6-Rule Core
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Explainable rule-based threat evaluation, MITRE ATT&amp;CK alignment,
            and multi-factor incident correlation clustering.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadData()}
            disabled={isLoading}
            className="border-slate-800 bg-slate-900/80 text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw
              className={`mr-2 h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>

          <Button
            size="sm"
            data-testid="run-detection-scan-btn"
            onClick={() => void handleRunScan()}
            disabled={isScanning || !canMutate}
            className="border border-emerald-500/50 bg-emerald-600 text-white hover:bg-emerald-500"
          >
            <Zap
              className={`mr-2 h-3.5 w-3.5 ${isScanning ? "animate-spin" : ""}`}
            />
            {isScanning ? "Scanning..." : "Run Detection Scan"}
          </Button>

          <Button
            size="sm"
            data-testid="run-detection-correlation-btn"
            onClick={() => void handleRunCorrelation()}
            disabled={isCorrelating || !canMutate}
            className="border border-cyan-500/50 bg-cyan-600 text-white hover:bg-cyan-500"
          >
            <Network
              className={`mr-2 h-3.5 w-3.5 ${isCorrelating ? "animate-spin" : ""}`}
            />
            {isCorrelating ? "Correlating..." : "Run Correlation"}
          </Button>
        </div>
      </div>

      {/* Metric Highlights */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
        <Card className="border-slate-800/80 bg-slate-900/60 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">
                Active Detection Rules
              </span>
              <Shield className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-100">
              {rules.length}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Open rules catalog, MITRE aligned
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-800/80 bg-slate-900/60 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">
                Flagged Findings
              </span>
              <ShieldAlert className="h-4 w-4 text-orange-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-orange-300">
              {findings.length}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Events matching &ge;1 security rule
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-800/80 bg-slate-900/60 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">
                Correlation Clusters
              </span>
              <Network className="h-4 w-4 text-cyan-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-cyan-300">
              {clusters.length}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Multi-factor incident chains
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-800/80 bg-slate-900/60 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">
                Engine Architecture
              </span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="mt-2 text-sm font-semibold text-emerald-300">
              Deterministic 100%
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Explainable, zero black-box AI
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tab Controls & Filters */}
      <div className="flex flex-col gap-3 rounded-lg border border-slate-800/90 bg-slate-950/70 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            data-testid="tab-rules"
            onClick={() => setActiveTab("rules")}
            className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === "rules"
                ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
            }`}
          >
            Detection Rules Catalog ({rules.length})
          </button>
          <button
            type="button"
            data-testid="tab-findings"
            onClick={() => setActiveTab("findings")}
            className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === "findings"
                ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
            }`}
          >
            Flagged Findings ({findings.length})
          </button>
          <button
            type="button"
            data-testid="tab-clusters"
            onClick={() => setActiveTab("clusters")}
            className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === "clusters"
                ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
            }`}
          >
            Correlation Clusters ({clusters.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search rule ID, MITRE, IP, title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-slate-800 bg-slate-900/90 py-1.5 pl-8 pr-3 text-xs text-slate-200 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="rounded-md border border-slate-800 bg-slate-900/90 px-2.5 py-1.5 text-xs text-slate-300 focus:border-emerald-500/50 focus:outline-none"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tab 1: Detection Rules Catalog */}
      {activeTab === "rules" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Rules List (Left 2 Columns) */}
          <div className="space-y-3 lg:col-span-2">
            {filteredRules.length === 0 ? (
              <Card className="border-slate-800/80 bg-slate-900/40 p-8 text-center text-slate-400">
                <ShieldCheck className="mx-auto h-8 w-8 text-slate-600 mb-2" />
                <p className="text-sm font-medium">No detection rules found matching filters.</p>
              </Card>
            ) : (
              filteredRules.map((r) => {
                const isSelected = selectedRule?.rule_id === r.rule_id;
                return (
                  <Card
                    key={r.rule_id}
                    onClick={() => setSelectedRule(r)}
                    className={`cursor-pointer border transition-all ${
                      isSelected
                        ? "border-emerald-500/60 bg-slate-900/90 shadow-lg shadow-emerald-500/5"
                        : "border-slate-800/70 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900/80"
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-emerald-400">
                            {r.rule_id}
                          </span>
                          <span className="text-xs text-slate-500">v{r.version}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase border ${getSeverityColor(
                              r.severity
                            )}`}
                          >
                            {r.severity}
                          </span>
                          <Badge
                            variant="secondary"
                            className="bg-slate-800 text-[10px] font-mono text-slate-300"
                          >
                            Conf: {Math.round(r.confidence * 100)}%
                          </Badge>
                        </div>
                      </div>

                      <h3 className="mt-2 text-sm font-semibold text-slate-100">
                        {r.rule_name}
                      </h3>
                      <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                        {r.description}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                        <span className="rounded bg-slate-800/80 px-2 py-0.5 text-slate-300 border border-slate-700/60">
                          {r.mitre_tactic}
                        </span>
                        <span className="rounded bg-cyan-950/40 px-2 py-0.5 text-cyan-300 border border-cyan-800/40">
                          {r.mitre_technique}
                        </span>
                        <span className="rounded bg-emerald-950/40 px-2 py-0.5 text-emerald-300 border border-emerald-800/40 ml-auto font-mono text-[10px]">
                          {r.playbook_code}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Rule Detail Inspector (Right 1 Column) */}
          <div className="lg:col-span-1">
            {selectedRule ? (
              <Card className="sticky top-20 border-slate-800 bg-slate-900/90 shadow-xl">
                <CardHeader className="border-b border-slate-800 pb-3">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className="border-emerald-500/40 bg-emerald-500/10 font-mono text-emerald-400 text-xs"
                    >
                      {selectedRule.rule_id}
                    </Badge>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase border ${getSeverityColor(
                        selectedRule.severity
                      )}`}
                    >
                      {selectedRule.severity}
                    </span>
                  </div>
                  <CardTitle className="text-base font-bold text-slate-100 mt-2">
                    {selectedRule.rule_name}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Rule Version {selectedRule.version} &bull; Confidence:{" "}
                    {Math.round(selectedRule.confidence * 100)}%
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 p-4 text-xs">
                  <div>
                    <h4 className="font-semibold text-slate-300 mb-1">
                      Description &amp; Threat Objective
                    </h4>
                    <p className="text-slate-400 leading-relaxed">
                      {selectedRule.description}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-300 mb-1">
                      MITRE ATT&amp;CK Mapping
                    </h4>
                    <div className="space-y-1.5 rounded-md border border-slate-800 bg-slate-950/60 p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Tactic:</span>
                        <span className="font-medium text-slate-200">
                          {selectedRule.mitre_tactic}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Technique:</span>
                        <span className="font-medium text-cyan-300">
                          {selectedRule.mitre_technique}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                      <Code2 className="h-3.5 w-3.5 text-emerald-400" />
                      Detection Condition Expression
                    </h4>
                    <pre className="overflow-x-auto rounded-md border border-slate-800/80 bg-slate-950 p-2.5 font-mono text-[11px] text-emerald-300/90 whitespace-pre-wrap">
                      {selectedRule.detection_condition}
                    </pre>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-300 mb-1">
                      Recommended Defensive Action
                    </h4>
                    <p className="rounded-md border border-slate-800 bg-slate-950/50 p-2.5 text-slate-300 leading-relaxed">
                      {selectedRule.recommended_action}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400">Mapped Response Playbook:</span>
                    <Link
                      href={`/playbooks#${selectedRule.playbook_code}`}
                      className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-emerald-400 hover:underline"
                    >
                      {selectedRule.playbook_code}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-slate-800 bg-slate-900/40 p-8 text-center text-slate-500">
                <p>Select a rule from the catalog to inspect details.</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Flagged Detection Findings */}
      {activeTab === "findings" && (
        <Card className="border-slate-800/80 bg-slate-900/60 shadow-lg">
          <CardHeader className="border-b border-slate-800 pb-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-100">
                  Flagged Threat Detections
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Events evaluated against deterministic rules with extracted telemetry evidence and 5-factor risk scoring.
                </CardDescription>
              </div>
              <Badge variant="outline" className="border-slate-700 text-slate-300 text-xs">
                Total Flagged: {filteredFindings.length}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {filteredFindings.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <ShieldCheck className="mx-auto h-10 w-10 text-emerald-500/50 mb-3" />
                <p className="text-base font-semibold text-slate-200">
                  No Flagged Detections Found
                </p>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                  Run a detection scan or ingest synthetic security events to test the deterministic rule engine.
                </p>
                {canMutate && (
                  <Button
                    size="sm"
                    onClick={() => void handleRunScan()}
                    disabled={isScanning}
                    className="mt-4 border border-emerald-500/50 bg-emerald-600 text-white"
                  >
                    Run Detection Scan Now
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-800/70">
                {filteredFindings.map((finding) => (
                  <div
                    key={finding.event_id}
                    className="p-4 transition-colors hover:bg-slate-800/30"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase border ${getSeverityColor(
                            finding.severity
                          )}`}
                        >
                          {finding.severity}
                        </span>
                        <h4 className="font-semibold text-sm text-slate-100">
                          {finding.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <span className="font-mono text-slate-400 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-500" />
                          {formatTimestamp(finding.occurred_at)}
                        </span>
                        <div className="flex items-center gap-1.5 font-mono font-bold">
                          <span className="text-slate-400 text-[11px]">Risk:</span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-xs ${
                              finding.risk_score >= 80
                                ? "bg-red-500/20 text-red-300"
                                : finding.risk_score >= 55
                                ? "bg-orange-500/20 text-orange-300"
                                : finding.risk_score >= 30
                                ? "bg-amber-500/20 text-amber-300"
                                : "bg-emerald-500/20 text-emerald-300"
                            }`}
                          >
                            {Math.round(finding.risk_score)}/100
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Activity className="h-3.5 w-3.5 text-slate-500" />
                        Type: <code className="text-slate-300">{finding.event_type}</code>
                      </span>
                      {finding.source_ip && (
                        <span className="flex items-center gap-1">
                          Source IP: <code className="text-cyan-300">{finding.source_ip}</code>
                        </span>
                      )}
                      {finding.asset_id && (
                        <span className="flex items-center gap-1">
                          <Server className="h-3.5 w-3.5 text-slate-500" />
                          Target Asset: <code className="text-emerald-300">{finding.asset_id}</code>
                        </span>
                      )}
                    </div>

                    {/* Matched Rules Evidence Box */}
                    {finding.detection_reasons.length > 0 && (
                      <div className="mt-3 space-y-2 rounded-md border border-slate-800/90 bg-slate-950/80 p-3 text-xs">
                        <p className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider">
                          Matched Rule Evidence ({finding.detection_reasons.length})
                        </p>
                        {finding.detection_reasons.map((r, idx) => (
                          <div
                            key={idx}
                            className="border-t border-slate-800/60 pt-2 first:border-0 first:pt-0"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-1">
                              <span className="font-mono text-emerald-400 font-bold">
                                {r.rule_id} &mdash; {r.rule_name}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-cyan-300">
                                  {r.mitre_technique}
                                </span>
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] bg-slate-800 text-slate-300"
                                >
                                  Conf: {Math.round(r.confidence * 100)}%
                                </Badge>
                              </div>
                            </div>
                            <p className="mt-1 text-slate-300 text-[11px] italic">
                              &ldquo;{r.reason}&rdquo;
                            </p>
                            <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                              <span>Action: {r.recommended_action}</span>
                              <span className="font-mono text-emerald-300">
                                {r.playbook_code}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Multi-Factor Correlation Clusters */}
      {activeTab === "clusters" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Clusters List (Left 2 Columns) */}
          <div className="space-y-4 lg:col-span-2">
            <div className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3 sm:flex-row sm:items-center sm:justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Network className="h-4 w-4 text-cyan-400" />
                <span>Correlation Time Window:</span>
                <select
                  value={correlationWindow}
                  onChange={(e) => setCorrelationWindow(Number(e.target.value))}
                  className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-200 focus:outline-none"
                >
                  <option value={30}>30 Minutes</option>
                  <option value={60}>60 Minutes (Default)</option>
                  <option value={120}>120 Minutes</option>
                  <option value={240}>240 Minutes</option>
                </select>
              </div>

              {canMutate && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void handleRunCorrelation()}
                  disabled={isCorrelating}
                  className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10"
                >
                  Re-analyze Window
                </Button>
              )}
            </div>

            {clusters.length === 0 ? (
              <Card className="border-slate-800/80 bg-slate-900/40 p-10 text-center text-slate-400">
                <Network className="mx-auto h-10 w-10 text-slate-600 mb-3" />
                <p className="text-base font-semibold text-slate-200">
                  No Active Correlation Clusters Detected
                </p>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                  Correlation clustering requires &ge;2 correlated events sharing a target asset, source IP, or multi-stage attack progression within the active time window.
                </p>
              </Card>
            ) : (
              clusters.map((c) => {
                const isSelected =
                  selectedCluster?.correlation_group_id ===
                  c.correlation_group_id;
                return (
                  <Card
                    key={c.correlation_group_id}
                    onClick={() => setSelectedCluster(c)}
                    className={`cursor-pointer border transition-all ${
                      isSelected
                        ? "border-cyan-500/60 bg-slate-900/90 shadow-lg shadow-cyan-500/5"
                        : "border-slate-800/70 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900/80"
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-cyan-400">
                            {c.correlation_group_id}
                          </span>
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase border ${getSeverityColor(
                              c.highest_severity
                            )}`}
                          >
                            {c.highest_severity}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-slate-400">Peak Risk:</span>
                          <span
                            className={`rounded px-1.5 py-0.5 font-mono font-bold text-xs ${
                              c.risk_score >= 80
                                ? "bg-red-500/20 text-red-300"
                                : c.risk_score >= 55
                                ? "bg-orange-500/20 text-orange-300"
                                : "bg-amber-500/20 text-amber-300"
                            }`}
                          >
                            {Math.round(c.risk_score)}/100
                          </span>
                        </div>
                      </div>

                      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                        {c.asset_tags?.length > 0 && (
                          <span className="rounded bg-slate-800/90 px-2 py-0.5 text-slate-300 border border-slate-700/60 flex items-center gap-1">
                            <Server className="h-3 w-3 text-emerald-400" />
                            Target: {c.asset_tags.join(", ")}
                          </span>
                        )}
                        {c.source_ips?.length > 0 && (
                          <span className="rounded bg-slate-800/90 px-2 py-0.5 text-slate-300 border border-slate-700/60 flex items-center gap-1">
                            <Network className="h-3 w-3 text-cyan-400" />
                            Attacker: {c.source_ips.join(", ")}
                          </span>
                        )}
                        <span className="rounded bg-slate-800/90 px-2 py-0.5 text-slate-300 border border-slate-700/60 flex items-center gap-1">
                          <Layers className="h-3 w-3 text-slate-400" />
                          {c.events_count} Correlated Events
                        </span>
                        {c.event_progression?.length > 1 && (
                          <span className="rounded bg-red-950/40 px-2 py-0.5 text-red-300 border border-red-800/40 font-semibold text-[10px]">
                            Multi-Stage Attack Chain
                          </span>
                        )}
                      </div>

                      <p className="mt-2.5 text-xs text-slate-300 leading-relaxed">
                        {c.correlation_explanation}
                      </p>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Cluster Detail Inspector (Right 1 Column) */}
          <div className="lg:col-span-1">
            {selectedCluster ? (
              <Card className="sticky top-20 border-slate-800 bg-slate-900/90 shadow-xl">
                <CardHeader className="border-b border-slate-800 pb-3">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className="border-cyan-500/40 bg-cyan-500/10 font-mono text-cyan-400 text-xs"
                    >
                      {selectedCluster.correlation_group_id}
                    </Badge>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase border ${getSeverityColor(
                        selectedCluster.highest_severity
                      )}`}
                    >
                      {selectedCluster.highest_severity}
                    </span>
                  </div>
                  <CardTitle className="text-base font-bold text-slate-100 mt-2">
                    Cluster Threat Intelligence
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    {selectedCluster.events_count} events correlated &bull; Peak Score:{" "}
                    {Math.round(selectedCluster.risk_score)}/100
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 p-4 text-xs">
                  <div>
                    <h4 className="font-semibold text-slate-300 mb-1">
                      Correlation Explanation
                    </h4>
                    <p className="rounded-md border border-slate-800 bg-slate-950/60 p-2.5 text-slate-300 leading-relaxed">
                      {selectedCluster.correlation_explanation}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-300 mb-1">
                      Correlation Vectors
                    </h4>
                    <div className="space-y-1.5 rounded-md border border-slate-800 bg-slate-950/60 p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Shared Asset:</span>
                        <span className="font-mono text-emerald-300">
                          {selectedCluster.asset_tags?.join(", ") || "N/A (Multi-Target)"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Source IP:</span>
                        <span className="font-mono text-cyan-300">
                          {selectedCluster.source_ips?.join(", ") || "N/A (Distributed)"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Attack Progression:</span>
                        <span
                          className={`font-semibold ${
                            selectedCluster.event_progression?.length > 1
                              ? "text-red-400"
                              : "text-slate-300"
                          }`}
                        >
                          {selectedCluster.event_progression?.length > 1
                            ? `${selectedCluster.event_progression.length} Stages`
                            : "Single Stage Burst"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedCluster.events?.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-slate-300 mb-1">
                        Correlated Events ({selectedCluster.events.length})
                      </h4>
                      <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-md border border-slate-800 bg-slate-950 p-2">
                        {selectedCluster.events.map((ev) => (
                          <div
                            key={ev.id}
                            className="rounded border border-slate-800/80 bg-slate-900/60 p-1.5 text-[11px]"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-slate-200 truncate">
                                {ev.title}
                              </span>
                              <span
                                className={`rounded px-1 py-0.2 text-[9px] uppercase border ${getSeverityColor(
                                  ev.severity
                                )}`}
                              >
                                {ev.severity}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                              <span>Type: {ev.event_type}</span>
                              <span className="font-mono text-emerald-400">
                                Risk: {Math.round(ev.risk_score)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400">Case Workflow:</span>
                    <Link
                      href="/incidents"
                      className="inline-flex items-center gap-1 font-semibold text-emerald-400 hover:underline"
                    >
                      Investigate in Incidents
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-slate-800 bg-slate-900/40 p-8 text-center text-slate-500">
                <p>Select a correlation cluster to inspect root causes.</p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
