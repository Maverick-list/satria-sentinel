import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BookOpenCheck,
  FileSearch,
  LayoutDashboard,
  Server,
  Settings,
  ShieldAlert,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badgeText: string;
  description: string;
}

export const COMMAND_CENTER_NAV_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    badgeText: "Live",
    description: "Command Center overview, live API health & schema diagnostics",
  },
  {
    title: "Assets",
    href: "/assets",
    icon: Server,
    badgeText: "Schema Ready",
    description: "Digital asset inventory, criticality classification & ownership",
  },
  {
    title: "Security Events",
    href: "/security-events",
    icon: Activity,
    badgeText: "Schema Ready",
    description: "Defensive telemetry ingestion, MITRE mapping & triage queue",
  },
  {
    title: "Incidents",
    href: "/incidents",
    icon: ShieldAlert,
    badgeText: "Schema Ready",
    description: "Escalated security cases, risk scoring & event correlation",
  },
  {
    title: "Response Playbooks",
    href: "/playbooks",
    icon: BookOpenCheck,
    badgeText: "Schema Ready",
    description: "Standardized containment, eradication & recovery procedures",
  },
  {
    title: "Audit Logs",
    href: "/audit-logs",
    icon: FileSearch,
    badgeText: "Schema Ready",
    description: "Immutable-style operator and system audit trail",
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    badgeText: "Config",
    description: "Environment baseline, API endpoint & security controls",
  },
];
