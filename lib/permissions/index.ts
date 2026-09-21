import { connectToDatabase } from "@/lib/db/mongodb";
import { Document } from "@/lib/models/Document";
import { Permission } from "@/lib/models/Permission";
import { IDocument, IPermission, SessionUser, PermissionStatus } from "@/types";

export function computePermissionStatus(
  status: PermissionStatus,
  expiresAt: Date
): PermissionStatus {
  if (status === "REVOKED") return "REVOKED";
  const now = new Date().getTime();
  const expiryTime = new Date(expiresAt).getTime();

  if (now > expiryTime) {
    return "EXPIRED";
  }

  // If within 24 hours of expiry
  if (expiryTime - now < 24 * 60 * 60 * 1000) {
    return "EXPIRING_SOON";
  }

  return "ACTIVE";
}

export interface AccessCheckResult {
  allowed: boolean;
  code?: 401 | 403 | 404 | 410;
  reason?: string;
  document?: any;
  permission?: any;
  isOwner?: boolean;
}

export async function checkDocumentAccess(
  documentId: string,
  user: SessionUser | null
): Promise<AccessCheckResult> {
  if (!user) {
    return {
      allowed: false,
      code: 401,
      reason: "Authentication required to access this document.",
    };
  }

  await connectToDatabase();

  const doc = await Document.findById(documentId);
  if (!doc || doc.status === "DELETED") {
    return {
      allowed: false,
      code: 404,
      reason: "The requested document was not found or has been removed.",
    };
  }

  if (doc.status === "DISABLED") {
    return {
      allowed: false,
      code: 403,
      reason: "This document has been temporarily disabled by the owner.",
    };
  }

  // Owner and Admin always have access
  if (doc.ownerId.toString() === user.id || user.role === "ADMIN") {
    return {
      allowed: true,
      document: doc,
      isOwner: true,
    };
  }

  // Look up permission for normal user
  const permission = await Permission.findOne({
    documentId: doc._id,
    userId: user.id,
  });

  if (!permission) {
    return {
      allowed: false,
      code: 403,
      reason: "You do not have permission to view this document. Contact the document owner.",
    };
  }

  const currentStatus = computePermissionStatus(permission.status, permission.expiresAt);

  if (currentStatus === "REVOKED") {
    return {
      allowed: false,
      code: 403,
      reason: "Your access to this document has been revoked by the owner.",
      permission,
    };
  }

  if (currentStatus === "EXPIRED") {
    // Update DB if not already marked expired
    if (permission.status !== "EXPIRED") {
      permission.status = "EXPIRED";
      await permission.save();
    }
    return {
      allowed: false,
      code: 410,
      reason: "Your viewing permission for this document has expired.",
      permission,
    };
  }

  return {
    allowed: true,
    document: doc,
    permission,
    isOwner: false,
  };
}
