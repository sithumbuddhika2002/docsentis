export type UserRole = "OWNER" | "USER" | "ADMIN";

export type DocumentStatus = "ACTIVE" | "DISABLED" | "DELETED";

export type PermissionStatus = "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "REVOKED";

export type ViewingSessionStatus = "ACTIVE" | "EXPIRED" | "REVOKED";

export type ActivityAction =
  | "DOCUMENT_UPLOADED"
  | "DOCUMENT_VIEWED"
  | "DOCUMENT_REPLACED"
  | "DOCUMENT_DELETED"
  | "DOCUMENT_DISABLED"
  | "DOCUMENT_ENABLED"
  | "PERMISSION_GRANTED"
  | "PERMISSION_REVOKED"
  | "PERMISSION_EXPIRED"
  | "ACCESS_DENIED"
  | "HEARTBEAT_ACKNOWLEDGED";

export interface IUser {
  _id: string;
  id?: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isInvited?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDocument {
  _id: string;
  id?: string;
  ownerId: string;
  title: string;
  description?: string;
  storageKey: string;
  fileSize: number;
  mimeType: string;
  pageCount: number;
  status: DocumentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPermission {
  _id: string;
  id?: string;
  documentId: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  grantedBy: string;
  expiresAt: Date;
  status: PermissionStatus;
  createdAt: Date;
  revokedAt?: Date;
}

export interface IViewingSession {
  _id: string;
  id?: string;
  documentId: string;
  userId: string;
  sessionTokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivity: Date;
  ipAddress?: string;
  userAgent?: string;
  status: ViewingSessionStatus;
}

export interface IActivityLog {
  _id: string;
  id?: string;
  documentId?: string;
  documentTitle?: string;
  userId?: string;
  userEmail?: string;
  action: ActivityAction;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
  createdAt: Date;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}
