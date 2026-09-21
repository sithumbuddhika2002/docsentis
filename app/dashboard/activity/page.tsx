"use client";

import React, { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";
import ActivityTable from "@/components/dashboard/ActivityTable";
import { RefreshCw, Shield, Download } from "lucide-react";
import { SessionUser } from "@/types";

export default function ActivityLogPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const userRes = await fetch("/api/auth/me");
      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData.user);
      }

      const res = await fetch("/api/activity?limit=150");
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities || []);
      }
    } catch (e) {
      console.error("Fetch activities error", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-accent" />
              <h1 className="text-2xl font-bold tracking-tight text-primary">
                Security & Access Audit Logs
              </h1>
            </div>
            <p className="text-xs text-secondary-muted mt-1">
              Immutable audit history of document uploads, permissions granted/revoked, viewing sessions, and access denials.
            </p>
          </div>

          <button
            onClick={fetchActivities}
            disabled={loading}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white border border-border hover:border-secondary-muted text-primary text-xs font-medium rounded transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-accent" : "text-secondary"}`} />
            <span>Refresh Logs</span>
          </button>
        </div>

        <ActivityTable activities={activities} loading={loading} />
      </main>

      <Footer />
    </div>
  );
}
