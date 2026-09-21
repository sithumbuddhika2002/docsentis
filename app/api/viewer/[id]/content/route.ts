import { NextResponse } from "next/server";
import { hashToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { ViewingSession } from "@/lib/models/ViewingSession";
import { Document } from "@/lib/models/Document";
import { Permission } from "@/lib/models/Permission";
import { getPrivateDocumentBuffer } from "@/lib/storage";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Extract token from Authorization header or URL query
    let token: string | null = null;
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    }

    if (!token) {
      const url = new URL(req.url);
      token = url.searchParams.get("token");
    }

    if (!token) {
      return NextResponse.json(
        { error: "Missing viewing session token" },
        { status: 401 }
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
        { error: "Invalid viewing session" },
        { status: 403 }
      );
    }

    if (session.status !== "ACTIVE" || new Date() > session.expiresAt) {
      return NextResponse.json(
        { error: "Viewing session expired or revoked" },
        { status: 403 }
      );
    }

    const doc = await Document.findById(params.id);
    if (!doc || doc.status === "DELETED") {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    if (doc.status === "DISABLED") {
      return NextResponse.json(
        { error: "Document is disabled" },
        { status: 403 }
      );
    }

    // Verify user permission is still active (unless owner)
    if (doc.ownerId.toString() !== session.userId.toString()) {
      const perm = await Permission.findOne({
        documentId: doc._id,
        userId: session.userId,
      });

      if (!perm || perm.status === "REVOKED" || new Date() > perm.expiresAt) {
        session.status = "REVOKED";
        await session.save();
        return NextResponse.json(
          { error: "Document permission has been revoked or expired" },
          { status: 403 }
        );
      }
    }

    // Read private document buffer
    const buffer = await getPrivateDocumentBuffer(doc.storageKey);

    // Return binary stream with headers
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": buffer.length.toString(),
        "Content-Disposition": 'inline; filename="protected_document.pdf"',
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: any) {
    console.error("Fetch document content error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve document content" },
      { status: 500 }
    );
  }
}
