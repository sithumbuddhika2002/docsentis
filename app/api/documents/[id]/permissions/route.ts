import { NextResponse } from "next/server";
import { getCurrentUser, getClientIp, hashPassword } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Document } from "@/lib/models/Document";
import { Permission } from "@/lib/models/Permission";
import { User } from "@/lib/models/User";
import { recordActivity } from "@/lib/audit";
import { computePermissionStatus } from "@/lib/permissions";
import { z } from "zod";
import crypto from "crypto";

const grantSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  expiresAt: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)),
  name: z.string().max(60).optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
});

export async function GET(
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

    const permissions = await Permission.find({ documentId: doc._id })
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    const formatted = permissions.map((p: any) => {
      const computed = computePermissionStatus(p.status, p.expiresAt);
      return {
        id: p._id.toString(),
        documentId: p.documentId.toString(),
        userId: p.userId?._id?.toString() || p.userId?.toString(),
        userName: p.userId?.name || "Unknown User",
        userEmail: p.userId?.email || "unknown@university.edu",
        status: computed,
        expiresAt: p.expiresAt,
        createdAt: p.createdAt,
        revokedAt: p.revokedAt,
      };
    });

    return NextResponse.json({ permissions: formatted });
  } catch (error: any) {
    console.error("Get permissions error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve permissions" },
      { status: 500 }
    );
  }
}

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

    const body = await req.json();
    const parsed = grantSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { email, expiresAt, name, password } = parsed.data;
    const expiryDate = new Date(expiresAt);

    if (expiryDate.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "Expiration date must be in the future" },
        { status: 400 }
      );
    }

    // Find or create target user
    let targetUser = await User.findOne({ email });
    let isNewUser = false;
    let finalPassword = password && password.trim().length > 0 ? password.trim() : undefined;

    if (!targetUser) {
      isNewUser = true;
      if (!finalPassword) {
        finalPassword = crypto.randomBytes(6).toString("hex");
      }
      const passwordHash = await hashPassword(finalPassword);
      targetUser = await User.create({
        name: name?.trim() || email.split("@")[0],
        email,
        passwordHash,
        role: "USER",
        isInvited: true,
      });
    } else {
      // If target user already exists, update password if admin provided one
      let userUpdated = false;
      if (finalPassword) {
        targetUser.passwordHash = await hashPassword(finalPassword);
        userUpdated = true;
      }
      if (name?.trim() && targetUser.name === targetUser.email.split("@")[0]) {
        targetUser.name = name.trim();
        userUpdated = true;
      }
      if (userUpdated) {
        await targetUser.save();
      }
    }

    // Check if permission already exists
    let permission = await Permission.findOne({
      documentId: doc._id,
      userId: targetUser._id,
    });

    if (permission) {
      permission.expiresAt = expiryDate;
      permission.status = "ACTIVE";
      permission.revokedAt = undefined;
      permission.grantedBy = user.id as any;
      await permission.save();
    } else {
      permission = await Permission.create({
        documentId: doc._id,
        userId: targetUser._id,
        grantedBy: user.id,
        expiresAt: expiryDate,
        status: "ACTIVE",
      });
    }

    const ipAddress = getClientIp(req.headers);
    const userAgent = req.headers.get("user-agent") || "unknown";

    await recordActivity({
      documentId: doc._id.toString(),
      documentTitle: doc.title,
      userId: user.id,
      userEmail: user.email,
      action: "PERMISSION_GRANTED",
      ipAddress,
      userAgent,
      details: {
        targetUserEmail: targetUser.email,
        expiresAt: expiryDate.toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      permission: {
        id: permission._id.toString(),
        userId: targetUser._id.toString(),
        userName: targetUser.name,
        userEmail: targetUser.email,
        status: "ACTIVE",
        expiresAt: permission.expiresAt,
        createdAt: permission.createdAt,
      },
      isNewUser,
      sharedCredentials: finalPassword
        ? {
            email: targetUser.email,
            password: finalPassword,
            name: targetUser.name,
          }
        : null,
      message: isNewUser
        ? "User account created and access granted successfully"
        : "Access granted successfully",
    });
  } catch (error: any) {
    console.error("Grant permission error:", error);
    return NextResponse.json(
      { error: "Failed to grant permission" },
      { status: 500 }
    );
  }
}
