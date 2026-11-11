"use client";

import { useState } from "react";
import { Menu, Shield, Terminal, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "@/components/layout/sidebar-nav";

export function TopHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800/90 bg-slate-950/90 px-4 backdrop-blur-md lg:px-8">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="lg:hidden"
            aria-label="Toggle Navigation Menu"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
          >
            {mobileMenuOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </Button>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Terminal className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            <span className="font-mono text-slate-300">
              SATRIA-SOC // PHASE-1-FOUNDATION
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="default" className="hidden sm:inline-flex gap-1.5">
            <Shield className="h-3 w-3 text-emerald-400" />
            <span>Defensive Posture: Baseline Active</span>
          </Badge>
          <Badge variant="secondary" className="font-mono text-[11px]">
            API v1
          </Badge>
        </div>
      </header>

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-50 flex h-full w-64 flex-col">
            <SidebarNav onNavigate={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
