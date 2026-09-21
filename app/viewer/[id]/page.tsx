import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { checkDocumentAccess } from "@/lib/permissions";
import { connectToDatabase } from "@/lib/db/mongodb";
import { ViewingSession } from "@/lib/models/ViewingSession";
import { User } from "@/lib/models/User";
import { recordActivity } from "@/lib/audit";
import { generateSecureToken, hashToken } from "@/lib/auth";
import SecurePdfViewer from "@/components/viewer/SecurePdfViewer";
import { Shield, AlertTriangle, ArrowLeft, Lock, Clock } from "lucide-react";
import { headers } from "next/headers";

interface ViewerPageProps {
  params: { id: string };
}

export default async function ViewerPage({ params }: ViewerPageProps) {
  const user = await getCurrentUser();

  // 1. Check user authentication
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-white border border-border rounded-lg shadow-sm p-8 max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6 text-accent" />
          </div>
          <h2 className="text-xl font-bold text-primary">Authentication Required</h2>
          <p className="text-xs text-secondary leading-relaxed">
            You must be signed in with your university account to access this protected assignment document.
          </p>
          <div className="pt-3 flex justify-center">
            <Link
              href={`/login?redirect=/viewer/${params.id}`}
              className="px-5 py-2 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-light transition-colors"
            >
              Sign In to University Portal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Server-side authorization check
  const access = await checkDocumentAccess(params.id, user);

  if (!access.allowed || !access.document) {
    const reqHeaders = headers();
    const ipAddress = reqHeaders.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const userAgent = reqHeaders.get("user-agent") || "unknown";

    await recordActivity({
      documentId: params.id,
      userId: user.id,
      userEmail: user.email,
      action: "ACCESS_DENIED",
      ipAddress,
      userAgent,
      details: { reason: access.reason, code: access.code },
    });

    const isExpired = access.code === 410;
    const isNotFound = access.code === 404;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-white border border-border rounded-lg shadow-sm p-8 max-w-md w-full text-center space-y-4">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${
              isExpired ? "bg-warning-light text-warning" : "bg-danger-light text-danger"
            }`}
          >
            {isExpired ? <Clock className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
          </div>
          <h2 className="text-xl font-bold text-primary">
            {isNotFound
              ? "Document Not Found"
              : isExpired
              ? "Access Expired"
              : "Access Restricted"}
          </h2>
          <p className="text-xs text-secondary leading-relaxed">
            {access.reason || "You do not have permission to view this protected document."}
          </p>
          <div className="text-[11px] text-secondary-muted pt-2 border-t border-border">
            Docsentis Security Protocol: Every access request is verified against active university permissions and audit logs.
          </div>
          <div className="pt-3">
            <Link
              href={user.role === "OWNER" || user.role === "ADMIN" ? "/dashboard" : "/documents"}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-light transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Portal</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Create short-lived ViewingSession
  await connectToDatabase();
  const rawToken = generateSecureToken(32);
  const tokenHash = hashToken(rawToken);
  const now = new Date();
  const defaultExpiry = new Date(now.getTime() + 30 * 60 * 1000);

  let sessionExpiry = defaultExpiry;
  if (access.permission?.expiresAt) {
    const permExpiry = new Date(access.permission.expiresAt);
    if (permExpiry < defaultExpiry) {
      sessionExpiry = permExpiry;
    }
  }

  const reqHeaders = headers();
  const ipAddress = reqHeaders.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const userAgent = reqHeaders.get("user-agent") || "unknown";

  await ViewingSession.create({
    documentId: access.document._id,
    userId: user.id,
    sessionTokenHash: tokenHash,
    createdAt: now,
    expiresAt: sessionExpiry,
    lastActivity: now,
    ipAddress,
    userAgent,
    status: "ACTIVE",
  });

  const owner = await User.findById(access.document.ownerId);
  const shortSessionId = tokenHash.slice(0, 6).toUpperCase();

  await recordActivity({
    documentId: access.document._id.toString(),
    documentTitle: access.document.title,
    userId: user.id,
    userEmail: user.email,
    action: "DOCUMENT_VIEWED",
    ipAddress,
    userAgent,
    details: {
      sessionId: shortSessionId,
    },
  });

  const watermarkData = {
    brand: "DOCSENTIS",
    userEmail: user.email,
    ownerName: owner?.name || "Document Owner",
    ownerEmail: owner?.email || "peaksorateam@gmail.com",
    title: access.document.title,
    sessionId: shortSessionId,
    timestamp:
      new Date().toLocaleString("en-US", {
        timeZone: "UTC",
        dateStyle: "medium",
        timeStyle: "short",
      }) + " UTC",
  };

  return (
    <SecurePdfViewer
      documentId={access.document._id.toString()}
      initialDocument={{
        id: access.document._id.toString(),
        title: access.document.title,
        pageCount: access.document.pageCount,
        description: access.document.description,
      }}
      initialSessionToken={rawToken}
      initialWatermark={watermarkData}
      isOwner={access.isOwner}
    />
  );
}
