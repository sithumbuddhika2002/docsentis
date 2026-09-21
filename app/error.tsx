"use client";

import React from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white border border-border rounded-lg shadow-sm p-8 max-w-md w-full space-y-4">
        <div className="w-12 h-12 rounded-full bg-danger-light text-danger flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="text-2xl font-mono font-bold text-primary">500</div>
        <h2 className="text-lg font-bold text-primary">System Error</h2>
        <p className="text-xs text-secondary leading-relaxed">
          An unexpected error occurred while processing your request. Please try again or return to the main dashboard.
        </p>
        <div className="pt-3 flex items-center justify-center space-x-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-light transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
          <Link
            href="/"
            className="px-4 py-2 bg-white border border-border text-secondary hover:text-primary text-xs font-semibold rounded transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
