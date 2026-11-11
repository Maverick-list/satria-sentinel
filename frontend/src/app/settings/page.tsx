import { Settings, ShieldCheck, Sliders, Terminal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SystemHealthPanel } from "@/features/health/system-health-panel";
import { getApiBaseUrl } from "@/services/api-client";

export default function SettingsPage() {
  const apiBaseUrl = getApiBaseUrl();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-slate-800/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/15 text-emerald-400">
            <Settings className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1
              data-testid="page-heading"
              className="text-2xl font-bold tracking-tight text-slate-100"
            >
              Platform Settings & Security Baseline
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Runtime environment configuration, API integration endpoint, and
              Phase 1 defensive guardrails.
            </p>
          </div>
        </div>
        <Badge variant="default" className="self-start sm:self-center">
          Environment Configured
        </Badge>
      </div>

      <SystemHealthPanel />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-emerald-400" />
              <CardTitle>Frontend Runtime Configuration</CardTitle>
            </div>
            <CardDescription>
              Public environment variables injected safely at build/runtime.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
              <p className="text-slate-400">NEXT_PUBLIC_APP_NAME</p>
              <p className="mt-1 font-mono font-semibold text-slate-100">
                {process.env.NEXT_PUBLIC_APP_NAME || "SATRIA SENTINEL"}
              </p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
              <p className="text-slate-400">NEXT_PUBLIC_API_BASE_URL</p>
              <p className="mt-1 font-mono font-semibold text-emerald-400">
                {apiBaseUrl}
              </p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
              <p className="text-slate-400">Theme Mode</p>
              <p className="mt-1 font-mono text-slate-200">
                Dark Navy & Emerald Command Center (Default Dark)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <CardTitle>Enforced Security Baseline</CardTitle>
            </div>
            <CardDescription>
              Security controls active across Backend, Database, and Frontend.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li className="flex items-start gap-2.5">
                <Sliders className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                <span>
                  <strong>No Secrets in Source Code:</strong> All credentials
                  and URLs are loaded via environment variables (
                  <code className="font-mono text-emerald-300">.env</code> is
                  gitignored; <code className="font-mono text-emerald-300">.env.example</code>{" "}
                  contains safe placeholders).
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Sliders className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                <span>
                  <strong>Zero Stack-Trace Leakage:</strong> FastAPI centralized
                  exception handlers return structured{" "}
                  <code className="font-mono text-emerald-300">request_id</code>{" "}
                  envelopes without internal stack traces.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Sliders className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                <span>
                  <strong>Environment-Restricted CORS:</strong> Allowed origins
                  are parsed strictly from{" "}
                  <code className="font-mono text-emerald-300">CORS_ORIGINS</code>.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Sliders className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                <span>
                  <strong>Defensive HTTP Headers:</strong>{" "}
                  <code className="font-mono text-emerald-300">
                    X-Content-Type-Options: nosniff
                  </code>
                  ,{" "}
                  <code className="font-mono text-emerald-300">
                    X-Frame-Options: DENY
                  </code>
                  , and{" "}
                  <code className="font-mono text-emerald-300">
                    X-Request-ID
                  </code>{" "}
                  correlation.
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
