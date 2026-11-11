"use client";

import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import {
  Activity,
  FileUp,
  GitMerge,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
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
  createIncidentApi,
  generateSyntheticTelemetryApi,
  getCorrelationsApi,
  importSecurityLogsApi,
  listSecurityEventsApi,
  runCorrelationsApi,
  runDetectionScanApi,
  updateSecurityEventStatusApi,
} from "@/services/operational-service";
import type {
  CorrelationCluster,
  LogImportSummary,
  SecurityEventItem,
} from "@/types/operational";

const SAMPLE_CSV_TEMPLATE = `asset_tag,event_type,source,severity,title,source_ip,destination_ip,occurred_at,failed_attempts
AST-IAM-001,auth_failure,csv_upload_sensor,high,[SYNTHETIC SIMULATION] Imported SSH Brute Force Wave,198.51.100.75,10.20.1.10,2026-11-11T11:30:00Z,14
AST-IAM-001,suspicious_login,csv_upload_sensor,high,[SYNTHETIC SIMULATION] Imported Post-Brute-Force Login,198.51.100.75,10.20.1.10,2026-11-11T11:33:00Z,0`;

const SAMPLE_JSON_TEMPLATE = JSON.stringify(
  [
    {
      asset_tag: "AST-DB-002",
      event_type: "suspicious_outbound_traffic",
      source: "json_upload_sensor",
      severity: "critical",
      title: "[SYNTHETIC SIMULATION] Imported Anomalous 65MB Egress Stream",
      source_ip: "10.20.2.15",
      destination_ip: "198.51.100.250",
      occurred_at: "2026-11-11T11:40:00Z",
      raw_payload: {
        bytes_out: 68157440,
        destination_port: 8443,
      },
    },
  ],
  null,
  2
);

