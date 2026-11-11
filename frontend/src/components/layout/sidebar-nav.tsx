"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { COMMAND_CENTER_NAV_ITEMS } from "@/features/navigation/nav-config";
import { cn } from "@/lib/utils";

interface SidebarNavProps {
  onNavigate?: () => void;
}

export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <aside
      aria-label="Primary Command Center Navigation"
      className="flex h-full w-64 flex-col border-r border-slate-800/90 bg-slate-950/95 text-slate-200"
    >
      <div className="flex items-center gap-3 border-b border-slate-800/80 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-500/40 bg-emerald-500/15 text-emerald-400">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-bold tracking-wider text-slate-100">
            SATRIA SENTINEL
          </p>
          <p className="text-[11px] font-medium text-emerald-400/90">
            DEFENSIVE COMMAND CENTER
          </p>
        </div>
      </div>

      <div className="px-4 pt-4 pb-2">
        <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Operations Modules
        </p>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-1">
        {COMMAND_CENTER_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              data-testid={`nav-link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
              className={cn(
                "group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "border border-emerald-500/35 bg-emerald-500/15 text-emerald-300"
                  : "border border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-100"
              )}
            >
              <span className="flex items-center gap-3">
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isActive
                      ? "text-emerald-400"
                      : "text-slate-400 group-hover:text-emerald-400"
                  )}
                  aria-hidden="true"
                />
                <span>{item.title}</span>
              </span>
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                  isActive
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-slate-900 text-slate-500"
                )}
              >
                {item.badgeText}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800/80 p-4">
        <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
          <p className="text-xs font-semibold text-slate-200">
            Phase 1 Foundation
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
            Kartika Cyber Hackathon 2026 — Defensive Architecture Baseline.
          </p>
        </div>
      </div>
    </aside>
  );
}
