"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  X,
  UserPlus,
  Shield,
  Copy,
  Check,
  Clock,
  AlertTriangle,
  Trash2,
  ExternalLink,
  Search,
  Key,
  Eye,
  EyeOff,
  UserCheck,
  Sparkles,
  RefreshCw,
  Share2,
  CheckCircle2,
  User as UserIcon,
} from "lucide-react";
import Link from "next/link";

interface PermissionUser {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "REVOKED";
  expiresAt: string;
  createdAt: string;
}

interface ExistingUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isInvited?: boolean;
}

interface SharedCredentials {
  email: string;
  password?: string;
  name?: string;
  viewerUrl: string;
  expiresAt: string;
  isNewUser: boolean;
}

interface PermissionModalProps {
  documentId: string;
  documentTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onPermissionChanged?: () => void;
}

function generateSecurePassword(): string {
  const words = ["Access", "Study", "Doc", "Reader", "Safe", "Portal", "Learn", "Auth"];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  const chars = "!@#$%&*";
  const char = chars[Math.floor(Math.random() * chars.length)];
  return `${word}@${num}${char}`;
}

export default function PermissionModal({
  documentId,
  documentTitle,
  isOpen,
  onClose,
  onPermissionChanged,
}: PermissionModalProps) {
  const [permissions, setPermissions] = useState<PermissionUser[]>([]);
  const [existingUsers, setExistingUsers] = useState<ExistingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<ExistingUser | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [granting, setGranting] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Sharing & Copy states
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [sharedCredentials, setSharedCredentials] = useState<SharedCredentials | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Set default expiration to 7 days from now
  const setExpirationDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setExpiresAt(d.toISOString().slice(0, 16));
  };

  useEffect(() => {
    if (isOpen) {
      setExpirationDays(7);
      setSharedCredentials(null);
      setError(null);
    }
  }, [isOpen]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchPermissions = useCallback(async () => {
    if (!documentId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/permissions`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load permissions");
      setPermissions(data.permissions || []);
    } catch (err: any) {
      setError(err.message || "Failed to load permissions");
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/users?limit=100");
      const data = await res.json();
      if (res.ok && data.users) {
        setExistingUsers(data.users);
      }
    } catch (err) {
      console.error("Failed to load existing users", err);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchPermissions();
      fetchUsers();
    }
  }, [isOpen, fetchPermissions, fetchUsers]);

  if (!isOpen) return null;

  const viewerUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/viewer/${documentId}`
      : `/viewer/${documentId}`;

  // Filter existing users matching searchQuery
  const filteredUsers = existingUsers.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  // Check if current search query looks like an email and is not already in existing users
  const isInputEmail = searchQuery.includes("@") && searchQuery.includes(".");
  const exactMatchExists = existingUsers.some(
    (u) => u.email.toLowerCase() === searchQuery.trim().toLowerCase()
  );

  const handleSelectExistingUser = (user: ExistingUser) => {
    setSelectedUser(user);
    setEmail(user.email);
    setName(user.name);
    setSearchQuery(user.email);
    setPassword("");
    setIsDropdownOpen(false);
  };

  const handleSelectNewUser = (newEmail: string) => {
    const cleanEmail = newEmail.trim().toLowerCase();
    setSelectedUser(null);
    setEmail(cleanEmail);
    const suggestedName = cleanEmail.split("@")[0].replace(/[._]/g, " ");
    setName(suggestedName.charAt(0).toUpperCase() + suggestedName.slice(1));
    setSearchQuery(cleanEmail);
    setPassword(generateSecurePassword());
    setIsDropdownOpen(false);
  };

  const handleClearSelection = () => {
    setSelectedUser(null);
    setSearchQuery("");
    setEmail("");
    setName("");
    setPassword("");
    setIsDropdownOpen(false);
  };

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = (email || searchQuery).trim().toLowerCase();
    if (!targetEmail) {
      setError("Please enter a valid email address");
      return;
    }

    setGranting(true);
    setError(null);

    try {
      const res = await fetch(`/api/documents/${documentId}/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: targetEmail,
          name: name.trim() || undefined,
          password: password.trim() || undefined,
          expiresAt: new Date(expiresAt).toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to grant permission");

      // Save shared credentials card details
      setSharedCredentials({
        email: targetEmail,
        password: password.trim() || undefined,
        name: name.trim() || undefined,
        viewerUrl,
        expiresAt: new Date(expiresAt).toLocaleString(),
        isNewUser: data.isNewUser || !selectedUser,
      });

      // Reset form
      setSelectedUser(null);
      setSearchQuery("");
      setEmail("");
      setName("");
      setPassword("");

      await fetchPermissions();
      await fetchUsers();
      if (onPermissionChanged) onPermissionChanged();
    } catch (err: any) {
      setError(err.message || "Failed to grant access");
    } finally {
      setGranting(false);
    }
  };

  const handleRevoke = async (permissionId: string) => {
    setRevokingId(permissionId);
    setError(null);

    try {
      const res = await fetch(`/api/documents/${documentId}/permissions/${permissionId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to revoke access");

      await fetchPermissions();
      if (onPermissionChanged) onPermissionChanged();
    } catch (err: any) {
      setError(err.message || "Failed to revoke access");
    } finally {
      setRevokingId(null);
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const copyViewingLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(viewerUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const copyAllCredentials = () => {
    if (!sharedCredentials || !navigator.clipboard) return;

    let text = `Docsentis Assignment Access\n`;
    text += `Document: ${documentTitle}\n`;
    text += `Viewer Link: ${sharedCredentials.viewerUrl}\n`;
    text += `Email: ${sharedCredentials.email}\n`;
    if (sharedCredentials.password) {
      text += `Password: ${sharedCredentials.password}\n`;
    }
    text += `Access Expires: ${sharedCredentials.expiresAt}\n`;
    text += `\nSign in to view the assignment: ${sharedCredentials.viewerUrl}`;

    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const isUserAuthorized = (userEmail: string) => {
    return permissions.some(
      (p) => p.userEmail.toLowerCase() === userEmail.toLowerCase() && p.status === "ACTIVE"
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-primary/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-border shadow-xl max-w-2xl w-full overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-background">
          <div>
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-accent" />
              <h3 className="font-semibold text-primary text-base">Permission Management</h3>
            </div>
            <div className="text-xs text-secondary-muted truncate max-w-md mt-0.5">
              Document: <span className="font-medium text-primary">{documentTitle}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-secondary hover:text-primary transition-colors p-1 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-danger-light border border-danger/30 rounded text-danger-text text-sm flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Secure Private Viewing Link */}
          <div className="p-4 bg-background rounded-lg border border-border space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-secondary flex items-center justify-between">
              <span>Secure Private Viewing Link</span>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={viewerUrl}
                className="w-full px-3 py-1.5 text-xs font-mono rounded border border-border bg-white text-secondary cursor-text select-all"
              />
              <button
                type="button"
                onClick={copyViewingLink}
                className="px-3 py-1.5 bg-white border border-border hover:border-secondary-muted rounded text-xs font-medium text-primary flex items-center space-x-1.5 transition-colors flex-shrink-0"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-success" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-secondary" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
              <Link
                href={`/viewer/${documentId}`}
                target="_blank"
                className="p-1.5 bg-white border border-border hover:border-secondary-muted rounded text-xs text-secondary hover:text-primary transition-colors flex-shrink-0"
                title="Preview viewer"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
            <div className="text-[11px] text-secondary-muted">
              🔒 Note: Only authorized users listed below can open this link. Unauthenticated visitors are prompted to sign in.
            </div>
          </div>

          {/* Shareable Credentials Card (Appears immediately after grant) */}
          {sharedCredentials && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h4 className="text-sm font-bold text-emerald-900">
                      {sharedCredentials.isNewUser
                        ? "User Account Created & Access Granted!"
                        : "Access Granted Successfully!"}
                    </h4>
                    <p className="text-xs text-emerald-700">
                      Share the viewing link and credentials below with the user so they can sign in.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSharedCredentials(null)}
                  className="text-emerald-700 hover:text-emerald-900 text-xs p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-white rounded border border-emerald-200 divide-y divide-emerald-100 text-xs">
                <div className="p-2.5 flex items-center justify-between">
                  <div>
                    <span className="text-secondary-muted block text-[10px] uppercase font-semibold">Viewer Link</span>
                    <span className="font-mono text-primary font-medium truncate block max-w-sm sm:max-w-md">
                      {sharedCredentials.viewerUrl}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(sharedCredentials.viewerUrl, "link")}
                    className="p-1 text-secondary hover:text-primary"
                    title="Copy Link"
                  >
                    {copiedField === "link" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <div className="p-2.5 flex items-center justify-between">
                  <div>
                    <span className="text-secondary-muted block text-[10px] uppercase font-semibold">Email</span>
                    <span className="font-medium text-primary">{sharedCredentials.email}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(sharedCredentials.email, "email")}
                    className="p-1 text-secondary hover:text-primary"
                    title="Copy Email"
                  >
                    {copiedField === "email" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {sharedCredentials.password && (
                  <div className="p-2.5 flex items-center justify-between">
                    <div>
                      <span className="text-secondary-muted block text-[10px] uppercase font-semibold">Password</span>
                      <span className="font-mono font-bold text-primary tracking-wide">
                        {sharedCredentials.password}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(sharedCredentials.password!, "password")}
                      className="p-1 text-secondary hover:text-primary"
                      title="Copy Password"
                    >
                      {copiedField === "password" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                )}

                <div className="p-2.5 flex items-center justify-between">
                  <div>
                    <span className="text-secondary-muted block text-[10px] uppercase font-semibold">Expires</span>
                    <span className="text-secondary">{sharedCredentials.expiresAt}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={copyAllCredentials}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-colors"
                >
                  {copiedAll ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied All Details!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Copy All (Link, Email & Password)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Add User Permission Form */}
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-secondary flex items-center space-x-1.5">
              <UserPlus className="w-3.5 h-3.5 text-accent" />
              <span>Grant Access to User / Student</span>
            </div>

            <form onSubmit={handleGrant} className="space-y-3">
              {/* User Selection / Search Box */}
              <div className="relative" ref={dropdownRef}>
                <label className="block text-xs font-medium text-secondary mb-1">
                  Select Existing User or Enter New Email
                </label>

                {selectedUser ? (
                  <div className="flex items-center justify-between p-2.5 bg-blue-50/60 border border-blue-200 rounded text-sm">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-full bg-accent/10 text-accent flex items-center justify-center font-bold text-xs">
                        {selectedUser.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-primary text-xs flex items-center space-x-2">
                          <span>{selectedUser.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 bg-white border border-blue-200 text-secondary rounded font-normal">
                            {selectedUser.role}
                          </span>
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1 rounded font-medium">
                            Existing Account
                          </span>
                        </div>
                        <div className="text-xs text-secondary-muted font-mono">{selectedUser.email}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="text-xs text-secondary hover:text-danger px-2 py-1 rounded transition-colors"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setIsDropdownOpen(true);
                          setEmail(e.target.value);
                        }}
                        onFocus={() => setIsDropdownOpen(true)}
                        placeholder="Type to search existing users, or enter new email..."
                        disabled={granting}
                        className="w-full pl-9 pr-8 py-2 text-sm rounded border border-border focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent bg-white"
                      />
                      <Search className="w-4 h-4 text-secondary-muted absolute left-3 top-2.5" />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery("");
                            setEmail("");
                            setIsDropdownOpen(false);
                          }}
                          className="absolute right-2.5 top-2.5 text-secondary hover:text-primary"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Dropdown Menu */}
                    {isDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto divide-y divide-border">
                        {/* New User Option if search text is present and not an exact match */}
                        {searchQuery.trim() && !exactMatchExists && (
                          <div
                            onClick={() => handleSelectNewUser(searchQuery)}
                            className="p-3 hover:bg-accent/5 cursor-pointer flex items-center justify-between text-xs bg-gray-50/50 transition-colors"
                          >
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center">
                                <UserPlus className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <span className="font-semibold text-accent">
                                  Add new user: &quot;{searchQuery.trim()}&quot;
                                </span>
                                <span className="block text-[11px] text-secondary-muted">
                                  User account will be created with assigned password
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] bg-accent/10 text-accent font-medium px-2 py-0.5 rounded">
                              + New User
                            </span>
                          </div>
                        )}

                        {/* Existing Users List */}
                        {filteredUsers.length === 0 && !searchQuery.trim() ? (
                          <div className="p-4 text-center text-xs text-secondary-muted">
                            {loadingUsers ? "Loading users..." : "No users found."}
                          </div>
                        ) : filteredUsers.length === 0 && searchQuery.trim() && exactMatchExists ? (
                          <div className="p-3 text-xs text-secondary-muted">No other matching users</div>
                        ) : (
                          filteredUsers.map((u) => {
                            const authorized = isUserAuthorized(u.email);
                            return (
                              <div
                                key={u.id}
                                onClick={() => handleSelectExistingUser(u)}
                                className="p-2.5 hover:bg-background cursor-pointer flex items-center justify-between text-xs transition-colors"
                              >
                                <div className="flex items-center space-x-2.5">
                                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                                    {u.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="font-medium text-primary flex items-center space-x-1.5">
                                      <span>{u.name}</span>
                                      <span className="text-[9px] text-secondary-muted uppercase">
                                        ({u.role})
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-secondary-muted font-mono">
                                      {u.email}
                                    </div>
                                  </div>
                                </div>

                                {authorized ? (
                                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-medium px-2 py-0.5 rounded border border-emerald-200">
                                    Authorized
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-secondary hover:text-accent font-medium">
                                    Select
                                  </span>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Password & Name (If New User or entered manual email) */}
              {!selectedUser && searchQuery.trim() && (
                <div className="p-3.5 bg-background rounded-lg border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-primary flex items-center space-x-1">
                      <Key className="w-3.5 h-3.5 text-accent" />
                      <span>New User Account Setup</span>
                    </span>
                    <span className="text-[10px] text-secondary-muted">
                      User will sign in with this email & password
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-secondary mb-1">Full Name (Optional)</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Alex Smith"
                        disabled={granting}
                        className="w-full px-3 py-1.5 text-xs rounded border border-border focus:outline-none focus:ring-1 focus:ring-accent bg-white"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] text-secondary">Initial Password</label>
                        <button
                          type="button"
                          onClick={() => setPassword(generateSecurePassword())}
                          className="text-[11px] text-accent hover:underline flex items-center space-x-1"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Generate</span>
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          required
                          minLength={6}
                          disabled={granting}
                          className="w-full px-3 pr-8 py-1.5 text-xs font-mono rounded border border-border focus:outline-none focus:ring-1 focus:ring-accent bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-2 text-secondary-muted hover:text-primary"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Expiration Settings */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-secondary">Access Expiration</label>
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => setExpirationDays(1)}
                      className="px-2 py-0.5 text-[10px] bg-white border border-border hover:border-accent rounded text-secondary hover:text-primary transition-colors"
                    >
                      24h
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpirationDays(7)}
                      className="px-2 py-0.5 text-[10px] bg-white border border-border hover:border-accent rounded text-secondary hover:text-primary transition-colors"
                    >
                      7d
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpirationDays(30)}
                      className="px-2 py-0.5 text-[10px] bg-white border border-border hover:border-accent rounded text-secondary hover:text-primary transition-colors"
                    >
                      30d
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpirationDays(90)}
                      className="px-2 py-0.5 text-[10px] bg-white border border-border hover:border-accent rounded text-secondary hover:text-primary transition-colors"
                    >
                      90d
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-8">
                    <input
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      required
                      disabled={granting}
                      className="w-full px-3 py-2 text-sm rounded border border-border focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent bg-white"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <button
                      type="submit"
                      disabled={granting || (!email.trim() && !searchQuery.trim())}
                      className="w-full py-2 px-4 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded transition-colors disabled:opacity-50 flex items-center justify-center space-x-1.5 shadow-sm"
                    >
                      {granting ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <span>{selectedUser ? "Grant Access" : "Grant & Share"}</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Authorized Users List */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-secondary mb-2 flex items-center justify-between">
              <span>Authorized Users ({permissions.length})</span>
              {loading && <span className="text-[11px] text-secondary-muted">Refreshing...</span>}
            </div>

            <div className="border border-border rounded-lg overflow-hidden">
              {permissions.length === 0 ? (
                <div className="p-8 text-center bg-background">
                  <Shield className="w-8 h-8 text-secondary-muted mx-auto mb-2 opacity-50" />
                  <div className="text-sm font-medium text-primary">No authorized users</div>
                  <div className="text-xs text-secondary-muted mt-0.5">
                    Grant access above to users who need to view this assignment.
                  </div>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto divide-y divide-border">
                  {permissions.map((perm) => (
                    <div
                      key={perm.id}
                      className="p-3.5 flex items-center justify-between hover:bg-background/50 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="text-sm font-medium text-primary flex items-center space-x-2">
                          <span>{perm.userEmail}</span>
                          <span
                            className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                              perm.status === "ACTIVE"
                                ? "bg-success-light text-success-text"
                                : perm.status === "EXPIRING_SOON"
                                ? "bg-warning-light text-warning-text"
                                : perm.status === "EXPIRED"
                                ? "bg-gray-100 text-secondary-muted"
                                : "bg-danger-light text-danger-text"
                            }`}
                          >
                            {perm.status.replace("_", " ")}
                          </span>
                        </div>
                        <div className="text-xs text-secondary-muted flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            Expires: {new Date(perm.expiresAt).toLocaleDateString()} at{" "}
                            {new Date(perm.expiresAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>

                      {perm.status !== "REVOKED" && (
                        <button
                          type="button"
                          onClick={() => handleRevoke(perm.id)}
                          disabled={revokingId === perm.id}
                          className="px-2.5 py-1 text-xs font-medium text-danger hover:bg-danger-light rounded border border-danger/20 transition-colors flex items-center space-x-1"
                        >
                          {revokingId === perm.id ? (
                            <div className="w-3 h-3 border-2 border-danger/30 border-t-danger rounded-full animate-spin" />
                          ) : (
                            <>
                              <Trash2 className="w-3 h-3" />
                              <span>Revoke</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-background flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-sm text-secondary hover:text-primary rounded border border-border hover:bg-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
