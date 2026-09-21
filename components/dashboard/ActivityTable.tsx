"use client";

import React from "react";
import {
  Shield,
  FileText,
  UserCheck,
  UserX,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Eye,
  Clock,
  Globe,
  Smartphone,
} from "lucide-react";
import { ActivityAction } from "@/types";

interface ActivityItem {
  id: string;
  documentId?: string;
  documentTitle?: string;
  userId?: string;
  userEmail?: string;
  action: ActivityAction;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
  createdAt: string;
}

interface ActivityTableProps {
  activities: ActivityItem[];
  loading?: boolean;
}

export default function ActivityTable({ activities, loading }: ActivityTableProps) {
  const getActionBadge = (action: ActivityAction) => {
    switch (action) {
      case "DOCUMENT_UPLOADED":
        return {
          label: "Document Uploaded",
          color: "bg-primary/10 text-primary border-primary/20",
          icon: FileText,
        };
      case "DOCUMENT_VIEWED":
        return {
          label: "Document Viewed",
          color: "bg-accent-light text-accent border-accent/20",
          icon: Eye,
        };
      case "PERMISSION_GRANTED":
        return {
          label: "Access Granted",
          color: "bg-success-light text-success-text border-success/20",
          icon: UserCheck,
        };
      case "PERMISSION_REVOKED":
        return {
          label: "Access Revoked",
          color: "bg-danger-light text-danger-text border-danger/20",
          icon: UserX,
        };
      case "ACCESS_DENIED":
        return {
          label: "Access Denied",
          color: "bg-danger-light text-danger-text border-danger/20",
          icon: AlertTriangle,
        };
      case "DOCUMENT_REPLACED":
        return {
          label: "File Replaced",
          color: "bg-warning-light text-warning-text border-warning/20",
          icon: RefreshCw,
        };
      case "DOCUMENT_DELETED":
        return {
          label: "Document Deleted",
          color: "bg-danger-light text-danger-text border-danger/20",
          icon: Trash2,
        };
      default:
        return {
          label: action.replace(/_/g, " "),
          color: "bg-background text-secondary border-border",
          icon: Shield,
        };
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center bg-white rounded-lg border border-border">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <div className="text-sm text-secondary-muted">Loading activity audit log...</div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="p-12 text-center bg-white rounded-lg border border-border">
        <Shield className="w-10 h-10 text-secondary-muted mx-auto mb-3 opacity-40" />
        <h4 className="text-base font-semibold text-primary">No activity yet</h4>
        <p className="text-xs text-secondary-muted mt-1 max-w-sm mx-auto">
          Document access events, viewing sessions, and permission grants will appear here automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-border overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-background border-b border-border text-secondary font-semibold uppercase tracking-wider">
            <tr>
              <th className="px-5 py-3">Timestamp</th>
              <th className="px-5 py-3">Event</th>
              <th className="px-5 py-3">User</th>
              <th className="px-5 py-3">Document</th>
              <th className="px-5 py-3">Network / Device</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {activities.map((act) => {
              const badge = getActionBadge(act.action);
              const Icon = badge.icon;
              const date = new Date(act.createdAt);
              const formattedDate = date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              const formattedTime = date.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <tr key={act.id} className="hover:bg-background/40 transition-colors">
                  {/* Timestamp */}
                  <td className="px-5 py-3.5 whitespace-nowrap text-secondary font-mono">
                    <div className="flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-secondary-muted" />
                      <span>{formattedDate} • {formattedTime}</span>
                    </div>
                  </td>

                  {/* Event */}
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded border text-[11px] font-semibold ${badge.color}`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{badge.label}</span>
                    </span>
                  </td>

                  {/* User */}
                  <td className="px-5 py-3.5 whitespace-nowrap font-medium text-primary">
                    {act.userEmail || "Anonymous / Unauthenticated"}
                  </td>

                  {/* Document */}
                  <td className="px-5 py-3.5 text-secondary max-w-xs truncate">
                    {act.documentTitle || (act.documentId ? `Doc #${act.documentId.slice(-6)}` : "—")}
                  </td>

                  {/* Network / Device */}
                  <td className="px-5 py-3.5 text-secondary-muted font-mono whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className="flex items-center space-x-1">
                        <Globe className="w-3 h-3 text-secondary-muted" />
                        <span>{act.ipAddress || "127.0.0.1"}</span>
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
