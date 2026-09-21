import React from "react";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Shield, Lock, Eye, Clock, FileText, ArrowRight, CheckCircle2 } from "lucide-react";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (user) {
    if (user.role === "OWNER" || user.role === "ADMIN") {
      redirect("/dashboard");
    } else {
      redirect("/documents");
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between">
      {/* Navigation */}
      <header className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-11 w-11 flex items-center justify-center flex-shrink-0">
              <Image
                src="/logo.png"
                alt="Docsentis Logo"
                width={44}
                height={44}
                priority
                className="h-11 w-11 object-contain"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-xl tracking-tight text-primary leading-none">Docsentis</span>
                <span className="text-[10px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                  Security
                </span>
              </div>
              <span className="text-xs text-secondary-muted mt-0.5">University Assignment Viewer</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/login"
              className="text-xs font-semibold text-secondary hover:text-primary px-3 py-2"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="text-xs font-semibold bg-primary text-white px-4 py-2 rounded hover:bg-primary-light transition-colors"
            >
              Register
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-8">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-accent-light border border-accent/20 text-xs font-semibold text-accent">
          <Lock className="w-3.5 h-3.5" />
          <span>Next-Generation Coursework Protection</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-primary max-w-3xl mx-auto leading-tight">
          Secure University Assignment Sharing & Protected Viewing
        </h1>

        <p className="text-sm sm:text-base text-secondary max-w-2xl mx-auto leading-relaxed">
          Distribute course assignments, solution manuals, and exam materials to selected students. Reading is strictly protected inside our custom canvas viewer with dynamic forensic watermarking and real-time revocation.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Link
            href="/login"
            className="w-full sm:w-auto px-6 py-3 bg-primary hover:bg-primary-light text-white text-sm font-semibold rounded shadow-sm transition-colors flex items-center justify-center space-x-2"
          >
            <span>Access Portal</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/register"
            className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-background text-primary border border-border text-sm font-semibold rounded shadow-sm transition-colors"
          >
            Instructor / Student Sign Up
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 text-left">
          <div className="bg-white p-6 rounded-lg border border-border shadow-sm space-y-2">
            <div className="w-9 h-9 rounded bg-background border border-border flex items-center justify-center text-accent mb-3">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-primary text-sm">Docsentis Dynamic Watermark</h3>
            <p className="text-xs text-secondary leading-relaxed">
              Every rendered page is overlaid with a dynamic, traceable watermark displaying student email, session ID, and timestamp with micro-jitter to deter leakage.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-border shadow-sm space-y-2">
            <div className="w-9 h-9 rounded bg-background border border-border flex items-center justify-center text-primary mb-3">
              <Lock className="w-5 h-5 text-accent" />
            </div>
            <h3 className="font-semibold text-primary text-sm">Anti-Download Deterrence</h3>
            <p className="text-xs text-secondary leading-relaxed">
              No download buttons, no save options, and no predictable static URLs. Context menus, print shortcuts, and drag-and-drop actions are systematically suppressed.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-border shadow-sm space-y-2">
            <div className="w-9 h-9 rounded bg-background border border-border flex items-center justify-center text-warning mb-3">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-primary text-sm">Instant Access Revocation</h3>
            <p className="text-xs text-secondary leading-relaxed">
              Active viewing sessions check in every 25 seconds via heartbeat. If an instructor revokes permission, the viewer blanks the canvas immediately.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-border py-6 text-xs text-secondary-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Image
              src="/logo.png"
              alt="Docsentis Logo"
              width={20}
              height={20}
              className="h-5 w-5 object-contain"
            />
            <span className="font-semibold text-primary">Docsentis</span>
            <span>•</span>
            <span>Protected Viewing Protocol • Authorized University Access Only</span>
          </div>
          <div>
            <span>Developed by </span>
            <a
              href="https://www.peaksora.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-accent hover:underline transition-colors"
            >
              PEAKSORA
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
