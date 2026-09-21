"use client";

import React, { useState, useRef } from "react";
import { Upload, X, FileText, CheckCircle, AlertCircle, Lock } from "lucide-react";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    setError(null);
    if (selectedFile.type !== "application/pdf" && !selectedFile.name.toLowerCase().endsWith(".pdf")) {
      setError("Only genuine PDF documents are supported.");
      return;
    }

    if (selectedFile.size > 25 * 1024 * 1024) {
      setError("File size exceeds the 25MB limit.");
      return;
    }

    setFile(selectedFile);
    if (!title) {
      // Auto-populate title from filename without .pdf extension
      setTitle(selectedFile.name.replace(/\.pdf$/i, "").replace(/[-_]/g, " "));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a PDF file to upload.");
      return;
    }
    if (!title.trim()) {
      setError("Please provide a title for the assignment.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title.trim());
      formData.append("description", description.trim());

      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to upload document");
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
        // Reset state
        setFile(null);
        setTitle("");
        setDescription("");
        setSuccess(false);
        setUploading(false);
      }, 1200);
    } catch (err: any) {
      setError(err.message || "An error occurred during upload");
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-primary/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-border shadow-xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-background">
          <div className="flex items-center space-x-2">
            <Lock className="w-4 h-4 text-accent" />
            <h3 className="font-semibold text-primary text-base">Upload Assignment Document</h3>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="text-secondary hover:text-primary transition-colors p-1 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-danger-light border border-danger/30 rounded text-danger-text text-sm flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-success-light border border-success/30 rounded text-success-text text-sm flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>Assignment uploaded securely! Processing...</span>
            </div>
          )}

          {/* Drag & Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              isDragging
                ? "border-accent bg-accent-light/50"
                : file
                ? "border-success bg-success-light/20"
                : "border-border hover:border-secondary-muted bg-background"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleFileSelect}
              disabled={uploading}
            />

            {file ? (
              <div className="flex items-center justify-center space-x-3">
                <FileText className="w-8 h-8 text-accent" />
                <div className="text-left">
                  <div className="text-sm font-semibold text-primary truncate max-w-xs">
                    {file.name}
                  </div>
                  <div className="text-xs text-secondary-muted">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready for secure storage
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="mx-auto w-10 h-10 rounded-full bg-white border border-border flex items-center justify-center text-secondary">
                  <Upload className="w-5 h-5 text-accent" />
                </div>
                <div className="text-sm font-medium text-primary">
                  Click to select or drag and drop assignment PDF
                </div>
                <div className="text-xs text-secondary-muted">
                  PDF format only (up to 25MB). Stored in private protected storage.
                </div>
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1">
              Assignment Title <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. CS301 - Distributed Systems Assignment 2"
              disabled={uploading}
              required
              className="w-full px-3 py-2 text-sm rounded border border-border focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent bg-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Instructions, course module, or notes for authorized students..."
              rows={3}
              disabled={uploading}
              className="w-full px-3 py-2 text-sm rounded border border-border focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent bg-white resize-none"
            />
          </div>

          {/* Security Assurance Banner */}
          <div className="p-3 bg-background rounded border border-border text-xs text-secondary space-y-1">
            <div className="font-semibold text-primary flex items-center space-x-1.5">
              <Lock className="w-3.5 h-3.5 text-accent" />
              <span>Docsentis Private Storage Safeguards</span>
            </div>
            <div>
              Files are never placed in public directories. Direct downloads and raw URLs are restricted. Documents can only be viewed by users you explicitly authorize.
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end space-x-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2 text-sm text-secondary hover:text-primary rounded border border-border hover:bg-background transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !file || !title.trim()}
              className="px-5 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors flex items-center space-x-2"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Uploading Assignment...</span>
                </>
              ) : (
                <span>Upload & Protect</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
