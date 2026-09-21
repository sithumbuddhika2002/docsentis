"use client";

import React, { useState, useRef } from "react";
import { RefreshCw, X, FileText, CheckCircle, AlertCircle } from "lucide-react";

interface ReplaceModalProps {
  documentId: string;
  documentTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReplaceModal({
  documentId,
  documentTitle,
  isOpen,
  onClose,
  onSuccess,
}: ReplaceModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [replacing, setReplacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.type !== "application/pdf" && !selected.name.toLowerCase().endsWith(".pdf")) {
        setError("Only genuine PDF files are supported.");
        return;
      }
      if (selected.size > 25 * 1024 * 1024) {
        setError("File size exceeds 25MB limit.");
        return;
      }
      setFile(selected);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setReplacing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/documents/${documentId}/replace`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to replace document file");

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
        setFile(null);
        setSuccess(false);
        setReplacing(false);
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Failed to replace file");
      setReplacing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-primary/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-border shadow-xl max-w-md w-full overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-background">
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-4 h-4 text-accent" />
            <h3 className="font-semibold text-primary text-base">Replace Document File</h3>
          </div>
          <button
            onClick={onClose}
            disabled={replacing}
            className="text-secondary hover:text-primary transition-colors p-1 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="text-xs text-secondary-muted">
            Replacing file for: <span className="font-medium text-primary">{documentTitle}</span>. All current user permissions and access logs will be retained.
          </div>

          {error && (
            <div className="p-3 bg-danger-light border border-danger/30 rounded text-danger-text text-sm flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-success-light border border-success/30 rounded text-success-text text-sm flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>File replaced successfully!</span>
            </div>
          )}

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border hover:border-secondary-muted rounded-lg p-6 text-center cursor-pointer bg-background"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleFileSelect}
              disabled={replacing}
            />

            {file ? (
              <div className="flex items-center justify-center space-x-3">
                <FileText className="w-8 h-8 text-accent" />
                <div className="text-left">
                  <div className="text-sm font-semibold text-primary truncate max-w-xs">{file.name}</div>
                  <div className="text-xs text-secondary-muted">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready to replace
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <FileText className="w-6 h-6 text-accent mx-auto" />
                <div className="text-sm font-medium text-primary">Select replacement PDF</div>
                <div className="text-xs text-secondary-muted">Click to browse your device</div>
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-end space-x-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={replacing}
              className="px-4 py-2 text-sm text-secondary hover:text-primary rounded border border-border hover:bg-background transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={replacing || !file}
              className="px-5 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-light disabled:opacity-50 rounded transition-colors flex items-center space-x-2"
            >
              {replacing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Replacing...</span>
                </>
              ) : (
                <span>Confirm Replacement</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
