import { NextResponse } from "next/server";
import { getCurrentUser, getSessionUserId } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { AttendanceSession, AttendanceRecord, User } from "@/lib/db/schema";
import { manualAttendanceSchema } from "@/lib/validations/attendance";
import { pusherServer } from "@/lib/pusher/server";
import { CHANNELS, EVENTS } from "@/lib/pusher/channels";

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await getDb();

    const user = await User.findById(userId);

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

    try {
      await pusherServer.trigger(
        CHANNELS.session(sessionId.toString()),
        EVENTS.ATTENDANCE_MARKED,
        {
          studentId: studentId.toString(),
          status,
          isManualEntry: true,
        }
      );
    } catch (pusherError) {
      console.warn("[PUSHER_TRIGGER_ERROR] Skipping manual attendance notification:", pusherError);
    }

    return NextResponse.json(record);
  } catch (error) {
    console.error("[MANUAL_ATTENDANCE_POST]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


