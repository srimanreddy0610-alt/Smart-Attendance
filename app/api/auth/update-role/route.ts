import { NextResponse } from "next/server";
import { getCurrentUser, getSessionUserId } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { User } from "@/lib/db/schema";

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role } = await req.json();
    if (!["teacher", "student", "parent", "admin"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    await getDb();

    // Update DB
    await User.updateOne(
      { _id: userId },
      { $set: { role } }
    );

    // Update Clerk Metadata to persist it
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        role: role
      }
    });

    console.log(`[AUTH] Manual role update for ${userId} to ${role}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[UPDATE_ROLE_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


