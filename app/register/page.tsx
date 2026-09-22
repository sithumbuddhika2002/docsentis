"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Shield, Lock, Mail, User, ArrowRight, AlertCircle } from "lucide-react";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"USER" | "OWNER">("USER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to register account");
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
      setError(err.message || "Failed to create account");
      setLoading(false);
    }
  };

  const loginHref = redirectUrl
    ? `/login?redirect=${encodeURIComponent(redirectUrl)}`
    : "/login";

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
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
          Create Docsentis Account
        </h2>
        <p className="mt-1 text-center text-xs text-secondary font-medium tracking-wide uppercase">
          University Assignment Viewer • Access Portal
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

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1">
                Full Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Prof. Alex Smith or Jane Doe"
                  required
                  disabled={loading}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded border border-border focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent bg-white"
                />
                <User className="w-4 h-4 text-secondary-muted absolute left-3 top-2.5" />
              </div>
            </div>

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
              <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  required
                  minLength={6}
                  disabled={loading}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded border border-border focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent bg-white"
                />
                <Lock className="w-4 h-4 text-secondary-muted absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1">
                Account Type / Role
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole("USER")}
                  className={`p-2.5 rounded border text-xs font-medium text-center transition-colors ${
                    role === "USER"
                      ? "bg-primary text-white border-primary"
                      : "bg-background text-secondary border-border hover:bg-border/40"
                  }`}
                >
                  <div className="font-semibold">Student / Viewer</div>
                  <div className="text-[10px] opacity-80 mt-0.5">Read assignments</div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole("OWNER")}
                  className={`p-2.5 rounded border text-xs font-medium text-center transition-colors ${
                    role === "OWNER"
                      ? "bg-primary text-white border-primary"
                      : "bg-background text-secondary border-border hover:bg-border/40"
                  }`}
                >
                  <div className="font-semibold">Instructor / Owner</div>
                  <div className="text-[10px] opacity-80 mt-0.5">Upload & manage access</div>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim() || !password || !name.trim()}
              className="w-full py-2.5 px-4 bg-primary hover:bg-primary-light text-white text-sm font-medium rounded transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 shadow-sm"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Complete Registration</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-secondary">
            Already have an account?{" "}
            <Link href={loginHref} className="font-semibold text-accent hover:underline">
              Sign in here
            </Link>
          </div>
        </div>

        {/* Credit */}
        <div className="mt-6 text-center text-xs text-secondary-muted">
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

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
