"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X, UserPlus, Shield, Copy, Check, Clock, AlertTriangle, Trash2, ExternalLink } from "lucide-react";
import Link from "next/link";

interface PermissionUser {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "REVOKED";
  expiresAt: string;
  createdAt: string;
}

interface PermissionModalProps {
  documentId: string;
  documentTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onPermissionChanged?: () => void;
}

export default function PermissionModal({
  documentId,
  documentTitle,
  isOpen,
  onClose,
  onPermissionChanged,
}: PermissionModalProps) {
  const [permissions, setPermissions] = useState<PermissionUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [granting, setGranting] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Set default expiration to 7 days from now in YYYY-MM-DDTHH:mm format
  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    const isoString = d.toISOString().slice(0, 16);
    setExpiresAt(isoString);
  }, [isOpen]);

  const fetchPermissions = useCallback(async () => {
    if (!documentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/permissions`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load permissions");
      setPermissions(data.permissions || []);
    } catch (err: any) {
      setError(err.message || "Failed to load permissions");
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (isOpen) {
      fetchPermissions();
    }
  }, [isOpen, fetchPermissions]);

  if (!isOpen) return null;

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setGranting(true);
    setError(null);

    try {
      const res = await fetch(`/api/documents/${documentId}/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          expiresAt: new Date(expiresAt).toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to grant permission");

      setEmail("");
      await fetchPermissions();
      if (onPermissionChanged) onPermissionChanged();
    } catch (err: any) {
      setError(err.message || "Failed to grant access");
    } finally {
      setGranting(false);
    }
  };

  const handleRevoke = async (permissionId: string) => {
    setRevokingId(permissionId);
    setError(null);

    try {
      const res = await fetch(`/api/documents/${documentId}/permissions/${permissionId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to revoke access");

      await fetchPermissions();
      if (onPermissionChanged) onPermissionChanged();
    } catch (err: any) {
      setError(err.message || "Failed to revoke access");
    } finally {
      setRevokingId(null);
    }
  };

  const viewerUrl = typeof window !== "undefined" ? `${window.location.origin}/viewer/${documentId}` : `/viewer/${documentId}`;

  const copyViewingLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(viewerUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-primary/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-border shadow-xl max-w-2xl w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-background">
          <div>
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-accent" />
              <h3 className="font-semibold text-primary text-base">Permission Management</h3>
            </div>
            <div className="text-xs text-secondary-muted truncate max-w-md mt-0.5">
              Document: <span className="font-medium text-primary">{documentTitle}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-secondary hover:text-primary transition-colors p-1 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-danger-light border border-danger/30 rounded text-danger-text text-sm flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Secure Private Viewing Link */}
          <div className="p-4 bg-background rounded-lg border border-border space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-secondary">
              Secure Private Viewing Link
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={viewerUrl}
                className="w-full px-3 py-1.5 text-xs font-mono rounded border border-border bg-white text-secondary cursor-text select-all"
              />
              <button
                type="button"
                onClick={copyViewingLink}
                className="px-3 py-1.5 bg-white border border-border hover:border-secondary-muted rounded text-xs font-medium text-primary flex items-center space-x-1.5 transition-colors flex-shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-success" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-secondary" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
              <Link
                href={`/viewer/${documentId}`}
                target="_blank"
                className="p-1.5 bg-white border border-border hover:border-secondary-muted rounded text-xs text-secondary hover:text-primary transition-colors flex-shrink-0"
                title="Preview viewer"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
            <div className="text-[11px] text-secondary-muted">
              🔒 Note: Only authorized users listed below can open this link. Unauthenticated or unauthorized visitors receive an access denied page.
            </div>
          </div>

          {/* Add User Permission Form */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-secondary mb-2 flex items-center space-x-1.5">
              <UserPlus className="w-3.5 h-3.5 text-accent" />
              <span>Grant Access to Student / User</span>
            </div>

            <form onSubmit={handleGrant} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-6">
                <label className="block text-xs text-secondary mb-1">Student Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@university.edu"
                  required
                  disabled={granting}
                  className="w-full px-3 py-2 text-sm rounded border border-border focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent bg-white"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-xs text-secondary mb-1">Access Expiration</label>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  required
                  disabled={granting}
                  className="w-full px-3 py-2 text-sm rounded border border-border focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent bg-white"
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={granting || !email.trim()}
                  className="w-full py-2 px-3 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded transition-colors disabled:opacity-50 flex items-center justify-center space-x-1.5"
                >
                  {granting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Grant</span>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Authorized Users List */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-secondary mb-2 flex items-center justify-between">
              <span>Authorized Users ({permissions.length})</span>
              {loading && <span className="text-[11px] text-secondary-muted">Refreshing...</span>}
            </div>

            <div className="border border-border rounded-lg overflow-hidden">
              {permissions.length === 0 ? (
                <div className="p-8 text-center bg-background">
                  <Shield className="w-8 h-8 text-secondary-muted mx-auto mb-2 opacity-50" />
                  <div className="text-sm font-medium text-primary">No authorized users</div>
                  <div className="text-xs text-secondary-muted mt-0.5">
                    Grant access above to users who need to view this assignment.
                  </div>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto divide-y divide-border">
                  {permissions.map((perm) => (
                    <div
                      key={perm.id}
                      className="p-3.5 flex items-center justify-between hover:bg-background/50 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="text-sm font-medium text-primary flex items-center space-x-2">
                          <span>{perm.userEmail}</span>
                          <span
                            className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                              perm.status === "ACTIVE"
                                ? "bg-success-light text-success-text"
                                : perm.status === "EXPIRING_SOON"
                                ? "bg-warning-light text-warning-text"
                                : perm.status === "EXPIRED"
                                ? "bg-gray-100 text-secondary-muted"
                                : "bg-danger-light text-danger-text"
                            }`}
                          >
                            {perm.status.replace("_", " ")}
                          </span>
                        </div>
                        <div className="text-xs text-secondary-muted flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            Expires: {new Date(perm.expiresAt).toLocaleDateString()} at{" "}
                            {new Date(perm.expiresAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>

                      {perm.status !== "REVOKED" && (
                        <button
                          type="button"
                          onClick={() => handleRevoke(perm.id)}
                          disabled={revokingId === perm.id}
                          className="px-2.5 py-1 text-xs font-medium text-danger hover:bg-danger-light rounded border border-danger/20 transition-colors flex items-center space-x-1"
                        >
                          {revokingId === perm.id ? (
                            <div className="w-3 h-3 border-2 border-danger/30 border-t-danger rounded-full animate-spin" />
                          ) : (
                            <>
                              <Trash2 className="w-3 h-3" />
                              <span>Revoke</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-background flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-sm text-secondary hover:text-primary rounded border border-border hover:bg-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
