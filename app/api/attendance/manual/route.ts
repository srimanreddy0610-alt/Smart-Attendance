import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { attendanceSessions, attendanceRecords, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { manualAttendanceSchema } from "@/lib/validations/attendance";
import { pusherServer } from "@/lib/pusher/server";
import { CHANNELS, EVENTS } from "@/lib/pusher/channels";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkUserId, userId))
      .limit(1);

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

    const [session] = await db
      .select()
      .from(attendanceSessions)
      .where(eq(attendanceSessions.id, sessionId))
      .limit(1);

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Check existing record
    const [existing] = await db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.sessionId, sessionId),
          eq(attendanceRecords.studentId, studentId)
        )
      )
      .limit(1);

    let record;
    if (existing) {
      [record] = await db
        .update(attendanceRecords)
        .set({
          status,
          isManualEntry: true,
          markedBy: user.id,
          markedAt: new Date(),
        })
        .where(eq(attendanceRecords.id, existing.id))
        .returning();
    } else {
      [record] = await db
        .insert(attendanceRecords)
        .values({
          sessionId,
          studentId,
          status,
          isManualEntry: true,
          markedBy: user.id,
          markedAt: new Date(),
        })
        .returning();
    }

    await pusherServer.trigger(
      CHANNELS.session(sessionId),
      EVENTS.ATTENDANCE_MARKED,
      {
        studentId,
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
