import { connectToDatabase } from "@/lib/db/mongodb";
import { ActivityLog } from "@/lib/models/ActivityLog";
import { ActivityAction } from "@/types";

interface LogActivityParams {
  documentId?: string;
  documentTitle?: string;
  userId?: string;
  userEmail?: string;
  action: ActivityAction;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
}

export async function recordActivity(params: LogActivityParams): Promise<void> {
  try {
    await connectToDatabase();
    await ActivityLog.create({
      documentId: params.documentId,
      documentTitle: params.documentTitle,
      userId: params.userId,
      userEmail: params.userEmail,
      action: params.action,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      details: params.details,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Failed to record activity log:", error);
  }
}
