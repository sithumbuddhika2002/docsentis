import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { ActivityLog } from "@/lib/models/ActivityLog";
import { Document } from "@/lib/models/Document";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const documentId = url.searchParams.get("documentId");
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);

    await connectToDatabase();

    const query: any = {};
    if (documentId) {
      query.documentId = documentId;
    } else if (user.role !== "ADMIN") {
      // Find all documents owned by this user
      const userDocs = await Document.find({ ownerId: user.id }).select("_id");
      const userDocIds = userDocs.map((d) => d._id);
      query.$or = [{ documentId: { $in: userDocIds } }, { userId: user.id }];
    }

    const activities = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 200));

    const formatted = activities.map((act) => ({
      id: act._id.toString(),
      documentId: act.documentId?.toString(),
      documentTitle: act.documentTitle,
      userId: act.userId?.toString(),
      userEmail: act.userEmail,
      action: act.action,
      ipAddress: act.ipAddress,
      userAgent: act.userAgent,
      details: act.details,
      createdAt: act.createdAt,
    }));

    return NextResponse.json({ activities: formatted });
  } catch (error: any) {
    console.error("Get activity logs error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve activity logs" },
      { status: 500 }
    );
  }
}