export default function SecurityEventsPage() {
  const { user, isLoading: authLoading, showToast } = useAuth();
  const [events, setEvents] = useState<SecurityEventItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [selectedEvent, setSelectedEvent] = useState<SecurityEventItem | null>(
    null
  );
  const [clusters, setClusters] = useState<CorrelationCluster[]>([]);

  // Ingestion & Simulation states
  const [selectedScenario, setSelectedScenario] = useState("all_scenarios");
  const [importFormat, setImportFormat] = useState<"csv" | "json">("csv");
  const [importContent, setImportContent] = useState(SAMPLE_CSV_TEMPLATE);
  const [importFilename, setImportFilename] = useState("synthetic_sample.csv");
  const [importResult, setImportResult] = useState<LogImportSummary | null>(
    null
  );
  const [isProcessing, setIsProcessing] = useState(false);

  const canWrite =
    user?.role === "admin" || user?.role === "security_analyst";

  const loadData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [evResp, corrResp] = await Promise.all([
        listSecurityEventsApi({
          page,
          pageSize: 12,
          search: search || undefined,
          severity: severity || undefined,
          status: statusFilter || undefined,
        }),
        getCorrelationsApi(60),
      ]);
      setEvents(evResp.items);
      setTotal(evResp.total);
      setClusters(corrResp.clusters);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to load security events",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  }, [user, page, search, severity, statusFilter, showToast]);

  useEffect(() => {
    if (!authLoading) {
      void loadData();
    }
  }, [authLoading, loadData]);

  async function handleGenerateScenario() {
    setIsProcessing(true);
    try {
      const res = await generateSyntheticTelemetryApi(selectedScenario);
      setImportResult(res.ingestion_summary);
      showToast(
        `Scenario '${selectedScenario}' generated ${res.ingestion_summary.imported_count} synthetic event(s).`,
        "success"
      );
      await loadData();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to generate scenario",
        "error"
      );
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleImportSubmit(e: FormEvent) {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const res = await importSecurityLogsApi({
        format: importFormat,
        content: importContent,
        filename: importFilename,
      });
      setImportResult(res);
      showToast(
        `Imported ${res.imported_count} event(s), skipped ${res.duplicates_skipped} duplicate(s), ${res.failed_count} failed.`,
        res.imported_count > 0 ? "success" : "info"
      );
      await loadData();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Import validation failed",
        "error"
      );
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFilename(file.name);
    if (file.name.toLowerCase().endsWith(".json")) {
      setImportFormat("json");
    } else if (file.name.toLowerCase().endsWith(".csv")) {
      setImportFormat("csv");
    }
    const text = await file.text();
    setImportContent(text);
  }

  async function handleRunEngines() {
    setIsProcessing(true);
    try {
      const det = await runDetectionScanApi();
      const corr = await runCorrelationsApi(60);
      setClusters(corr.clusters);
      showToast(
        `Evaluated ${det.evaluated_events_count} events (${det.flagged_events_count} flagged) & built ${corr.clusters_count} correlation cluster(s).`,
        "success"
      );
      await loadData();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Engine execution failed",
        "error"
      );
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleStatusChange(eventId: string, newStatus: string) {
    try {
      const updated = await updateSecurityEventStatusApi(eventId, newStatus);
      setSelectedEvent(updated);
      showToast(`Event status updated to '${newStatus}'.`, "success");
      await loadData();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to update event status",
        "error"
      );
    }
  }

  async function handleEscalateCluster(cluster: CorrelationCluster) {
    try {
      const inc = await createIncidentApi({
        title: `Escalated Cluster ${cluster.correlation_group_id} (${cluster.event_progression.join(" -> ")})`,
        summary: `Escalated from correlated synthetic telemetry cluster (${cluster.events_count} events).`,
        severity:
          cluster.highest_severity === "informational"
            ? "low"
            : cluster.highest_severity,
        security_event_ids: cluster.events.map((e) => e.id),
        correlation_explanation: cluster.correlation_explanation,
      });
      showToast(
        `Incident ${inc.incident_number} created from cluster ${cluster.correlation_group_id}.`,
        "success"
      );
      await loadData();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to escalate cluster",
        "error"
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-slate-800/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/15 text-emerald-400">
            <Activity className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1
              data-testid="page-heading"
              className="text-2xl font-bold tracking-tight text-slate-100"
            >
              Security Events & Log Ingestion
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              CSV/JSON log ingestion, synthetic telemetry generator, rule-based
              threat detection, and event correlation.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canWrite ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleRunEngines()}
              disabled={isProcessing}
              data-testid="run-detection-correlation-btn"
            >
              <GitMerge className="h-3.5 w-3.5 text-emerald-400" />
              <span>Re-Run Detection & Correlation</span>
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadData()}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* Ingestion & Synthetic Generator Panel */}
      {canWrite ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <CardTitle>Synthetic Security Log Generator</CardTitle>
              </div>
              <CardDescription>
                Generate clearly marked{" "}
                <code className="font-mono text-emerald-300">
                  [SYNTHETIC SIMULATION]
                </code>{" "}
                defensive training telemetry.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-300">
                  Select Simulation Scenario
                </label>
                <div className="mt-1.5 flex gap-2">
                  <select
                    data-testid="synthetic-scenario-select"
                    value={selectedScenario}
                    onChange={(e) => setSelectedScenario(e.target.value)}
                    className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                  >
                    <option value="all_scenarios">
                      All 6 Scenarios (Complete Multi-Stage Pack)
                    </option>
                    <option value="brute_force">
                      1. Multiple Failed Login Attempts (Brute-Force)
                    </option>
                    <option value="suspicious_login">
                      2. Suspicious Login Activity (Post-Brute-Force)
                    </option>
                    <option value="unusual_access">
                      3. Unusual Access Patterns (Vault Enumeration)
                    </option>
                    <option value="port_scanning">
                      4. Port Scanning Indicators (NDR Sweep)
                    </option>
                    <option value="privilege_escalation">
                      5. Privilege Escalation Indicators (Root Elevation)
                    </option>
                    <option value="suspicious_outbound">
                      6. Suspicious Outbound Traffic (84MB Egress)
                    </option>
                  </select>
                  <Button
                    size="sm"
                    onClick={() => void handleGenerateScenario()}
                    disabled={isProcessing}
                    data-testid="generate-scenario-btn"
                  >
                    Generate
                  </Button>
                </div>
              </div>
              <p className="rounded border border-slate-800 bg-slate-950/60 p-2.5 text-[11px] text-slate-400">
                All generated records are tagged with{" "}
                <code className="font-mono text-emerald-300">
                  is_synthetic=true
                </code>{" "}
                and evaluated automatically by the 6 deterministic detection
                rules.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileUp className="h-4 w-4 text-emerald-400" />
                <CardTitle>CSV / JSON Log Ingestion Engine</CardTitle>
              </div>
              <CardDescription>
                Schema validation, input sanitization, SHA-256 duplicate
                detection, and row-level error reporting.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleImportSubmit}
                className="space-y-3 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <select
                      data-testid="import-format-select"
                      value={importFormat}
                      onChange={(e) => {
                        const fmt = e.target.value as "csv" | "json";
                        setImportFormat(fmt);
                        setImportContent(
                          fmt === "csv"
                            ? SAMPLE_CSV_TEMPLATE
                            : SAMPLE_JSON_TEMPLATE
                        );
                        setImportFilename(
                          fmt === "csv"
                            ? "synthetic_sample.csv"
                            : "synthetic_sample.json"
                        );
                      }}
                      className="rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-slate-100"
                    >
                      <option value="csv">CSV Format</option>
                      <option value="json">JSON Format</option>
                    </select>
                    <input
                      type="file"
                      accept=".csv,.json"
                      onChange={(e) => void handleFileUpload(e)}
                      className="text-[11px] text-slate-400 file:mr-2 file:rounded file:border-0 file:bg-slate-800 file:px-2.5 file:py-1 file:text-xs file:text-slate-200"
                    />
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isProcessing}
                    data-testid="import-logs-submit-btn"
                  >
                    Import & Analyze Logs
                  </Button>
                </div>

                <textarea
                  data-testid="import-content-textarea"
                  rows={4}
                  value={importContent}
                  onChange={(e) => setImportContent(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 p-2.5 font-mono text-[11px] text-slate-200 focus:border-emerald-500 focus:outline-none"
                />
              </form>

              {importResult ? (
                <div
                  data-testid="import-summary-box"
                  className="mt-3 rounded-lg border border-emerald-500/30 bg-slate-950/80 p-3 text-xs"
                >
                  <p className="font-semibold text-emerald-300">
                    Ingestion Summary ({importResult.source_format.toUpperCase()}
                    ): Received {importResult.total_received} • Imported{" "}
                    {importResult.imported_count} • Duplicates Skipped{" "}
                    {importResult.duplicates_skipped} • Failed{" "}
                    {importResult.failed_count} • Detections{" "}
                    {importResult.detections_triggered}
                  </p>
                  {importResult.errors.length > 0 ? (
                    <ul className="mt-1.5 space-y-1 text-[11px] text-amber-300">
                      {importResult.errors.slice(0, 3).map((err, i) => (
                        <li key={i}>
                          Row #{err.row_number}: {err.reason}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Filter Bar */}
      <Card>
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search title, source IP, event type, or MITRE technique..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                data-testid="event-search-input"
                className="w-full rounded-md border border-slate-700 bg-slate-950 pl-9 pr-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <select
              value={severity}
              onChange={(e) => {
                setSeverity(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by Severity"
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by Triage Status"
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100"
            >
              <option value="">All Statuses</option>
              <option value="new">New</option>
              <option value="triaged">Triaged</option>
              <option value="linked">Linked</option>
              <option value="false_positive">False Positive</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Events Table + Explainable Inspector */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Security Events Queue ({total})</CardTitle>
            <CardDescription>
              Click any event to inspect matched detection rule reasons and
              0–100 risk score calculation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="py-8 text-center text-xs text-slate-400">
                Loading security events...
              </p>
            ) : events.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">
                No security events found. Use the generator or importer above.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table
                  data-testid="security-events-table"
                  className="w-full text-left text-xs"
                >
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="pb-2.5 pr-3">Event Title</th>
                      <th className="pb-2.5 pr-3">Type / Source IP</th>
                      <th className="pb-2.5 pr-3">Risk (0-100)</th>
                      <th className="pb-2.5 pr-3">Rules Matched</th>
                      <th className="pb-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {events.map((ev) => (
                      <tr
                        key={ev.id}
                        onClick={() => setSelectedEvent(ev)}
                        className="cursor-pointer hover:bg-slate-900/60"
                      >
                        <td className="py-2.5 pr-3 font-medium text-slate-100">
                          <div className="flex items-center gap-1.5">
                            {ev.is_synthetic ? (
                              <Badge
                                variant="secondary"
                                className="text-[10px] font-mono"
                              >
                                SIM
                              </Badge>
                            ) : null}
                            <span>{ev.title}</span>
                          </div>
                        </td>
                        <td className="py-2.5 pr-3 font-mono text-slate-300">
                          <div>{ev.event_type}</div>
                          <div className="text-[11px] text-slate-500">
                            {ev.source_ip ?? "—"}
                          </div>
                        </td>
                        <td className="py-2.5 pr-3">
                          <Badge
                            variant={
                              ev.risk_level === "critical"
                                ? "destructive"
                                : ev.risk_level === "high"
                                ? "warning"
                                : "default"
                            }
                          >
                            {ev.risk_score} ({ev.risk_level})
                          </Badge>
                        </td>
                        <td className="py-2.5 pr-3 font-mono text-emerald-400">
                          {ev.detection_reasons.length > 0
                            ? ev.detection_reasons
                                .map((r) => r.rule_id)
                                .join(", ")
                            : "None"}
                        </td>
                        <td className="py-2.5 uppercase text-slate-300">
                          {ev.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3 text-xs text-slate-400">
              <span>
                Page {page} • Total {total} event(s)
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
                  disabled={page * 12 >= total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Explainable Detection & Risk Inspector */}
        <Card>
          <CardHeader>
            <CardTitle>Detection & Risk Explanation</CardTitle>
            <CardDescription>
              Rule match reasoning, MITRE mapping, and 0–100 score breakdown.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs">
            {selectedEvent ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="default">{selectedEvent.event_type}</Badge>
                    <span className="font-mono text-[11px] text-slate-400">
                      {formatTimestamp(selectedEvent.occurred_at)}
                    </span>
                  </div>
                  <p className="mt-2 font-semibold text-slate-100">
                    {selectedEvent.title}
                  </p>
                  {selectedEvent.description ? (
                    <p className="mt-1 text-slate-400">
                      {selectedEvent.description}
                    </p>
                  ) : null}
                  {selectedEvent.correlation_group_id ? (
                    <p className="mt-2 font-mono text-[11px] text-emerald-400">
                      Correlation Cluster: {selectedEvent.correlation_group_id}
                    </p>
                  ) : null}
                </div>

                {canWrite ? (
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      ["triaged", "false_positive", "archived"] as const
                    ).map((st) => (
                      <Button
                        key={st}
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          void handleStatusChange(selectedEvent.id, st)
                        }
                      >
                        Mark {st.replace("_", " ")}
                      </Button>
                    ))}
                  </div>
                ) : null}

                {/* Detection Rule Reasons */}
                <div>
                  <p className="font-semibold text-slate-200">
                    Matched Detection Rules (
                    {selectedEvent.detection_reasons.length})
                  </p>
                  {selectedEvent.detection_reasons.length === 0 ? (
                    <p className="mt-1 text-slate-400">
                      No detection rules triggered for this event.
                    </p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {selectedEvent.detection_reasons.map((r, i) => (
                        <div
                          key={i}
                          className="rounded border border-emerald-500/30 bg-emerald-950/20 p-2.5 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-emerald-300">
                              {r.rule_id} (v{r.rule_version})
                            </span>
                            <span className="font-mono text-[11px] text-slate-300">
                              Conf: {Math.round(r.confidence * 100)}%
                            </span>
                          </div>
                          <p className="font-medium text-slate-200">
                            {r.rule_name} • {r.mitre_technique}
                          </p>
                          <p className="text-slate-300">
                            <strong>Why flagged:</strong> {r.reason}
                          </p>
                          <p className="text-emerald-300/90">
                            <strong>Recommended Action:</strong>{" "}
                            {r.recommended_action}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Risk Breakdown */}
                <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">
                      Risk Score Calculation
                    </span>
                    <Badge variant="default">
                      {selectedEvent.risk_score} / 100 (
                      {selectedEvent.risk_level.toUpperCase()})
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {selectedEvent.risk_breakdown?.explanation}
                  </p>
                  {selectedEvent.risk_breakdown?.factors ? (
                    <ul className="space-y-1 border-t border-slate-800 pt-2 text-[11px] text-slate-300">
                      {selectedEvent.risk_breakdown.factors.map((f, idx) => (
                        <li key={idx} className="flex justify-between">
                          <span>{f.factor}</span>
                          <span className="font-mono text-emerald-400">
                            +{f.points}/{f.weight_max}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="py-8 text-center text-slate-400">
                Select an event from the table to inspect its detection reasons
                and risk factor breakdown.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Correlated Clusters Escalation Panel */}
      <Card>
        <CardHeader>
          <CardTitle>
            Correlated Event Clusters ({clusters.length})
          </CardTitle>
          <CardDescription>
            Events grouped by shared source IP, target asset, time window, and
            indicator progression (never grouped solely by severity).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clusters.length === 0 ? (
            <p className="text-xs text-slate-400">
              No correlated clusters available yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {clusters.map((cluster) => (
                <div
                  key={cluster.correlation_group_id}
                  className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-xs space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-emerald-400">
                      {cluster.correlation_group_id}
                    </span>
                    <Badge
                      variant={
                        cluster.risk_level === "critical"
                          ? "destructive"
                          : "warning"
                      }
                    >
                      Cluster Risk: {cluster.risk_score}/100 (
                      {cluster.risk_level.toUpperCase()})
                    </Badge>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    {cluster.correlation_explanation}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {cluster.criteria_matched.map((crit) => (
                      <Badge
                        key={crit}
                        variant="secondary"
                        className="text-[10px]"
                      >
                        {crit}
                      </Badge>
                    ))}
                  </div>
                  {canWrite ? (
                    <div className="pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        data-testid={`escalate-cluster-${cluster.correlation_group_id}`}
                        onClick={() => void handleEscalateCluster(cluster)}
                      >
                        <ShieldAlert className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Escalate Cluster to Incident</span>
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
