"use client";

import React, { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";
import DocumentCard from "@/components/dashboard/DocumentCard";
import UploadModal from "@/components/dashboard/UploadModal";
import PermissionModal from "@/components/permissions/PermissionModal";
import ReplaceModal from "@/components/dashboard/ReplaceModal";
import ActivityTable from "@/components/dashboard/ActivityTable";
import {
  FileText,
  Users,
  Eye,
  Clock,
  Plus,
  Shield,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { SessionUser } from "@/types";

export default function DashboardPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedDocForPermission, setSelectedDocForPermission] = useState<any | null>(null);
  const [selectedDocForReplace, setSelectedDocForReplace] = useState<any | null>(null);

  const fetchData = useCallback(async () => {
    try {
      // Fetch current user
      const userRes = await fetch("/api/auth/me");
      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData.user);
      }

      // Fetch documents
      const docsRes = await fetch("/api/documents");
      if (docsRes.ok) {
        const docsData = await docsRes.json();
        setDocuments(docsData.documents || []);
      }

      // Fetch recent activity
      const actRes = await fetch("/api/activity?limit=5");
      if (actRes.ok) {
        const actData = await actRes.json();
        setActivities(actData.activities || []);
      }
    } catch (e) {
      console.error("Dashboard fetch error", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStatusToggle = async (id: string, newStatus: "ACTIVE" | "DISABLED") => {
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error("Toggle status error", e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error("Delete document error", e);
    }
  };

  // Metrics calculation
  const totalDocuments = documents.length;
  const totalAuthorizedUsers = documents.reduce(
    (acc, curr) => acc + (curr.activePermissionsCount || 0),
    0
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome & Quick Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-primary">
              Instructor Dashboard
            </h1>
            <p className="text-xs text-secondary-muted mt-1">
              Securely manage university assignment documents, monitor student access, and enforce download restrictions.
            </p>
          </div>

          <button
            onClick={() => setIsUploadOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-primary hover:bg-primary-light text-white text-xs font-semibold rounded shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4 text-accent" />
            <span>Upload Assignment</span>
          </button>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-lg border border-border shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary-muted">
                Protected Documents
              </span>
              <div className="p-2 rounded bg-background text-primary">
                <FileText className="w-4 h-4 text-accent" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-primary">{totalDocuments}</div>
            <div className="mt-1 text-[11px] text-secondary-muted">In private protected storage</div>
          </div>

          <div className="bg-white p-5 rounded-lg border border-border shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary-muted">
                Active Permissions
              </span>
              <div className="p-2 rounded bg-background text-primary">
                <Users className="w-4 h-4 text-success" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-primary">{totalAuthorizedUsers}</div>
            <div className="mt-1 text-[11px] text-secondary-muted">Authorized student access grants</div>
          </div>

          <div className="bg-white p-5 rounded-lg border border-border shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary-muted">
                Security Watermark
              </span>
              <div className="p-2 rounded bg-background text-primary">
                <Shield className="w-4 h-4 text-accent" />
              </div>
            </div>
            <div className="mt-2 text-sm font-bold text-primary font-mono uppercase tracking-wider">
              DOCSENTIS ACTIVE
            </div>
            <div className="mt-1 text-[11px] text-secondary-muted">User identity & session overlay</div>
          </div>

          <div className="bg-white p-5 rounded-lg border border-border shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary-muted">
                Revocation Engine
              </span>
              <div className="p-2 rounded bg-background text-primary">
                <Clock className="w-4 h-4 text-warning" />
              </div>
            </div>
            <div className="mt-2 text-sm font-bold text-primary font-mono">
              25s HEARTBEAT
            </div>
            <div className="mt-1 text-[11px] text-secondary-muted">Real-time session invalidation</div>
          </div>
        </div>

        {/* Documents Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-primary">Assignment Documents</h2>
              <p className="text-xs text-secondary-muted">
                Uploaded PDFs with active security controls and authorized viewers
              </p>
            </div>
            {documents.length > 0 && (
              <Link
                href="/dashboard/documents"
                className="text-xs font-semibold text-accent hover:underline flex items-center space-x-1"
              >
                <span>View all documents</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {loading ? (
            <div className="p-12 text-center bg-white rounded-lg border border-border">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <div className="text-xs text-secondary-muted">Loading assignment documents...</div>
            </div>
          ) : documents.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-lg border border-border">
              <FileText className="w-10 h-10 text-secondary-muted mx-auto mb-3 opacity-40" />
              <h3 className="text-base font-semibold text-primary">No documents yet</h3>
              <p className="text-xs text-secondary-muted mt-1 max-w-sm mx-auto">
                Upload your first university assignment to begin securely sharing it with students.
              </p>
              <button
                onClick={() => setIsUploadOpen(true)}
                className="mt-4 inline-flex items-center space-x-2 px-4 py-2 bg-primary text-white text-xs font-medium rounded hover:bg-primary-light transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload First Assignment</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {documents.slice(0, 6).map((doc) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  onManageAccess={(d) => setSelectedDocForPermission(d)}
                  onReplaceFile={(d) => setSelectedDocForReplace(d)}
                  onStatusToggle={handleStatusToggle}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </section>

        {/* Recent Activity Audit Section */}
        <section className="space-y-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-primary">Recent Access Activity</h2>
              <p className="text-xs text-secondary-muted">
                Real-time audit trails of viewing sessions, permission updates, and access denials
              </p>
            </div>
            <Link
              href="/dashboard/activity"
              className="text-xs font-semibold text-accent hover:underline flex items-center space-x-1"
            >
              <span>View full audit log</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <ActivityTable activities={activities} loading={loading} />
        </section>
      </main>

      {/* Modals */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={fetchData}
      />

      {selectedDocForPermission && (
        <PermissionModal
          documentId={selectedDocForPermission.id}
          documentTitle={selectedDocForPermission.title}
          isOpen={!!selectedDocForPermission}
          onClose={() => setSelectedDocForPermission(null)}
          onPermissionChanged={fetchData}
        />
      )}

      {selectedDocForReplace && (
        <ReplaceModal
          documentId={selectedDocForReplace.id}
          documentTitle={selectedDocForReplace.title}
          isOpen={!!selectedDocForReplace}
          onClose={() => setSelectedDocForReplace(null)}
          onSuccess={fetchData}
        />
      )}

      <Footer />
    </div>
  );
}
