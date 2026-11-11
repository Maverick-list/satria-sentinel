"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  BookOpenCheck,
  CheckCircle2,
  Clock,
  Link2,
  MessageSquarePlus,
  Plus,
  RefreshCw,
  Search,
  Server,
  ShieldAlert,
  UserCheck,
  X,
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
  addIncidentNoteApi,
  assignIncidentApi,
  changeIncidentStatusApi,
  createIncidentApi,
  linkIncidentEventsApi,
  listAssetsApi,
  listIncidentsApi,
  listPlaybooksApi,
  listSecurityEventsApi,
  listUsersApi,
  resolveIncidentApi,
} from "@/services/operational-service";
import type {
  AssetItem,
  AuthUser,
  IncidentItem,
  PlaybookItem,
  SecurityEventItem,
} from "@/types/operational";

export default function IncidentsPage() {
  const { user, isLoading: authLoading, showToast } = useAuth();
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [selectedIncident, setSelectedIncident] =
    useState<IncidentItem | null>(null);
  const [allEvents, setAllEvents] = useState<SecurityEventItem[]>([]);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [assetsById, setAssetsById] = useState<Record<string, AssetItem>>({});
  const [playbooks, setPlaybooks] = useState<PlaybookItem[]>([]);

  // Assignment & Link Event controls
  const [assigneeId, setAssigneeId] = useState("");
  const [extraEventId, setExtraEventId] = useState("");

  // Create modal states
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSummary, setNewSummary] = useState("");
  const [newSeverity, setNewSeverity] = useState("high");
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Investigation note & resolution states
  const [noteText, setNoteText] = useState("");
  const [rootCauseText, setRootCauseText] = useState("");

  const canWrite =
    user?.role === "admin" || user?.role === "security_analyst";

  const loadIncidents = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [resp, evResp, usersResp, assetsResp, pbResp] = await Promise.all([
        listIncidentsApi({
          page,
          pageSize: 10,
          search: search || undefined,
          status: statusFilter || undefined,
          severity: severityFilter || undefined,
        }),
        listSecurityEventsApi({ page: 1, pageSize: 100 }),
        listUsersApi(),
        listAssetsApi({ page: 1, pageSize: 50 }),
        listPlaybooksApi(),
      ]);
      setIncidents(resp.items);
      setTotal(resp.total);
      setAllEvents(evResp.items);
      setUsers(usersResp.items);
      const assetMap: Record<string, AssetItem> = {};
      for (const a of assetsResp.items) {
        assetMap[a.id] = a;
      }
      setAssetsById(assetMap);
      setPlaybooks(pbResp);

      setSelectedIncident((prev) => {
        if (!prev) {
          return resp.items[0] ?? null;
        }
        return resp.items.find((i) => i.id === prev.id) ?? resp.items[0] ?? null;
      });
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to load incidents",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  }, [user, page, search, statusFilter, severityFilter, showToast]);

  useEffect(() => {
    if (!authLoading) {
      void loadIncidents();
    }
  }, [authLoading, loadIncidents]);

  useEffect(() => {
    if (selectedIncident) {
      setAssigneeId(selectedIncident.assigned_to_id ?? user?.id ?? "");
    }
  }, [selectedIncident, user]);

  const usersById = useMemo(() => {
    const map: Record<string, AuthUser> = {};
    for (const u of users) {
      map[u.id] = u;
    }
    return map;
  }, [users]);

  const eventsById = useMemo(() => {
    const map: Record<string, SecurityEventItem> = {};
    for (const e of allEvents) {
      map[e.id] = e;
    }
    return map;
  }, [allEvents]);

  // Derive full SecurityEventItem records, Related Assets, Detection Findings, and Playbook for selectedIncident
  const investigationContext = useMemo(() => {
    if (!selectedIncident) {
      return {
        fullLinkedEvents: [] as SecurityEventItem[],
        relatedAssets: [] as AssetItem[],
        detectionFindings: [] as {
          eventTitle: string;
          rule_id: string;
          rule_name: string;
          mitre_technique: string;
          confidence: number;
          reason: string;
          recommended_action: string;
        }[],
        matchedPlaybook: null as PlaybookItem | null,
      };
    }

    const fullLinkedEvents: SecurityEventItem[] = [];
    const assetSet = new Map<string, AssetItem>();
    const detectionFindings: {
      eventTitle: string;
      rule_id: string;
      rule_name: string;
      mitre_technique: string;
      confidence: number;
      reason: string;
      recommended_action: string;
    }[] = [];

    for (const le of selectedIncident.linked_events) {
      const fullEv = eventsById[le.security_event_id];
      if (fullEv) {
        fullLinkedEvents.push(fullEv);
        if (fullEv.asset_id && assetsById[fullEv.asset_id]) {
          assetSet.set(fullEv.asset_id, assetsById[fullEv.asset_id]);
        }
        for (const r of fullEv.detection_reasons) {
          detectionFindings.push({
            eventTitle: fullEv.title,
            rule_id: r.rule_id,
            rule_name: r.rule_name,
            mitre_technique: r.mitre_technique,
            confidence: r.confidence,
            reason: r.reason,
            recommended_action: r.recommended_action,
          });
        }
      }
    }

    // Match playbook by playbook_id or by dominant indicator type
    let matchedPlaybook =
      playbooks.find((pb) => pb.id === selectedIncident.playbook_id) ?? null;
    if (!matchedPlaybook && playbooks.length > 0) {
      const types = selectedIncident.linked_events.map(
        (e) => e.event_type ?? ""
      );
      if (types.some((t) => t.includes("outbound") || t.includes("exfil"))) {
        matchedPlaybook =
          playbooks.find((pb) => pb.code === "PB-IR-003") ?? playbooks[0];
      } else if (types.some((t) => t.includes("privilege"))) {
        matchedPlaybook =
          playbooks.find((pb) => pb.code === "PB-IR-004") ?? playbooks[0];
      } else if (types.some((t) => t.includes("port_scan"))) {
        matchedPlaybook =
          playbooks.find((pb) => pb.code === "PB-IR-005") ?? playbooks[0];
      } else if (types.some((t) => t.includes("suspicious_login"))) {
        matchedPlaybook =
          playbooks.find((pb) => pb.code === "PB-IR-001") ?? playbooks[0];
      } else if (types.some((t) => t.includes("auth_failure"))) {
        matchedPlaybook =
          playbooks.find((pb) => pb.code === "PB-IR-002") ?? playbooks[0];
      } else {
        matchedPlaybook = playbooks[0];
      }
    }

    return {
      fullLinkedEvents,
      relatedAssets: Array.from(assetSet.values()),
      detectionFindings,
      matchedPlaybook,
    };
  }, [selectedIncident, eventsById, assetsById, playbooks]);

  function openCreateModal() {
    setNewTitle("");
    setNewSummary("");
    setNewSeverity("high");
    setSelectedEventIds([]);
    setCreateOpen(true);
  }

  async function handleCreateIncident(e: FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setIsSaving(true);
    try {
      const created = await createIncidentApi({
        title: newTitle.trim(),
        summary: newSummary.trim() || undefined,
        severity: newSeverity,
        security_event_ids: selectedEventIds,
      });
      showToast(`Incident ${created.incident_number} created.`, "success");
      setCreateOpen(false);
      setSelectedIncident(created);
      await loadIncidents();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to create incident",
        "error"
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusTransition(newStatus: string) {
    if (!selectedIncident) return;
    try {
      const updated = await changeIncidentStatusApi(
        selectedIncident.id,
        newStatus,
        `Status changed to ${newStatus} via Command Center UI`
      );
      setSelectedIncident(updated);
      showToast(
        `Incident ${updated.incident_number} moved to '${newStatus}'.`,
        "success"
      );
      await loadIncidents();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Status update failed",
        "error"
      );
    }
  }

  async function handleAssignAnalyst() {
    if (!selectedIncident || !assigneeId) return;
    try {
      const updated = await assignIncidentApi(selectedIncident.id, assigneeId);
      setSelectedIncident(updated);
      const targetUser = usersById[assigneeId];
      showToast(
        `Incident ${updated.incident_number} assigned to ${targetUser ? `@${targetUser.username}` : "selected analyst"}.`,
        "success"
      );
      await loadIncidents();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to assign analyst",
        "error"
      );
    }
  }

  async function handleLinkExtraEvent() {
    if (!selectedIncident || !extraEventId) return;
    try {
      const updated = await linkIncidentEventsApi(selectedIncident.id, [
        extraEventId,
      ]);
      setSelectedIncident(updated);
      setExtraEventId("");
      showToast("Security event linked to incident.", "success");
      await loadIncidents();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to link security event",
        "error"
      );
    }
  }

  async function handleAddNote(e: FormEvent) {
    e.preventDefault();
    if (!selectedIncident || !noteText.trim()) return;
    try {
      const updated = await addIncidentNoteApi(
        selectedIncident.id,
        noteText.trim()
      );
      setSelectedIncident(updated);
      setNoteText("");
      showToast("Investigation note added to timeline.", "success");
      await loadIncidents();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to add note",
        "error"
      );
    }
  }

  async function handleResolveIncident(e: FormEvent) {
    e.preventDefault();
    if (!selectedIncident || !rootCauseText.trim()) return;
    try {
      const updated = await resolveIncidentApi(
        selectedIncident.id,
        rootCauseText.trim(),
        "recovered"
      );
      setSelectedIncident(updated);
      setRootCauseText("");
      showToast(
        `Incident ${updated.incident_number} marked as recovered.`,
        "success"
      );
      await loadIncidents();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to resolve incident",
        "error"
      );
    }
  }

  function toggleEventSelection(eventId: string) {
    setSelectedEventIds((prev) =>
      prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId]
    );
  }

  const assignedUser = selectedIncident?.assigned_to_id
    ? usersById[selectedIncident.assigned_to_id]
    : null;

  const unlinkedEvents = useMemo(() => {
    if (!selectedIncident) return [];
    const linkedIds = new Set(
      selectedIncident.linked_events.map((le) => le.security_event_id)
    );
    return allEvents.filter((ev) => !linkedIds.has(ev.id));
  }, [selectedIncident, allEvents]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-slate-800/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/15 text-emerald-400">
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1
              data-testid="page-heading"
              className="text-2xl font-bold tracking-tight text-slate-100"
            >
              Incidents & Case Management
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Correlated security incident cases, risk scoring, analyst
              assignment, detection evidence, advisory response playbooks, and
              chronological investigation timeline.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canWrite ? (
            <Button
              size="sm"
              onClick={openCreateModal}
              data-testid="create-incident-btn"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Incident</span>
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadIncidents()}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search by incident number or title..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-md border border-slate-700 bg-slate-950 pl-9 pr-3 py-2 text-xs text-slate-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by Incident Status"
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100"
            >
              <option value="">All Lifecycle Statuses</option>
              <option value="open">Open</option>
              <option value="investigating">Investigating</option>
              <option value="containment">Containment</option>
              <option value="eradication">Eradication</option>
              <option value="recovered">Recovered</option>
              <option value="closed">Closed</option>
            </select>

            <select
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by Incident Severity"
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Incidents List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Incident Cases ({total})</CardTitle>
            <CardDescription>
              Select an incident to inspect evidence, assign analysts, consult
              playbooks, and update timeline.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 text-xs">
            {isLoading ? (
              <p className="py-6 text-center text-slate-400">
                Loading incidents...
              </p>
            ) : incidents.length === 0 ? (
              <p className="py-6 text-center text-slate-400">
                No incidents created yet. Create one or escalate a correlation
                cluster from the Security Events page.
              </p>
            ) : (
              incidents.map((inc) => {
                const assignee = inc.assigned_to_id
                  ? usersById[inc.assigned_to_id]
                  : null;
                return (
                  <div
                    key={inc.id}
                    onClick={() => setSelectedIncident(inc)}
                    data-testid={`incident-card-${inc.incident_number}`}
                    className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                      selectedIncident?.id === inc.id
                        ? "border-emerald-500/50 bg-emerald-950/20"
                        : "border-slate-800 bg-slate-950/60 hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-emerald-400">
                        {inc.incident_number}
                      </span>
                      <Badge
                        variant={
                          inc.risk_level === "critical"
                            ? "destructive"
                            : inc.risk_level === "high"
                            ? "warning"
                            : "default"
                        }
                      >
                        Risk {inc.risk_score}/100 ({inc.severity.toUpperCase()})
                      </Badge>
                    </div>
                    <p className="mt-1 font-semibold text-slate-100">
                      {inc.title}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-400">
                      <span className="uppercase font-mono text-slate-300">
                        Status: {inc.status}
                      </span>
                      <span>
                        {assignee ? `@${assignee.username}` : "Unassigned"} •{" "}
                        {inc.linked_events.length} event(s)
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Incident Investigation & Timeline Workspace */}
        <Card className="lg:col-span-3" data-testid="incident-workspace-panel">
          <CardHeader>
            <CardTitle>Incident Investigation & Timeline</CardTitle>
            <CardDescription>
              End-to-end investigation workspace: risk breakdown, analyst
              assignment, related assets, detection findings, correlation
              evidence, advisory response playbook, and timeline.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs">
            {selectedIncident ? (
              <div className="space-y-5">
                {/* 1. Incident Summary, Severity, Status & Risk Breakdown */}
                <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-emerald-400">
                        {selectedIncident.incident_number}
                      </span>
                      <Badge variant="default" className="uppercase">
                        Severity: {selectedIncident.severity}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="uppercase">
                        {selectedIncident.status}
                      </Badge>
                      <Badge
                        variant={
                          selectedIncident.risk_level === "critical"
                            ? "destructive"
                            : "warning"
                        }
                      >
                        Risk {selectedIncident.risk_score}/100 (
                        {selectedIncident.risk_level.toUpperCase()})
                      </Badge>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-100">
                    {selectedIncident.title}
                  </h3>
                  {selectedIncident.summary ? (
                    <p className="text-slate-300 leading-relaxed">
                      {selectedIncident.summary}
                    </p>
                  ) : null}

                  <div className="grid grid-cols-1 gap-2 border-t border-slate-800/80 pt-2 text-[11px] text-slate-400 sm:grid-cols-2">
                    <div>
                      Detected:{" "}
                      <span className="font-mono text-slate-200">
                        {formatTimestamp(selectedIncident.detected_at)}
                      </span>
                    </div>
                    <div>
                      Resolved:{" "}
                      <span className="font-mono text-slate-200">
                        {selectedIncident.resolved_at
                          ? formatTimestamp(selectedIncident.resolved_at)
                          : "Active / Unresolved"}
                      </span>
                    </div>
                  </div>

                  {selectedIncident.root_cause_notes ? (
                    <div className="rounded border border-emerald-500/30 bg-emerald-950/20 p-2.5 text-[11px] text-emerald-200">
                      <strong>Recorded Root Cause / Resolution Summary:</strong>{" "}
                      {selectedIncident.root_cause_notes}
                    </div>
                  ) : null}

                  {selectedIncident.correlation_explanation ? (
                    <div className="rounded border border-emerald-500/20 bg-emerald-950/15 p-2.5 text-[11px] text-emerald-200">
                      <strong>Correlation Evidence:</strong>{" "}
                      {selectedIncident.correlation_explanation}
                    </div>
                  ) : null}

                  {/* Risk Breakdown Factors */}
                  {selectedIncident.risk_breakdown?.factors ? (
                    <div className="rounded border border-slate-800 bg-slate-900/50 p-2.5 space-y-1">
                      <p className="font-semibold text-slate-200">
                        Incident Risk Score Breakdown (
                        {selectedIncident.risk_score}/100)
                      </p>
                      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 text-[11px]">
                        {selectedIncident.risk_breakdown.factors.map(
                          (f, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between rounded bg-slate-950/70 px-2 py-1"
                            >
                              <span className="text-slate-300">{f.factor}</span>
                              <span className="font-mono text-emerald-400">
                                +{f.points}/{f.weight_max}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* 2. Assigned Analyst & Lifecycle Status Transitions */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="min-w-0 overflow-hidden rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <span className="flex items-center gap-1.5 font-semibold text-slate-200">
                        <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Assigned Analyst</span>
                      </span>
                      <Badge
                        variant="default"
                        data-testid="incident-assignee-badge"
                      >
                        {assignedUser
                          ? `${assignedUser.full_name} (@${assignedUser.username})`
                          : "Unassigned"}
                      </Badge>
                    </div>
                    {canWrite ? (
                      <div className="flex items-center gap-2 pt-1">
                        <select
                          data-testid="incident-assign-select"
                          value={assigneeId}
                          onChange={(e) => setAssigneeId(e.target.value)}
                          className="min-w-0 flex-1 truncate rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-slate-100"
                        >
                          <option value="">Select analyst...</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.full_name} (@{u.username} — {u.role})
                            </option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleAssignAnalyst()}
                          disabled={!assigneeId}
                          data-testid="incident-assign-submit"
                          className="shrink-0"
                        >
                          Assign
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  {canWrite ? (
                    <div className="min-w-0 rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-2">
                      <p className="font-semibold text-slate-200">
                        Transition Incident Status:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {(
                          [
                            "open",
                            "investigating",
                            "containment",
                            "eradication",
                            "recovered",
                            "closed",
                          ] as const
                        ).map((st) => (
                          <Button
                            key={st}
                            size="sm"
                            variant={
                              selectedIncident.status === st
                                ? "default"
                                : "outline"
                            }
                            data-testid={`incident-status-btn-${st}`}
                            onClick={() => void handleStatusTransition(st)}
                          >
                            {st.toUpperCase()}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* 3. Related Assets & Detection Findings */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div
                    data-testid="incident-related-assets"
                    className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-2"
                  >
                    <p className="flex items-center gap-1.5 font-semibold text-slate-200">
                      <Server className="h-3.5 w-3.5 text-emerald-400" />
                      <span>
                        Affected Assets (
                        {investigationContext.relatedAssets.length})
                      </span>
                    </p>
                    {investigationContext.relatedAssets.length === 0 ? (
                      <p className="text-slate-400">
                        No registered assets directly mapped to linked events.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {investigationContext.relatedAssets.map((asset) => (
                          <div
                            key={asset.id}
                            className="flex items-center justify-between rounded border border-slate-800 bg-slate-900/60 px-2.5 py-1.5"
                          >
                            <div>
                              <p className="font-mono font-bold text-emerald-400">
                                {asset.asset_tag} — {asset.name}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                {asset.asset_type} • {asset.environment} • IP:{" "}
                                {asset.ip_address ?? "—"}
                              </p>
                            </div>
                            <Badge
                              variant={
                                asset.criticality === "critical"
                                  ? "destructive"
                                  : "warning"
                              }
                            >
                              {asset.criticality.toUpperCase()}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div
                    data-testid="incident-detection-findings"
                    className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-2"
                  >
                    <p className="flex items-center gap-1.5 font-semibold text-slate-200">
                      <ShieldAlert className="h-3.5 w-3.5 text-emerald-400" />
                      <span>
                        Detection Findings (
                        {investigationContext.detectionFindings.length})
                      </span>
                    </p>
                    {investigationContext.detectionFindings.length === 0 ? (
                      <p className="text-slate-400">
                        No rule-based detection findings recorded on linked
                        events.
                      </p>
                    ) : (
                      <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
                        {investigationContext.detectionFindings.map(
                          (df, idx) => (
                            <div
                              key={idx}
                              className="rounded border border-emerald-500/25 bg-emerald-950/15 p-2 space-y-0.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-bold text-emerald-300">
                                  {df.rule_id} • {df.mitre_technique}
                                </span>
                                <span className="font-mono text-[10px] text-slate-300">
                                  Conf {Math.round(df.confidence * 100)}%
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-200">
                                {df.reason}
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Linked Security Events + Link Additional Event */}
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-slate-200">
                      Correlated Security Events (
                      {selectedIncident.linked_events.length})
                    </p>
                    {canWrite && unlinkedEvents.length > 0 ? (
                      <div className="flex items-center gap-1.5">
                        <select
                          data-testid="incident-link-event-select"
                          value={extraEventId}
                          onChange={(e) => setExtraEventId(e.target.value)}
                          className="max-w-56 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100"
                        >
                          <option value="">
                            + Link additional security event...
                          </option>
                          {unlinkedEvents.map((ev) => (
                            <option key={ev.id} value={ev.id}>
                              [{ev.severity.toUpperCase()}] {ev.title}
                            </option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!extraEventId}
                          onClick={() => void handleLinkExtraEvent()}
                          data-testid="incident-link-event-submit"
                        >
                          <Link2 className="h-3 w-3" />
                          <span>Link</span>
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  {selectedIncident.linked_events.length === 0 ? (
                    <p className="text-slate-400">
                      No events linked to this incident yet.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {selectedIncident.linked_events.map((le) => {
                        const fullEv = eventsById[le.security_event_id];
                        const asset =
                          fullEv?.asset_id && assetsById[fullEv.asset_id]
                            ? assetsById[fullEv.asset_id]
                            : null;
                        return (
                          <div
                            key={le.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-800 bg-slate-900/50 px-3 py-2"
                          >
                            <div>
                              <p className="font-medium text-slate-200">
                                {le.event_title ?? le.security_event_id}
                              </p>
                              <p className="font-mono text-[11px] text-slate-400">
                                {le.event_type} • Source IP:{" "}
                                {le.source_ip ?? "—"}
                                {asset ? ` • Asset: ${asset.asset_tag}` : ""}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {fullEv ? (
                                <Badge variant="default">
                                  Risk {fullEv.risk_score}/100
                                </Badge>
                              ) : null}
                              <Badge variant="secondary">
                                {le.correlation_role}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 5. Relevant Defensive Response Playbook */}
                {investigationContext.matchedPlaybook ? (
                  <div
                    data-testid="incident-playbook-guidance"
                    className="rounded-lg border border-emerald-500/30 bg-emerald-950/15 p-3.5 space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 font-semibold text-emerald-300">
                        <BookOpenCheck className="h-4 w-4" />
                        <span>
                          Recommended Playbook:{" "}
                          {investigationContext.matchedPlaybook.code} —{" "}
                          {investigationContext.matchedPlaybook.name}
                        </span>
                      </span>
                      <Badge variant="secondary">
                        Advisory Only — Human Verified
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      {investigationContext.matchedPlaybook.description}
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {investigationContext.matchedPlaybook.steps_json.map(
                        (st) => (
                          <div
                            key={st.step_number}
                            className="rounded border border-slate-800 bg-slate-950/80 p-2.5 space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-emerald-300">
                                Step {st.step_number}: {st.title}
                              </span>
                              <span className="font-mono text-[10px] uppercase text-slate-400">
                                {st.phase}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-300">
                              {st.instruction}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ) : null}

                {/* 6. Add Note & Resolve Incident Forms */}
                {canWrite ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <form
                      onSubmit={handleAddNote}
                      className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-2"
                    >
                      <p className="flex items-center gap-1.5 font-semibold text-slate-200">
                        <MessageSquarePlus className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Add Investigation Note</span>
                      </p>
                      <textarea
                        rows={2}
                        data-testid="incident-note-input"
                        placeholder="Document triage findings or containment evidence..."
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        className="w-full rounded border border-slate-700 bg-slate-950 p-2 text-slate-100"
                        required
                      />
                      <Button
                        type="submit"
                        size="sm"
                        data-testid="incident-note-submit"
                      >
                        Append Note
                      </Button>
                    </form>

                    <form
                      onSubmit={handleResolveIncident}
                      className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-2"
                    >
                      <p className="flex items-center gap-1.5 font-semibold text-slate-200">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Resolve Incident (Root Cause)</span>
                      </p>
                      <textarea
                        rows={2}
                        data-testid="incident-resolve-input"
                        placeholder="Enter root-cause summary to resolve incident..."
                        value={rootCauseText}
                        onChange={(e) => setRootCauseText(e.target.value)}
                        className="w-full rounded border border-slate-700 bg-slate-950 p-2 text-slate-100"
                        required
                      />
                      <Button
                        type="submit"
                        size="sm"
                        variant="outline"
                        data-testid="incident-resolve-submit"
                      >
                        Mark Recovered
                      </Button>
                    </form>
                  </div>
                ) : null}

                {/* 7. Chronological Timeline */}
                <div>
                  <p className="flex items-center gap-1.5 font-semibold text-slate-200">
                    <Clock className="h-3.5 w-3.5 text-emerald-400" />
                    <span>
                      Chronological Investigation Timeline (
                      {selectedIncident.timeline_json.length})
                    </span>
                  </p>
                  <div
                    data-testid="incident-timeline-list"
                    className="mt-2 space-y-2 border-l-2 border-emerald-500/40 pl-3"
                  >
                    {selectedIncident.timeline_json.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded border border-slate-800 bg-slate-950/60 p-2.5"
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="font-mono text-emerald-400">
                            @{entry.actor_username} • {entry.entry_type}
                          </span>
                          <span>{formatTimestamp(entry.timestamp)}</span>
                        </div>
                        <p className="mt-1 font-medium text-slate-200">
                          {entry.title}
                        </p>
                        {entry.notes ? (
                          <p className="mt-0.5 text-slate-400">{entry.notes}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="py-10 text-center text-slate-400">
                Select an incident from the left column to inspect or manage its
                workflow.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Incident Modal */}
      {createOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-lg rounded-xl border border-emerald-500/40 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-100">
                Create New Security Incident
              </h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={handleCreateIncident}
              className="mt-4 space-y-3 text-xs"
            >
              <div>
                <label className="block font-medium text-slate-300">
                  Incident Title *
                </label>
                <input
                  data-testid="new-incident-title"
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Compromised Service Account on AST-IAM-001"
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300">
                  Severity
                </label>
                <select
                  data-testid="new-incident-severity"
                  value={newSeverity}
                  onChange={(e) => setNewSeverity(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-300">
                  Executive Summary
                </label>
                <textarea
                  data-testid="new-incident-summary"
                  rows={2}
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2 text-slate-100"
                />
              </div>

              {allEvents.length > 0 ? (
                <div>
                  <label className="block font-medium text-slate-300">
                    Link Security Events (Optional)
                  </label>
                  <div className="mt-1 max-h-36 space-y-1 overflow-y-auto rounded border border-slate-800 bg-slate-950 p-2">
                    {allEvents.map((ev) => (
                      <label
                        key={ev.id}
                        className="flex items-center gap-2 text-[11px] text-slate-300"
                      >
                        <input
                          type="checkbox"
                          checked={selectedEventIds.includes(ev.id)}
                          onChange={() => toggleEventSelection(ev.id)}
                        />
                        <span className="truncate">
                          [{ev.severity.toUpperCase()}] {ev.title}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="flex justify-end gap-2 pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSaving}
                  data-testid="new-incident-submit"
                >
                  {isSaving ? "Creating..." : "Create Incident"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
