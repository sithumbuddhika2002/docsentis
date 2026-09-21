import { NextResponse } from "next/server";
import { hashToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { ViewingSession } from "@/lib/models/ViewingSession";
import { Document } from "@/lib/models/Document";
import { Permission } from "@/lib/models/Permission";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const token = body.token;

    if (!token) {
      return NextResponse.json(
        { valid: false, reason: "Missing viewing session token" },
        { status: 400 }
      );
    }

    const tokenHash = hashToken(token);

    await connectToDatabase();

    const session = await ViewingSession.findOne({
      sessionTokenHash: tokenHash,
      documentId: params.id,
    });

    if (!session) {
      return NextResponse.json(
        { valid: false, reason: "Session not found or invalid" },
        { status: 403 }
      );
    }

    if (session.status !== "ACTIVE") {
      return NextResponse.json(
        { valid: false, reason: "Your access to this document has been revoked." },
        { status: 403 }
      );
    }

    if (new Date() > session.expiresAt) {
      session.status = "EXPIRED";
      await session.save();
      return NextResponse.json(
        { valid: false, reason: "Your viewing session has expired." },
        { status: 410 }
      );
    }

    const doc = await Document.findById(params.id);
    if (!doc || doc.status === "DELETED") {
      session.status = "REVOKED";
      await session.save();
      return NextResponse.json(
        { valid: false, reason: "Document no longer exists." },
        { status: 404 }
      );
    }

    if (doc.status === "DISABLED") {
      return NextResponse.json(
        { valid: false, reason: "This document has been temporarily disabled by the owner." },
        { status: 403 }
      );
    }

    // Check user permission if not owner
    if (doc.ownerId.toString() !== session.userId.toString()) {
      const perm = await Permission.findOne({
        documentId: doc._id,
        userId: session.userId,
      });

      if (!perm || perm.status === "REVOKED") {
        session.status = "REVOKED";
        await session.save();
        return NextResponse.json(
          { valid: false, reason: "Your access to this document has been revoked." },
          { status: 403 }
        );
      }

      if (new Date() > perm.expiresAt) {
        session.status = "EXPIRED";
        await session.save();
        return NextResponse.json(
          { valid: false, reason: "Your viewing permission has expired." },
          { status: 410 }
        );
      }
    }

    // Update last activity timestamp
    session.lastActivity = new Date();
    await session.save();

    return NextResponse.json({ valid: true });
  } catch (error: any) {
    console.error("Heartbeat error:", error);
    return NextResponse.json(
      { valid: false, error: "Failed to process heartbeat" },
      { status: 500 }
    );
  }
}
