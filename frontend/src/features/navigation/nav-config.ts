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
    description: "Command Center overview, live API health, risk & incident summary",
  },
  {
    title: "Assets",
    href: "/assets",
    icon: Server,
    badgeText: "CRUD",
    description: "Digital asset inventory, criticality classification & ownership",
  },
  {
    title: "Security Events",
    href: "/security-events",
    icon: Activity,
    badgeText: "Ingest",
    description: "CSV/JSON log ingestion, synthetic telemetry, detection & correlation",
  },
  {
    title: "Incidents",
    href: "/incidents",
    icon: ShieldAlert,
    badgeText: "Case Mgmt",
    description: "Escalated security cases, risk scoring & timeline investigation",
  },
  {
    title: "Response Playbooks",
    href: "/playbooks",
    icon: BookOpenCheck,
    badgeText: "Advisory",
    description: "Standardized containment, eradication & recovery procedures",
  },
  {
    title: "Audit Logs",
    href: "/audit-logs",
    icon: FileSearch,
    badgeText: "Trail",
    description: "Application-level append-only operator and system audit trail",
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    badgeText: "RBAC",
    description: "Authentication, RBAC role controls & detection rules catalog",
  },
];
