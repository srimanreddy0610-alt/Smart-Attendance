import { getDb } from "@/lib/db";
import {
  AttendanceSession,
  AttendanceRecord,
  Enrollment,
} from "@/lib/db/schema";
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

  await getDb();

  const now = new Date();

  const activeSessions = await AttendanceSession.find({
    status: "active",
    endTime: { $lt: now }
  });

  for (const session of activeSessions) {
    await AttendanceSession.findByIdAndUpdate(session._id, { status: "ended" });

    const enrolledStudents = await Enrollment.find({ courseId: session.courseId }, 'studentId');

    const markedStudents = await AttendanceRecord.find({
      sessionId: session._id,
      status: "present"
    }, 'studentId');

    const markedSet = new Set(markedStudents.map((r) => r.studentId.toString()));

    const absentRecords = enrolledStudents
      .filter((e) => !markedSet.has(e.studentId.toString()))
      .map((e) => ({
        sessionId: session._id,
        studentId: e.studentId,
        status: "absent" as const,
        createdAt: now,
      }));

    if (absentRecords.length > 0) {
      await AttendanceRecord.insertMany(absentRecords);
    }

    try {
      await pusherServer.trigger(
        CHANNELS.session(session._id.toString()),
        EVENTS.SESSION_ENDED,
        { sessionId: session._id.toString() }
      );
    } catch (pusherError) {
      console.warn("[PUSHER_TRIGGER_ERROR] Skipping automated session end notification:", pusherError);
    }
  }

  return Response.json({
    processed: activeSessions.length,
    timestamp: now.toISOString(),
  });
}

