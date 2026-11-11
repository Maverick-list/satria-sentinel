"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpenCheck, CheckSquare, ShieldCheck } from "lucide-react";
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
import {
  listPlaybooksApi,
  recommendPlaybookApi,
} from "@/services/operational-service";
import type { PlaybookItem } from "@/types/operational";

export default function PlaybooksPage() {
  const { user, isLoading: authLoading, showToast } = useAuth();
  const [playbooks, setPlaybooks] = useState<PlaybookItem[]>([]);
  const [selectedPlaybook, setSelectedPlaybook] =
    useState<PlaybookItem | null>(null);
  const [incidentType, setIncidentType] = useState("account_compromise");
  const [isLoading, setIsLoading] = useState(true);

  const loadPlaybooks = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const list = await listPlaybooksApi();
      setPlaybooks(list);
      setSelectedPlaybook((prev) => prev ?? list[0] ?? null);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to load playbooks",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    if (!authLoading) {
      void loadPlaybooks();
    }
  }, [authLoading, loadPlaybooks]);

  async function handleRecommend() {
    try {
      const res = await recommendPlaybookApi(incidentType);
      if (res.recommended_playbook) {
        setSelectedPlaybook(res.recommended_playbook);
        showToast(
          `Recommended Playbook ${res.recommended_playbook.code} for '${incidentType}'.`,
          "info"
        );
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Recommendation lookup failed",
        "error"
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-slate-800/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/15 text-emerald-400">
            <BookOpenCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1
              data-testid="page-heading"
              className="text-2xl font-bold tracking-tight text-slate-100"
            >
              Response Playbooks
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Advisory defensive response checklists for containment,
              eradication, and recovery.
            </p>
          </div>
        </div>
        <Badge variant="default" className="gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Advisory Only — Human Verified Execution</span>
        </Badge>
      </div>

      {/* Playbook Recommender Bar */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs">
            <div>
              <p className="font-semibold text-slate-200">
                Incident Type Playbook Matcher
              </p>
              <p className="text-slate-400">
                Select an observed threat indicator to highlight the recommended
                defensive procedure.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                data-testid="playbook-recommend-select"
                value={incidentType}
                onChange={(e) => setIncidentType(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              >
                <option value="account_compromise">
                  Account Compromise / Suspicious Login
                </option>
                <option value="brute_force">
                  Brute-Force Authentication Indicators
                </option>
                <option value="suspicious_outbound">
                  Suspicious Outbound / Exfiltration
                </option>
                <option value="privilege_escalation">
                  Unauthorized Privilege Escalation
                </option>
                <option value="port_scanning">
                  Port Scanning / Network Reconnaissance
                </option>
              </select>
              <Button
                size="sm"
                onClick={() => void handleRecommend()}
                data-testid="playbook-recommend-btn"
              >
                Match Playbook
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Playbooks Catalog ({playbooks.length})</CardTitle>
            <CardDescription>
              Standardized SOPs versioned in PostgreSQL.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 text-xs">
            {isLoading ? (
              <p className="py-6 text-center text-slate-400">
                Loading playbooks...
              </p>
            ) : (
              playbooks.map((pb) => (
                <div
                  key={pb.id}
                  onClick={() => setSelectedPlaybook(pb)}
                  data-testid={`playbook-item-${pb.code}`}
                  className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                    selectedPlaybook?.id === pb.id
                      ? "border-emerald-500/50 bg-emerald-950/25"
                      : "border-slate-800 bg-slate-950/60 hover:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-emerald-400">
                      {pb.code}
                    </span>
                    <Badge variant="secondary">v{pb.version}</Badge>
                  </div>
                  <p className="mt-1 font-semibold text-slate-100">{pb.name}</p>
                  <p className="mt-1 font-mono text-[11px] uppercase text-slate-400">
                    Category: {pb.category} • Target: {pb.target_severity}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {selectedPlaybook
                ? `${selectedPlaybook.code} — ${selectedPlaybook.name}`
                : "Playbook Procedure"}
            </CardTitle>
            <CardDescription>
              {selectedPlaybook?.description ??
                "Select a playbook to view its defensive checklist."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="rounded-lg border border-amber-500/30 bg-amber-950/15 p-3 text-[11px] text-amber-200">
              <strong>Operational Safety Guardrail:</strong> Playbooks in SATRIA
              SENTINEL provide structured defensive recommendations only. No
              automated firewall blocking, host shutdown, or external system
              modifications are executed automatically.
            </div>

            {selectedPlaybook ? (
              <div
                data-testid="playbook-steps-list"
                className="space-y-3 pt-1"
              >
                {selectedPlaybook.steps_json.map((step) => (
                  <div
                    key={step.step_number}
                    className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 font-semibold text-emerald-300">
                        <CheckSquare className="h-4 w-4" />
                        <span>
                          Step {step.step_number}: {step.title}
                        </span>
                      </span>
                      <Badge variant="default">{step.phase}</Badge>
                    </div>
                    <p className="text-slate-200 leading-relaxed">
                      {step.instruction}
                    </p>
                    <p className="font-mono text-[11px] text-slate-400">
                      Verification Criteria: {step.verification}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
