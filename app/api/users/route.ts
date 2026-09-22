import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { User } from "@/lib/models/User";

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
    const search = url.searchParams.get("search")?.toLowerCase().trim();

    await connectToDatabase();

    const query: any = {};
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
      ];
    }

    const limitParam = parseInt(url.searchParams.get("limit") || "100", 10);
    const limit = Math.min(Math.max(limitParam || 100, 1), 200);

    const users = await User.find(query)
      .select("name email role isInvited createdAt")
      .sort({ createdAt: -1 })
      .limit(limit);

    const formatted = users.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      isInvited: !!u.isInvited,
      createdAt: u.createdAt,
    }));

    return NextResponse.json({ users: formatted });
  } catch (error: any) {
    console.error("Get users error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve users" },
      { status: 500 }
    );
  }
}
