"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Clock,
  MessageSquarePlus,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
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
  changeIncidentStatusApi,
  createIncidentApi,
  listIncidentsApi,
  listSecurityEventsApi,
  resolveIncidentApi,
} from "@/services/operational-service";
import type { IncidentItem, SecurityEventItem } from "@/types/operational";

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
  const [availableEvents, setAvailableEvents] = useState<SecurityEventItem[]>(
    []
  );

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
      const resp = await listIncidentsApi({
        page,
        pageSize: 10,
        search: search || undefined,
        status: statusFilter || undefined,
        severity: severityFilter || undefined,
      });
      setIncidents(resp.items);
      setTotal(resp.total);
      setSelectedIncident((prev) => {
        if (!prev) {
          return resp.items[0] ?? null;
        }
        return resp.items.find((i) => i.id === prev.id) ?? prev;
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

  async function openCreateModal() {
    setNewTitle("");
    setNewSummary("");
    setNewSeverity("high");
    setSelectedEventIds([]);
    setCreateOpen(true);
    try {
      const evResp = await listSecurityEventsApi({ page: 1, pageSize: 20 });
      setAvailableEvents(evResp.items);
    } catch {
      setAvailableEvents([]);
    }
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
              Correlated security incident cases, risk scoring, lifecycle
              transitions, and investigation timeline.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canWrite ? (
            <Button
              size="sm"
              onClick={() => void openCreateModal()}
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
              Select an incident to manage lifecycle and timeline.
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
              incidents.map((inc) => (
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
                      Risk {inc.risk_score}/100
                    </Badge>
                  </div>
                  <p className="mt-1 font-semibold text-slate-100">
                    {inc.title}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="uppercase font-mono text-slate-300">
                      Status: {inc.status}
                    </span>
                    <span>{inc.linked_events.length} linked event(s)</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Incident Investigation & Timeline Workspace */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Incident Investigation & Timeline</CardTitle>
            <CardDescription>
              Lifecycle status controls, linked indicators, root-cause
              resolution, and chronological audit timeline.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs">
            {selectedIncident ? (
              <div className="space-y-5">
                <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-sm font-bold text-emerald-400">
                      {selectedIncident.incident_number}
                    </span>
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
                    <p className="text-slate-300">{selectedIncident.summary}</p>
                  ) : null}
                  {selectedIncident.correlation_explanation ? (
                    <p className="rounded border border-emerald-500/20 bg-emerald-950/15 p-2 text-[11px] text-emerald-200">
                      <strong>Correlation Context:</strong>{" "}
                      {selectedIncident.correlation_explanation}
                    </p>
                  ) : null}
                </div>

                {/* Status Transitions */}
                {canWrite ? (
                  <div className="space-y-2">
                    <p className="font-semibold text-slate-300">
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

                {/* Linked Events */}
                <div>
                  <p className="font-semibold text-slate-300">
                    Correlated Security Events (
                    {selectedIncident.linked_events.length})
                  </p>
                  {selectedIncident.linked_events.length === 0 ? (
                    <p className="mt-1 text-slate-400">
                      No events linked to this incident yet.
                    </p>
                  ) : (
                    <div className="mt-2 space-y-1.5">
                      {selectedIncident.linked_events.map((le) => (
                        <div
                          key={le.id}
                          className="flex items-center justify-between rounded border border-slate-800 bg-slate-950/60 px-3 py-2"
                        >
                          <div>
                            <p className="font-medium text-slate-200">
                              {le.event_title ?? le.security_event_id}
                            </p>
                            <p className="font-mono text-[11px] text-slate-400">
                              {le.event_type} • Source IP:{" "}
                              {le.source_ip ?? "—"}
                            </p>
                          </div>
                          <Badge variant="secondary">
                            {le.correlation_role}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Note & Resolve Incident Forms */}
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

                {/* Chronological Timeline */}
                <div>
                  <p className="flex items-center gap-1.5 font-semibold text-slate-200">
                    <Clock className="h-3.5 w-3.5 text-emerald-400" />
                    <span>
                      Incident Timeline ({selectedIncident.timeline_json.length}
                      )
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

              {availableEvents.length > 0 ? (
                <div>
                  <label className="block font-medium text-slate-300">
                    Link Security Events (Optional)
                  </label>
                  <div className="mt-1 max-h-36 space-y-1 overflow-y-auto rounded border border-slate-800 bg-slate-950 p-2">
                    {availableEvents.map((ev) => (
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
