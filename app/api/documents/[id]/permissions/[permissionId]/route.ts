import { NextResponse } from "next/server";
import { getCurrentUser, getClientIp } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Document } from "@/lib/models/Document";
import { Permission } from "@/lib/models/Permission";
import { ViewingSession } from "@/lib/models/ViewingSession";
import { User } from "@/lib/models/User";
import { recordActivity } from "@/lib/audit";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string; permissionId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const doc = await Document.findById(params.id);
    if (!doc || doc.status === "DELETED") {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (doc.ownerId.toString() !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const permission = await Permission.findById(params.permissionId);
    if (!permission || permission.documentId.toString() !== doc._id.toString()) {
      return NextResponse.json({ error: "Permission record not found" }, { status: 404 });
    }

    permission.status = "REVOKED";
    permission.revokedAt = new Date();
    await permission.save();

    // Invalidate any active viewing sessions for this user on this document immediately
    await ViewingSession.updateMany(
      {
        documentId: doc._id,
        userId: permission.userId,
        status: "ACTIVE",
      },
      {
        status: "REVOKED",
      }
    );

    const targetUser = await User.findById(permission.userId);
    const ipAddress = getClientIp(req.headers);
    const userAgent = req.headers.get("user-agent") || "unknown";

    await recordActivity({
      documentId: doc._id.toString(),
      documentTitle: doc.title,
      userId: user.id,
      userEmail: user.email,
      action: "PERMISSION_REVOKED",
      ipAddress,
      userAgent,
      details: {
        revokedUserEmail: targetUser?.email || "unknown",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Access revoked successfully",
    });
  } catch (error: any) {
    console.error("Revoke permission error:", error);
    return NextResponse.json(
      { error: "Failed to revoke permission" },
      { status: 500 }
    );
  }
}
