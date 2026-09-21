"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Shield, FileText, Activity, LogOut, Lock, User as UserIcon } from "lucide-react";
import { SessionUser } from "@/types";

interface NavbarProps {
  user: SessionUser | null;
}

export default function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error("Logout error", e);
    }
  };

  const isOwnerOrAdmin = user?.role === "OWNER" || user?.role === "ADMIN";

  return (
    <header className="bg-white border-b border-border sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <Link href={isOwnerOrAdmin ? "/dashboard" : "/documents"} className="flex items-center space-x-3">
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
                <span className="text-xs text-secondary-muted hidden sm:inline mt-0.5">
                  University Assignment Viewer
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          {user && (
            <nav className="hidden md:flex items-center space-x-1">
              {isOwnerOrAdmin ? (
                <>
                  <Link
                    href="/dashboard"
                    className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                      pathname === "/dashboard"
                        ? "bg-accent-light text-accent"
                        : "text-secondary hover:text-primary hover:bg-background"
                    }`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/dashboard/documents"
                    className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                      pathname.startsWith("/dashboard/documents")
                        ? "bg-accent-light text-accent"
                        : "text-secondary hover:text-primary hover:bg-background"
                    }`}
                  >
                    Documents
                  </Link>
                  <Link
                    href="/dashboard/activity"
                    className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                      pathname === "/dashboard/activity"
                        ? "bg-accent-light text-accent"
                        : "text-secondary hover:text-primary hover:bg-background"
                    }`}
                  >
                    Activity Log
                  </Link>
                </>
              ) : (
                <Link
                  href="/documents"
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    pathname === "/documents"
                      ? "bg-accent-light text-accent"
                      : "text-secondary hover:text-primary hover:bg-background"
                  }`}
                >
                  My Assignments
                </Link>
              )}
            </nav>
          )}

          {/* User Info & Actions */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-3">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-medium text-primary flex items-center justify-end space-x-1.5">
                    <span>{user.name}</span>
                    <span
                      className={`text-[11px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                        user.role === "OWNER"
                          ? "bg-primary text-white"
                          : user.role === "ADMIN"
                          ? "bg-danger-light text-danger-text"
                          : "bg-success-light text-success-text"
                      }`}
                    >
                      {user.role}
                    </span>
                  </div>
                  <div className="text-xs text-secondary-muted">{user.email}</div>
                </div>

                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-2 rounded text-secondary hover:text-danger hover:bg-danger-light transition-colors"
                  aria-label="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/login"
                  className="text-sm font-medium text-secondary hover:text-primary px-3 py-2"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-medium bg-primary text-white px-3.5 py-2 rounded hover:bg-primary-light transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
