"use client";

import React, { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";
import DocumentCard from "@/components/dashboard/DocumentCard";
import UploadModal from "@/components/dashboard/UploadModal";
import PermissionModal from "@/components/permissions/PermissionModal";
import ReplaceModal from "@/components/dashboard/ReplaceModal";
import { Plus, Search, FileText } from "lucide-react";
import { SessionUser } from "@/types";

export default function DocumentsManagementPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedDocForPermission, setSelectedDocForPermission] = useState<any | null>(null);
  const [selectedDocForReplace, setSelectedDocForReplace] = useState<any | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const userRes = await fetch("/api/auth/me");
      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData.user);
      }

      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (e) {
      console.error("Fetch documents error", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleStatusToggle = async (id: string, newStatus: "ACTIVE" | "DISABLED") => {
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchDocuments();
      }
    } catch (e) {
      console.error("Status toggle error", e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchDocuments();
      }
    } catch (e) {
      console.error("Delete error", e);
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.description && doc.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFilter =
      filterStatus === "ALL" ||
      (filterStatus === "ACTIVE" && doc.status === "ACTIVE") ||
      (filterStatus === "DISABLED" && doc.status === "DISABLED");

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-primary">
              All Assignment Documents
            </h1>
            <p className="text-xs text-secondary-muted mt-1">
              Manage uploaded assignment files, control student authorization, and review status.
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

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-lg border border-border shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-secondary-muted absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assignments by title..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded border border-border focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent bg-background"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary-muted">
              Filter:
            </span>
            <div className="inline-flex rounded border border-border p-0.5 bg-background text-xs">
              <button
                onClick={() => setFilterStatus("ALL")}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  filterStatus === "ALL"
                    ? "bg-white text-primary shadow-xs"
                    : "text-secondary hover:text-primary"
                }`}
              >
                All ({documents.length})
              </button>
              <button
                onClick={() => setFilterStatus("ACTIVE")}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  filterStatus === "ACTIVE"
                    ? "bg-white text-primary shadow-xs"
                    : "text-secondary hover:text-primary"
                }`}
              >
                Active ({documents.filter((d) => d.status === "ACTIVE").length})
              </button>
              <button
                onClick={() => setFilterStatus("DISABLED")}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  filterStatus === "DISABLED"
                    ? "bg-white text-primary shadow-xs"
                    : "text-secondary hover:text-primary"
                }`}
              >
                Disabled ({documents.filter((d) => d.status === "DISABLED").length})
              </button>
            </div>
          </div>
        </div>

        {/* Documents Grid */}
        {loading ? (
          <div className="p-12 text-center bg-white rounded-lg border border-border">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <div className="text-xs text-secondary-muted">Loading documents...</div>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-lg border border-border">
            <FileText className="w-10 h-10 text-secondary-muted mx-auto mb-3 opacity-40" />
            <h3 className="text-base font-semibold text-primary">No matching documents</h3>
            <p className="text-xs text-secondary-muted mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No assignments match "${searchQuery}". Try a different keyword.`
                : "No assignment documents have been uploaded yet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDocs.map((doc) => (
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
      </main>

      {/* Modals */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={fetchDocuments}
      />

      {selectedDocForPermission && (
        <PermissionModal
          documentId={selectedDocForPermission.id}
          documentTitle={selectedDocForPermission.title}
          isOpen={!!selectedDocForPermission}
          onClose={() => setSelectedDocForPermission(null)}
          onPermissionChanged={fetchDocuments}
        />
      )}

      {selectedDocForReplace && (
        <ReplaceModal
          documentId={selectedDocForReplace.id}
          documentTitle={selectedDocForReplace.title}
          isOpen={!!selectedDocForReplace}
          onClose={() => setSelectedDocForReplace(null)}
          onSuccess={fetchDocuments}
        />
      )}

      <Footer />
    </div>
  );
}
