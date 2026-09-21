"use client";

import React, { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";
import Link from "next/link";
import { FileText, Lock, Eye, Clock, Shield, AlertCircle } from "lucide-react";
import { SessionUser } from "@/types";

export default function StudentDocumentsPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const userRes = await fetch("/api/auth/me");
      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData.user);
      }

      const docsRes = await fetch("/api/documents");
      if (docsRes.ok) {
        const docsData = await docsRes.json();
        setDocuments(docsData.documents || []);
      }
    } catch (e) {
      console.error("Fetch student documents error", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="pb-6 border-b border-border">
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            My Authorized Assignments
          </h1>
          <p className="text-xs text-secondary-muted mt-1">
            Access protected course documents and assignments authorized by your instructors.
          </p>
        </div>

        {/* Security Notice Card */}
        <div className="bg-white p-4 rounded-lg border border-border flex items-start space-x-3 text-xs">
          <div className="p-2 rounded bg-background text-accent flex-shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <span className="font-semibold text-primary">Docsentis Protected Viewing Protocol</span>
            <p className="text-secondary leading-relaxed">
              These assignment documents are protected with dynamic watermarking containing your university identity. Downloading, saving, or unauthorized distribution is restricted and subject to university academic integrity policies.
            </p>
          </div>
        </div>

        {/* Documents Grid */}
        {loading ? (
          <div className="p-12 text-center bg-white rounded-lg border border-border">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <div className="text-xs text-secondary-muted">Loading your authorized assignments...</div>
          </div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-lg border border-border">
            <FileText className="w-10 h-10 text-secondary-muted mx-auto mb-3 opacity-40" />
            <h3 className="text-base font-semibold text-primary">No authorized assignments yet</h3>
            <p className="text-xs text-secondary-muted mt-1 max-w-sm mx-auto">
              When your instructors grant you permission to view an assignment document, it will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {documents.map((doc) => {
              const formattedSize = (doc.fileSize / (1024 * 1024)).toFixed(2) + " MB";
              const expiryDate = doc.permissionExpiresAt ? new Date(doc.permissionExpiresAt) : null;

              return (
                <div
                  key={doc.id}
                  className="bg-white rounded-lg border border-border p-5 shadow-sm hover:border-secondary-muted transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="p-2.5 rounded bg-background border border-border text-primary flex-shrink-0">
                          <FileText className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-primary text-base leading-snug line-clamp-1">
                            {doc.title}
                          </h4>
                          <div className="flex items-center space-x-2 mt-1 text-xs text-secondary-muted">
                            <span>PDF • {doc.pageCount} {doc.pageCount === 1 ? "page" : "pages"}</span>
                            <span>•</span>
                            <span>{formattedSize}</span>
                          </div>
                        </div>
                      </div>

                      <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-success-light text-success-text flex items-center space-x-1">
                        <Lock className="w-3 h-3" />
                        <span>Authorized</span>
                      </span>
                    </div>

                    {doc.description && (
                      <p className="mt-3 text-xs text-secondary line-clamp-2 leading-relaxed">
                        {doc.description}
                      </p>
                    )}

                    {expiryDate && (
                      <div className="mt-4 pt-3 border-t border-border flex items-center space-x-1.5 text-xs text-secondary-muted">
                        <Clock className="w-3.5 h-3.5 text-warning" />
                        <span>
                          Access expires: {expiryDate.toLocaleDateString()} at{" "}
                          {expiryDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 pt-3 border-t border-border">
                    <Link
                      href={`/viewer/${doc.id}`}
                      className="w-full py-2 px-3 bg-primary hover:bg-primary-light text-white text-xs font-semibold rounded transition-colors flex items-center justify-center space-x-2 shadow-sm"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Open in Secure Viewer</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
