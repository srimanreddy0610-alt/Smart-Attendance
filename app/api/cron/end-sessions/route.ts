import { db } from "@/lib/db";
import {
  attendanceSessions,
  attendanceRecords,
  enrollments,
} from "@/lib/db/schema";
import { eq, and, lt, isNotNull } from "drizzle-orm";
import { pusherServer } from "@/lib/pusher/server";
import { CHANNELS, EVENTS } from "@/lib/pusher/channels";

export async function POST(req: Request) {
  // Verify QStash signature in production
  const authHeader = req.headers.get("authorization");
  if (
    process.env.NODE_ENV === "production" &&
    authHeader !== `Bearer ${process.env.QSTASH_TOKEN}`
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();

  const activeSessions = await db
    .select()
    .from(attendanceSessions)
    .where(
      and(
        eq(attendanceSessions.status, "active"),
        lt(attendanceSessions.endTime, now)
      )
    );

  for (const session of activeSessions) {
    await db
      .update(attendanceSessions)
      .set({ status: "ended" })
      .where(eq(attendanceSessions.id, session.id));

    const enrolledStudents = await db
      .select({ studentId: enrollments.studentId })
      .from(enrollments)
      .where(eq(enrollments.courseId, session.courseId));

    const markedStudents = await db
      .select({ studentId: attendanceRecords.studentId })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.sessionId, session.id),
          eq(attendanceRecords.status, "present")
        )
      );

    const markedSet = new Set(markedStudents.map((r) => r.studentId));

    const absentRecords = enrolledStudents
      .filter((e) => !markedSet.has(e.studentId))
      .map((e) => ({
        sessionId: session.id,
        studentId: e.studentId,
        status: "absent" as const,
        createdAt: now,
      }));

    if (absentRecords.length > 0) {
      await db.insert(attendanceRecords).values(absentRecords);
    }

    await pusherServer.trigger(
      CHANNELS.session(session.id),
      EVENTS.SESSION_ENDED,
      { sessionId: session.id }
    );
  }

  return Response.json({
    processed: activeSessions.length,
    timestamp: now.toISOString(),
  });
}
