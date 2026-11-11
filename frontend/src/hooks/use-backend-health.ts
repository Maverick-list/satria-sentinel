"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchBackendHealth } from "@/services/health-service";
import type { HealthCheckResponse } from "@/types/api";

export interface UseBackendHealthResult {
  data: HealthCheckResponse | null;
  isLoading: boolean;
  error: string | null;
  lastCheckedAt: string | null;
  refresh: () => Promise<void>;
}

export function useBackendHealth(): UseBackendHealthResult {
  const [data, setData] = useState<HealthCheckResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchBackendHealth(true);
      setData(response);
      setLastCheckedAt(new Date().toISOString());
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to reach SATRIA SENTINEL backend API.";
      setError(message);
      setData(null);
      setLastCheckedAt(new Date().toISOString());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    data,
    isLoading,
    error,
    lastCheckedAt,
    refresh,
  };
}
