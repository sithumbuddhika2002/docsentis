import { NextResponse } from "next/server";
import { getCurrentUser, getClientIp } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Document } from "@/lib/models/Document";
import { deletePrivateDocument } from "@/lib/storage";
import { recordActivity } from "@/lib/audit";
import { checkDocumentAccess } from "@/lib/permissions";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
});

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const access = await checkDocumentAccess(params.id, user);

    if (!access.allowed || !access.document) {
      return NextResponse.json(
        { error: access.reason || "Access denied" },
        { status: access.code || 403 }
      );
    }

    const docObj = access.document?.toJSON
      ? access.document.toJSON()
      : access.document;

    return NextResponse.json({
      document: docObj,
      isOwner: access.isOwner,
    });
  } catch (error: any) {
    console.error("Get document error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve document" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
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

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid update data" },
        { status: 400 }
      );
    }

    const { title, description, status } = parsed.data;
    const previousStatus = doc.status;

    if (title !== undefined) doc.title = title;
    if (description !== undefined) doc.description = description;
    if (status !== undefined) doc.status = status;

    await doc.save();

    const ipAddress = getClientIp(req.headers);
    const userAgent = req.headers.get("user-agent") || "unknown";

    if (status && status !== previousStatus) {
      await recordActivity({
        documentId: doc._id.toString(),
        documentTitle: doc.title,
        userId: user.id,
        userEmail: user.email,
        action: status === "DISABLED" ? "DOCUMENT_DISABLED" : "DOCUMENT_ENABLED",
        ipAddress,
        userAgent,
      });
    }

    return NextResponse.json({
      success: true,
      document: doc.toJSON(),
    });
  } catch (error: any) {
    console.error("Update document error:", error);
    return NextResponse.json(
      { error: "Failed to update document" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
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

    // Mark as DELETED and clean up private file
    doc.status = "DELETED";
    await doc.save();

    await deletePrivateDocument(doc.storageKey);

    const ipAddress = getClientIp(req.headers);
    const userAgent = req.headers.get("user-agent") || "unknown";

    await recordActivity({
      documentId: doc._id.toString(),
      documentTitle: doc.title,
      userId: user.id,
      userEmail: user.email,
      action: "DOCUMENT_DELETED",
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete document error:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
