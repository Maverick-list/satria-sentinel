import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BookOpenCheck,
  FileSearch,
  LayoutDashboard,
  Network,
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
    description: "Command Center overview, threat telemetry, risk priority & analytics",
  },
  {
    title: "Assets",
    href: "/assets",
    icon: Server,
    badgeText: "Inventory",
    description: "Digital asset inventory, criticality classification & posture",
  },
  {
    title: "Security Events",
    href: "/security-events",
    icon: Activity,
    badgeText: "Ingest",
    description: "CSV/JSON log ingestion, synthetic telemetry & event explorer",
  },
  {
    title: "Detection & Correlation",
    href: "/detection-correlation",
    icon: Network,
    badgeText: "Engine",
    description: "Deterministic detection rules, flagged findings & multi-factor clusters",
  },
  {
    title: "Incidents",
    href: "/incidents",
    icon: ShieldAlert,
    badgeText: "Triage",
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
