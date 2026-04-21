import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/lib/db";
import { Stream, User } from "@/lib/db/schema";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await getDb();
    const user = await User.findOne({ clerkUserId: userId });
    if (!user || user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { name, description } = await req.json();
    const stream = await Stream.create({ name, description });

    return NextResponse.json(stream, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    await getDb();
    const streams = await Stream.find().sort({ name: 1 }).lean();
    return NextResponse.json(streams);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
