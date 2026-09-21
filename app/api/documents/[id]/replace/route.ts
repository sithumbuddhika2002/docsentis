import { NextResponse } from "next/server";
import { getCurrentUser, getClientIp } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Document } from "@/lib/models/Document";
import { uploadPrivateDocument, deletePrivateDocument, extractPageCount } from "@/lib/storage";
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

    await connectToDatabase();
    const doc = await Document.findById(params.id);

    if (!doc || doc.status === "DELETED") {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (doc.ownerId.toString() !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No replacement file provided" }, { status: 400 });
    }

    const MAX_FILE_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 25MB limit" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Upload new file to private storage
    const uploadResult = await uploadPrivateDocument(fileBuffer, file.name);
    const newPageCount = extractPageCount(fileBuffer);

    // Delete previous file from storage
    const oldStorageKey = doc.storageKey;
    await deletePrivateDocument(oldStorageKey);

    // Update document record
    doc.storageKey = uploadResult.storageKey;
    doc.fileSize = uploadResult.size;
    doc.pageCount = Math.max(1, newPageCount);
    await doc.save();

    const ipAddress = getClientIp(req.headers);
    const userAgent = req.headers.get("user-agent") || "unknown";

    await recordActivity({
      documentId: doc._id.toString(),
      documentTitle: doc.title,
      userId: user.id,
      userEmail: user.email,
      action: "DOCUMENT_REPLACED",
      ipAddress,
      userAgent,
      details: {
        newSize: uploadResult.size,
        newPageCount: doc.pageCount,
      },
    });

    return NextResponse.json({
      success: true,
      document: doc.toJSON(),
      message: "Document file replaced successfully",
    });
  } catch (error: any) {
    console.error("Replace document error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to replace document file" },
      { status: 500 }
    );
  }
}
