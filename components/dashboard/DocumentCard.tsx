"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Users,
  Eye,
  Shield,
  MoreVertical,
  RefreshCw,
  Power,
  Trash2,
  Lock,
} from "lucide-react";

interface DocumentCardProps {
  document: {
    id: string;
    title: string;
    description?: string;
    fileSize: number;
    pageCount: number;
    status: "ACTIVE" | "DISABLED" | "DELETED";
    createdAt: string;
    activePermissionsCount?: number;
  };
  onManageAccess: (doc: any) => void;
  onReplaceFile: (doc: any) => void;
  onStatusToggle: (id: string, newStatus: "ACTIVE" | "DISABLED") => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function DocumentCard({
  document,
  onManageAccess,
  onReplaceFile,
  onStatusToggle,
  onDelete,
}: DocumentCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const formattedSize = (document.fileSize / (1024 * 1024)).toFixed(2) + " MB";
  const formattedDate = new Date(document.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const handleToggle = async () => {
    setLoading(true);
    setMenuOpen(false);
    try {
      const nextStatus = document.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
      await onStatusToggle(document.id, nextStatus);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${document.title}"? All access permissions will be removed.`)) {
      setLoading(true);
      setMenuOpen(false);
      try {
        await onDelete(document.id);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="bg-white rounded-lg border border-border p-5 shadow-sm hover:border-secondary-muted transition-all relative flex flex-col justify-between">
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="p-2.5 rounded bg-background border border-border text-primary flex-shrink-0">
              <FileText className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h4 className="font-semibold text-primary text-base leading-snug line-clamp-1">
                {document.title}
              </h4>
              <div className="flex items-center space-x-2 mt-1 text-xs text-secondary-muted">
                <span>PDF • {document.pageCount} {document.pageCount === 1 ? "page" : "pages"}</span>
                <span>•</span>
                <span>{formattedSize}</span>
              </div>
            </div>
          </div>

          {/* Status Badge & Menu */}
          <div className="flex items-center space-x-1.5 relative">
            <span
              className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded flex items-center space-x-1 ${
                document.status === "ACTIVE"
                  ? "bg-success-light text-success-text"
                  : "bg-warning-light text-warning-text"
              }`}
            >
              <Lock className="w-3 h-3" />
              <span>{document.status === "ACTIVE" ? "Protected" : "Disabled"}</span>
            </span>

            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1 rounded text-secondary hover:text-primary hover:bg-background transition-colors"
                title="Options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-1 w-44 bg-white rounded-md shadow-lg border border-border py-1 z-30 text-xs">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onReplaceFile(document);
                      }}
                      className="w-full px-3 py-2 text-left text-secondary hover:bg-background flex items-center space-x-2"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-accent" />
                      <span>Replace File</span>
                    </button>
                    <button
                      onClick={handleToggle}
                      className="w-full px-3 py-2 text-left text-secondary hover:bg-background flex items-center space-x-2"
                    >
                      <Power className="w-3.5 h-3.5 text-warning" />
                      <span>{document.status === "ACTIVE" ? "Disable Access" : "Enable Access"}</span>
                    </button>
                    <div className="border-t border-border my-1" />
                    <button
                      onClick={handleDelete}
                      className="w-full px-3 py-2 text-left text-danger hover:bg-danger-light flex items-center space-x-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Document</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Optional Description */}
        {document.description && (
          <p className="mt-3 text-xs text-secondary line-clamp-2 leading-relaxed">
            {document.description}
          </p>
        )}

        {/* Stats Row */}
        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-secondary-muted">
          <div className="flex items-center space-x-1.5">
            <Users className="w-3.5 h-3.5 text-secondary" />
            <span className="font-medium text-primary">
              {document.activePermissionsCount ?? 0}
            </span>
            <span>authorized {document.activePermissionsCount === 1 ? "user" : "users"}</span>
          </div>
          <div>Uploaded {formattedDate}</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 pt-3 border-t border-border flex items-center space-x-2">
        <button
          onClick={() => onManageAccess(document)}
          className="flex-1 py-1.5 px-3 bg-white border border-border hover:border-secondary-muted text-primary text-xs font-medium rounded transition-colors flex items-center justify-center space-x-1.5"
        >
          <Shield className="w-3.5 h-3.5 text-accent" />
          <span>Manage Access</span>
        </button>

        <Link
          href={`/viewer/${document.id}`}
          className="py-1.5 px-3 bg-primary hover:bg-primary-light text-white text-xs font-medium rounded transition-colors flex items-center justify-center space-x-1.5"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>View</span>
        </Link>
      </div>
    </div>
  );
}
