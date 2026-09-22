"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Shield, Lock, Mail, ArrowRight, AlertCircle } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid credentials");
      }

      // Route based on redirect param or user role
      if (redirectUrl && redirectUrl.startsWith("/")) {
        router.push(redirectUrl);
      } else if (data.user.role === "OWNER" || data.user.role === "ADMIN") {
        router.push("/dashboard");
      } else {
        router.push("/documents");
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to sign in");
      setLoading(false);
    }
  };

  const registerHref = redirectUrl
    ? `/register?redirect=${encodeURIComponent(redirectUrl)}`
    : "/register";

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand */}
        <div className="flex justify-center">
          <div className="h-20 w-20 flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="Docsentis Logo"
              width={80}
              height={80}
              priority
              className="h-20 w-20 object-contain"
            />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-primary">
          Docsentis
        </h2>
        <p className="mt-1 text-center text-xs text-secondary font-medium tracking-wide uppercase">
          University Assignment Viewer • Secure Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-8 border border-border rounded-lg shadow-sm">
          {error && (
            <div className="mb-5 p-3 bg-danger-light border border-danger/30 rounded text-danger-text text-sm flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1">
                University Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@university.edu"
                  required
                  disabled={loading}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded border border-border focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent bg-white"
                />
                <Mail className="w-4 h-4 text-secondary-muted absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded border border-border focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent bg-white"
                />
                <Lock className="w-4 h-4 text-secondary-muted absolute left-3 top-2.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim() || !password}
              className="w-full py-2.5 px-4 bg-primary hover:bg-primary-light text-white text-sm font-medium rounded transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 shadow-sm"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In Securely</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-secondary">
            Don&apos;t have an account?{" "}
            <Link href={registerHref} className="font-semibold text-accent hover:underline">
              Create an account
            </Link>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center text-xs text-secondary-muted flex items-center justify-center space-x-1.5">
          <Lock className="w-3.5 h-3.5 text-accent" />
          <span>Protected by Docsentis Access Architecture</span>
        </div>

        {/* Credit */}
        <div className="mt-3 text-center text-xs text-secondary-muted">
          <span>Developed by </span>
          <a
            href="https://www.peaksora.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-accent hover:underline transition-colors"
          >
            PEAKSORA
          </a>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
