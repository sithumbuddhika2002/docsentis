import { NextResponse } from "next/server";
import { getCurrentUser, getClientIp, generateSecureToken, hashToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { ViewingSession } from "@/lib/models/ViewingSession";
import { User } from "@/lib/models/User";
import { checkDocumentAccess } from "@/lib/permissions";
import { recordActivity } from "@/lib/audit";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await checkDocumentAccess(params.id, user);
    if (!access.allowed || !access.document) {
      const ipAddress = getClientIp(req.headers);
      const userAgent = req.headers.get("user-agent") || "unknown";

      await recordActivity({
        documentId: params.id,
        userId: user.id,
        userEmail: user.email,
        action: "ACCESS_DENIED",
        ipAddress,
        userAgent,
        details: { reason: access.reason },
      });

      return NextResponse.json(
        { error: access.reason || "Access denied" },
        { status: access.code || 403 }
      );
    }

    await connectToDatabase();

    // Generate short-lived session token (valid 30 mins or until permission expiry)
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

    const ipAddress = getClientIp(req.headers);
    const userAgent = req.headers.get("user-agent") || "unknown";

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

    // Fetch document owner details for watermark
    const owner = await User.findById(access.document.ownerId);
    const shortSessionId = tokenHash.slice(0, 6).toUpperCase();

    // Log document viewed
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

    return NextResponse.json({
      sessionToken: rawToken,
      sessionId: shortSessionId,
      expiresAt: sessionExpiry.toISOString(),
      document: {
        id: access.document._id.toString(),
        title: access.document.title,
        description: access.document.description,
        pageCount: access.document.pageCount,
        fileSize: access.document.fileSize,
        createdAt: access.document.createdAt,
      },
      watermark: {
        brand: "DOCSENTIS",
        userEmail: user.email,
        ownerName: owner?.name || "Document Owner",
        ownerEmail: owner?.email || "peaksorateam@gmail.com",
        title: access.document.title,
        sessionId: shortSessionId,
        timestamp: new Date().toLocaleString("en-US", {
          timeZone: "UTC",
          dateStyle: "medium",
          timeStyle: "short",
        }) + " UTC",
      },
    });
  } catch (error: any) {
    console.error("Initialize viewing session error:", error);
    return NextResponse.json(
      { error: "Failed to initialize viewing session" },
      { status: 500 }
    );
  }
}
