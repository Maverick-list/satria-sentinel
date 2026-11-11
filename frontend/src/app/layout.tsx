import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "SATRIA SENTINEL — Defensive Cybersecurity Command Center",
  description:
    "Security Asset & Threat Response Intelligence Assistant (Kartika Cyber Hackathon 2026 — Phase 1 Foundation)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#060d1a] text-slate-100">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
