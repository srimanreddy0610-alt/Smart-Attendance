import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/lib/db";
import { AttendanceSession, AttendanceRecord, User } from "@/lib/db/schema";
import { manualAttendanceSchema } from "@/lib/validations/attendance";
import { pusherServer } from "@/lib/pusher/server";
import { CHANNELS, EVENTS } from "@/lib/pusher/channels";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await getDb();

    const user = await User.findOne({ clerkUserId: userId });

    if (!user || user.role !== "teacher") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = manualAttendanceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { sessionId, studentId, status } = parsed.data;

    const session = await AttendanceSession.findById(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Upsert record
    const record = await AttendanceRecord.findOneAndUpdate(
      { sessionId, studentId },
      {
        status,
        isManualEntry: true,
        markedBy: user._id,
        markedAt: new Date(),
      },
      { new: true, upsert: true }
    );

    await pusherServer.trigger(
      CHANNELS.session(sessionId.toString()),
      EVENTS.ATTENDANCE_MARKED,
      {
        studentId: studentId.toString(),
        status,
        isManualEntry: true,
      }
    );

    return NextResponse.json(record);
  } catch (error) {
    console.error("[MANUAL_ATTENDANCE_POST]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
