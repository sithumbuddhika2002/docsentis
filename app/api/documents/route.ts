import { NextResponse } from "next/server";
import { getCurrentUser, getClientIp } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Document } from "@/lib/models/Document";
import { Permission } from "@/lib/models/Permission";
import { uploadPrivateDocument, extractPageCount } from "@/lib/storage";
import { recordActivity } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    if (user.role === "OWNER" || user.role === "ADMIN") {
      const query = user.role === "ADMIN" ? { status: { $ne: "DELETED" } } : { ownerId: user.id, status: { $ne: "DELETED" } };
      const docs = await Document.find(query).sort({ createdAt: -1 });

      // Gather permission counts & recent view info for each document
      const docIds = docs.map((d) => d._id);
      const permissions = await Permission.find({
        documentId: { $in: docIds },
        status: { $in: ["ACTIVE", "EXPIRING_SOON"] },
      });

      const permCountMap = new Map<string, number>();
      permissions.forEach((p) => {
        const idStr = p.documentId.toString();
        permCountMap.set(idStr, (permCountMap.get(idStr) || 0) + 1);
      });

      const result = docs.map((doc) => {
        const dObj = doc.toJSON();
        return {
          ...dObj,
          activePermissionsCount: permCountMap.get(doc._id.toString()) || 0,
        };
      });

      return NextResponse.json({ documents: result });
    }

    // Normal USER: find permissions granted to this user
    const now = new Date();
    const userPermissions = await Permission.find({
      userId: user.id,
      status: { $in: ["ACTIVE", "EXPIRING_SOON"] },
      expiresAt: { $gt: now },
    }).populate("documentId");

    const validDocs = userPermissions
      .filter((p: any) => p.documentId && p.documentId.status === "ACTIVE")
      .map((p: any) => {
        const docObj = p.documentId.toJSON();
        return {
          ...docObj,
          permissionExpiresAt: p.expiresAt,
          permissionStatus: p.status,
        };
      });

    return NextResponse.json({ documents: validDocs });
  } catch (error: any) {
    console.error("Fetch documents error:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only document owners can upload assignments" },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = (formData.get("title") as string)?.trim();
    const description = (formData.get("description") as string)?.trim() || "";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!title) {
      return NextResponse.json({ error: "Document title is required" }, { status: 400 });
    }

    // Limit to 25MB
    const MAX_FILE_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 25MB limit" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Upload to private storage
    const uploadResult = await uploadPrivateDocument(fileBuffer, file.name);

    // Calculate page count
    const pageCount = extractPageCount(fileBuffer);

    await connectToDatabase();

    const newDoc = await Document.create({
      ownerId: user.id,
      title,
      description,
      storageKey: uploadResult.storageKey,
      fileSize: uploadResult.size,
      mimeType: "application/pdf",
      pageCount: Math.max(1, pageCount),
      status: "ACTIVE",
    });

    const ipAddress = getClientIp(req.headers);
    const userAgent = req.headers.get("user-agent") || "unknown";

    await recordActivity({
      documentId: newDoc._id.toString(),
      documentTitle: newDoc.title,
      userId: user.id,
      userEmail: user.email,
      action: "DOCUMENT_UPLOADED",
      ipAddress,
      userAgent,
      details: {
        fileSize: uploadResult.size,
        pageCount: newDoc.pageCount,
      },
    });

    return NextResponse.json({
      success: true,
      document: newDoc.toJSON(),
    });
  } catch (error: any) {
    console.error("Document upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload document" },
      { status: 500 }
    );
  }
}
