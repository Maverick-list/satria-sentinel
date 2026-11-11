"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  AUTH_TOKEN_STORAGE_KEY,
  AUTH_USER_STORAGE_KEY,
} from "@/services/api-client";
import { getMeApi, loginApi, logoutApi } from "@/services/operational-service";
import type { AuthUser } from "@/types/operational";

export interface ToastMessage {
  id: string;
  message: string;
  variant: "success" | "error" | "info";
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  showToast: (
    message: string,
    variant?: "success" | "error" | "info"
  ) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const DEMO_PREFIX =
  process.env.NEXT_PUBLIC_DEMO_ACCESS_PREFIX || "Satria";
const DEMO_SUFFIX =
  process.env.NEXT_PUBLIC_DEMO_ACCESS_SUFFIX || "#2026";

export function getDemoRolePassphrase(
  roleLabel: "Admin" | "Analyst" | "Viewer"
): string {
  return `${DEMO_PREFIX}${roleLabel}${DEMO_SUFFIX}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (
      message: string,
      variant: "success" | "error" | "info" = "info"
    ) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  useEffect(() => {
    let active = true;
    async function restoreSession() {
      setIsLoading(true);
      try {
        const storedToken = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
        if (storedToken) {
          const me = await getMeApi();
          if (active) {
            setUser(me);
            window.localStorage.setItem(
              AUTH_USER_STORAGE_KEY,
              JSON.stringify(me)
            );
          }
        } else {
          // Auto-bootstrap default analyst session on first visit for smooth hackathon demo
          const resp = await loginApi("admin", getDemoRolePassphrase("Admin"));
          window.localStorage.setItem(
            AUTH_TOKEN_STORAGE_KEY,
            resp.access_token
          );
          window.localStorage.setItem(
            AUTH_USER_STORAGE_KEY,
            JSON.stringify(resp.user)
          );
          if (active) {
            setUser(resp.user);
          }
        }
      } catch {
        window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }
    void restoreSession();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const resp = await loginApi(username, password);
      window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, resp.access_token);
      window.localStorage.setItem(
        AUTH_USER_STORAGE_KEY,
        JSON.stringify(resp.user)
      );
      setUser(resp.user);
      showToast(
        `Authenticated as ${resp.user.username} (${resp.user.role})`,
        "success"
      );
    },
    [showToast]
  );

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } catch {
      // Ignore if token was already expired
    } finally {
      window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
      setUser(null);
      showToast("Session logged out and token revoked.", "info");
    }
  }, [showToast]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        logout,
        showToast,
      }}
    >
      {children}

      {/* Floating Command Center Toast Feedback */}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            data-testid="toast-notification"
            className={`rounded-lg border px-4 py-3 text-xs font-medium shadow-lg backdrop-blur-md transition-all ${
              t.variant === "success"
                ? "border-emerald-500/50 bg-emerald-950/90 text-emerald-200"
                : t.variant === "error"
                ? "border-rose-500/50 bg-rose-950/90 text-rose-200"
                : "border-slate-700 bg-slate-900/95 text-slate-200"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
