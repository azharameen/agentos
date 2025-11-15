"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface MemoryAnalytics {
  totalSessions: number;
  totalMessages: number;
  averageMessagesPerSession: number;
}

export function Memory() {
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState<MemoryAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("http://localhost:3001/memory/analytics");
      if (!response.ok) {
        throw new Error("Failed to fetch memory analytics");
      }
      const data = await response.json();
      setAnalytics(data);
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <div>
      {isLoading && <p>Loading memory analytics...</p>}
      {error && <p className="text-destructive">{error}</p>}
      {!isLoading && !error && analytics && (
        <ul className="space-y-2">
          <li className="text-sm">
            <span className="font-semibold">Total Sessions:</span> {analytics.totalSessions}
          </li>
          <li className="text-sm">
            <span className="font-semibold">Total Messages:</span> {analytics.totalMessages}
          </li>
          <li className="text-sm">
            <span className="font-semibold">Avg. Messages per Session:</span> {analytics.averageMessagesPerSession.toFixed(2)}
          </li>
        </ul>
      )}
    </div>
  );
}
