import React from "react";
import Link from "next/link";
import { Shield, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white border border-border rounded-lg shadow-sm p-8 max-w-md w-full space-y-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
          <Shield className="w-6 h-6 text-accent" />
        </div>
        <div className="text-2xl font-mono font-bold text-primary">404</div>
        <h2 className="text-lg font-bold text-primary">Document Not Found</h2>
        <p className="text-xs text-secondary leading-relaxed">
          The requested document or page does not exist or has been permanently removed by the instructor.
        </p>
        <div className="pt-3">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 px-4 py-2 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-light transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
