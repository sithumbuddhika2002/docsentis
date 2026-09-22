import { NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db/mongodb";
import { User } from "@/lib/models/User";
import { Permission } from "@/lib/models/Permission";
import { ViewingSession } from "@/lib/models/ViewingSession";
import { hashPassword, signAuthToken } from "@/lib/auth";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(60),
  email: z.string().email("Invalid email address").toLowerCase(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["OWNER", "USER", "ADMIN"]).default("USER"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    const { name, email, password, role } = parsed.data;

    await connectToDatabase();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // Check if this account was created via invite or permission grant
      const hasPermissions = await Permission.exists({ userId: existingUser._id });
      const hasViewingSession = await ViewingSession.exists({ userId: existingUser._id });

      const isInvitedAccount =
        existingUser.isInvited === true ||
        (existingUser.isInvited !== false && existingUser.role === "USER" && (hasPermissions || !hasViewingSession));

      if (isInvitedAccount) {
        // Complete / activate registration for this invited user
        const passwordHash = await hashPassword(password);
        existingUser.name = name;
        existingUser.passwordHash = passwordHash;
        existingUser.isInvited = false;
        if (role) {
          existingUser.role = role;
        }
        await existingUser.save();

        const sessionUser = {
          id: existingUser._id.toString(),
          email: existingUser.email,
          name: existingUser.name,
          role: existingUser.role,
        };

        const token = signAuthToken(sessionUser);

        const response = NextResponse.json({
          success: true,
          user: sessionUser,
          message: "Account registration completed successfully",
        });

        response.cookies.set("peaksora_auth_token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60, // 7 days
          path: "/",
        });

        return response;
      }

      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const newUser = await User.create({
      name,
      email,
      passwordHash,
      role,
    });

    const sessionUser = {
      id: newUser._id.toString(),
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
    };

    const token = signAuthToken(sessionUser);

    const response = NextResponse.json({
      success: true,
      user: sessionUser,
    });

    // Set secure HTTP-only cookie
    response.cookies.set("peaksora_auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Failed to create account. Please try again." },
      { status: 500 }
    );
  }
}
