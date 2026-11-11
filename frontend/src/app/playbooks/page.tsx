"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  BookOpenCheck,
  CheckSquare,
  ShieldCheck,
  Target,
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
import {
  listPlaybooksApi,
  recommendPlaybookApi,
} from "@/services/operational-service";
import type { PlaybookItem } from "@/types/operational";

const PLAYBOOK_OPERATIONAL_METADATA: Record<
  string,
  {
    threatScenario: string;
    purpose: string;
    authorizationRequired: string;
    expectedOutcome: string;
  }
> = {
  "PB-IR-001": {
    threatScenario:
      "Suspicious authentication from non-baseline IP/geolocation or successful login immediately following repeated failed login attempts (MITRE T1078 / T1110).",
    purpose:
      "Contain potential identity or session compromise on SSO/IAM gateways without disrupting legitimate enterprise authentication fabric.",
    authorizationRequired:
      "Requires SOC Duty Analyst approval for session revocation; IAM Lead sign-off if federated directory trust tokens must be rotated.",
    expectedOutcome:
      "Active unauthorized tokens are invalidated, MFA hardware challenge is re-established, and lateral identity movement is prevented.",
  },
  "PB-IR-002": {
    threatScenario:
      "Sustained automated credential stuffing or password spraying wave (>= 5 failed attempts within telemetry window) targeting exposed gateways.",
    purpose:
      "Throttle hostile authentication sources at perimeter rate-limiters and prevent account lockout denial-of-service against legitimate operators.",
    authorizationRequired:
      "SOC Analyst authorization for temporary WAF rate-limiting; Network Security Lead approval for permanent BGP/Perimeter blocklists.",
    expectedOutcome:
      "Brute-force volume drops to zero at edge ingress while preserving normal login availability for authorized personnel.",
  },
  "PB-IR-003": {
    threatScenario:
      "High-volume outbound data transfer (>= 50 MB) or unusual vault/table enumeration toward unverified external destinations (MITRE T1048 / T1071).",
    purpose:
      "Halt unauthorized data egress from critical database clusters, preserve volatile socket forensics, and rotate affected service credentials.",
    authorizationRequired:
      "Requires Joint Authorization from Incident Commander and Database Owner before isolating production database egress VLANs.",
    expectedOutcome:
      "Unauthorized outbound data stream is terminated, forensic packet metadata is preserved, and database read-replica access is locked down.",
  },
  "PB-IR-004": {
    threatScenario:
      "Unauthorized sudoers modification, container breakout indicator, or unexpected root/admin group elevation on internal hosts (MITRE T1068 / T1548).",
    purpose:
      "Isolate the affected workload from East-West management subnets, audit host integrity, and revert unauthorized privilege changes.",
    authorizationRequired:
      "Requires Infrastructure Lead and SOC Analyst approval before quarantining production application or SIEM collector nodes.",
    expectedOutcome:
      "Host is isolated from lateral movement paths, unauthorized privilege modifications are eradicated, and clean golden-image state is verified.",
  },
  "PB-IR-005": {
    threatScenario:
      "Lateral or external network port sweep probing >= 15 distinct TCP/UDP ports across protected subnets (MITRE T1046).",
    purpose:
      "Restrict reconnaissance visibility across internal VLANs and verify that no unpatched services were exposed to the scanning source.",
    authorizationRequired:
      "SOC Analyst authorization for internal micro-segmentation ACL updates.",
    expectedOutcome:
      "Reconnaissance source is blocked at subnet boundaries and exposed service attack surface is verified closed.",
  },
};

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

  const activeMeta = selectedPlaybook
    ? PLAYBOOK_OPERATIONAL_METADATA[selectedPlaybook.code] ?? {
        threatScenario: selectedPlaybook.description,
        purpose:
          "Provide structured defensive containment, eradication, and recovery steps.",
        authorizationRequired:
          "Requires SOC Analyst verification and asset owner coordination.",
        expectedOutcome:
          "Threat indicator is contained, verified, and documented in the incident audit trail.",
      }
    : null;

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

        <Card className="lg:col-span-2" data-testid="playbook-detail-panel">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>
                {selectedPlaybook
                  ? `${selectedPlaybook.code} — ${selectedPlaybook.name}`
                  : "Playbook Procedure"}
              </CardTitle>
              {selectedPlaybook ? (
                <div className="flex items-center gap-1.5">
                  <Badge variant="default" className="uppercase">
                    {selectedPlaybook.category}
                  </Badge>
                  <Badge
                    variant={
                      selectedPlaybook.target_severity === "critical"
                        ? "destructive"
                        : "warning"
                    }
                  >
                    Target: {selectedPlaybook.target_severity.toUpperCase()}
                  </Badge>
                </div>
              ) : null}
            </div>
            <CardDescription>
              {selectedPlaybook?.description ??
                "Select a playbook to view its defensive checklist."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            {/* Advisory-Only Warning Banner */}
            <div
              data-testid="playbook-advisory-warning"
              className="flex items-start gap-2.5 rounded-lg border border-amber-500/35 bg-amber-950/20 p-3.5 text-[11px] text-amber-200"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <div>
                <p className="font-semibold text-amber-300">
                  Advisory-Only Operational Guardrail (Human-in-the-Loop)
                </p>
                <p className="mt-0.5 leading-relaxed">
                  SATRIA SENTINEL provides structured defensive recommendations
                  only. It does <strong>not</strong> automatically execute host
                  isolation, firewall rule changes, or account lockouts on
                  external infrastructure. Every action below must be reviewed
                  and executed by an authorized operator.
                </p>
              </div>
            </div>

            {selectedPlaybook && activeMeta ? (
              <>
                {/* Structured Scenario, Purpose, Authorization, and Expected Outcome */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 space-y-1">
                    <p className="font-semibold text-emerald-300">
                      1. Threat Scenario
                    </p>
                    <p className="text-slate-300 leading-relaxed">
                      {activeMeta.threatScenario}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 space-y-1">
                    <p className="font-semibold text-emerald-300">
                      2. Operational Purpose
                    </p>
                    <p className="text-slate-300 leading-relaxed">
                      {activeMeta.purpose}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 space-y-1">
                    <p className="font-semibold text-amber-300">
                      3. Required Authorization & Considerations
                    </p>
                    <p className="text-slate-300 leading-relaxed">
                      {activeMeta.authorizationRequired}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 space-y-1">
                    <p className="flex items-center gap-1.5 font-semibold text-emerald-300">
                      <Target className="h-3.5 w-3.5" />
                      <span>4. Expected Defensive Outcome</span>
                    </p>
                    <p className="text-slate-300 leading-relaxed">
                      {activeMeta.expectedOutcome}
                    </p>
                  </div>
                </div>

                {/* Recommended Defensive Actions */}
                <div>
                  <p className="mb-2 font-semibold text-slate-200">
                    Recommended Defensive Actions (
                    {selectedPlaybook.steps_json.length} Steps)
                  </p>
                  <div
                    data-testid="playbook-steps-list"
                    className="space-y-3"
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
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
