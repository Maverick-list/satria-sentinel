"use client";

import { useState, type FormEvent } from "react";
import { KeyRound, LogOut, Menu, Shield, Terminal, UserCheck, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { useAuth } from "@/features/auth/auth-context";

export function TopHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("SatriaAdmin#2026");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user, login, logout } = useAuth();

  async function handleLoginSubmit(e: FormEvent) {
    e.preventDefault();
    setLoginError(null);
    if (!username.trim() || password.length < 6) {
      setLoginError("Username and password (min 6 chars) are required.");
      return;
    }
    setIsSubmitting(true);
    try {
      await login(username.trim(), password);
      setLoginModalOpen(false);
    } catch (err) {
      setLoginError(
        err instanceof Error ? err.message : "Authentication failed."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function fillDemoPreset(roleUser: "admin" | "analyst" | "viewer") {
    setUsername(roleUser);
    if (roleUser === "admin") setPassword("SatriaAdmin#2026");
    if (roleUser === "analyst") setPassword("SatriaAnalyst#2026");
    if (roleUser === "viewer") setPassword("SatriaViewer#2026");
    setLoginError(null);
  }

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
              SATRIA-SOC // PHASE-2-SECURITY-ENGINE
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {user ? (
            <>
              <div
                data-testid="active-user-indicator"
                className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs"
              >
                <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span className="font-semibold text-slate-100">
                  {user.username}
                </span>
                <Badge
                  variant="default"
                  data-testid="active-role-badge"
                  className="font-mono text-[10px] uppercase"
                >
                  {user.role}
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                data-testid="open-login-modal-btn"
                onClick={() => setLoginModalOpen(true)}
              >
                <KeyRound className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Switch Role</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                data-testid="logout-btn"
                onClick={() => void logout()}
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </>
          ) : (
            <Button
              variant="default"
              size="sm"
              data-testid="open-login-modal-btn"
              onClick={() => setLoginModalOpen(true)}
            >
              <Shield className="h-3.5 w-3.5" />
              <span>Operator Login</span>
            </Button>
          )}
        </div>
      </header>

      {/* Mobile Drawer */}
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

      {/* Login & Role Switcher Modal */}
      {loginModalOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-xl border border-emerald-500/40 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-400" />
                <h2
                  id="login-modal-title"
                  className="text-base font-bold text-slate-100"
                >
                  SATRIA SENTINEL Operator Login
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setLoginModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4">
              <p className="text-xs text-slate-400">
                Quick Hackathon Evaluation Role Presets:
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  data-testid="preset-admin-btn"
                  onClick={() => fillDemoPreset("admin")}
                >
                  Admin
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  data-testid="preset-analyst-btn"
                  onClick={() => fillDemoPreset("analyst")}
                >
                  Analyst
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  data-testid="preset-viewer-btn"
                  onClick={() => fillDemoPreset("viewer")}
                >
                  Viewer
                </Button>
              </div>
            </div>

            <form onSubmit={handleLoginSubmit} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="login-username"
                  className="block text-xs font-medium text-slate-300"
                >
                  Username
                </label>
                <input
                  id="login-username"
                  data-testid="login-username-input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-medium text-slate-300"
                >
                  Password
                </label>
                <input
                  id="login-password"
                  data-testid="login-password-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>

              {loginError ? (
                <p
                  data-testid="login-error-message"
                  className="rounded border border-rose-500/40 bg-rose-950/40 p-2 text-xs text-rose-200"
                >
                  {loginError}
                </p>
              ) : null}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setLoginModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  data-testid="login-submit-btn"
                >
                  {isSubmitting ? "Authenticating..." : "Sign In"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
