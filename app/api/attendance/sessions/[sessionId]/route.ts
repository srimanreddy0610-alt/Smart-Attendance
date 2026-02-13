import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  attendanceSessions,
  attendanceRecords,
  students,
  users,
  courses,
  enrollments,
} from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { pusherServer } from "@/lib/pusher/server";
import { CHANNELS, EVENTS } from "@/lib/pusher/channels";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await params;

    const [session] = await db
      .select({
        id: attendanceSessions.id,
        courseId: attendanceSessions.courseId,
        courseName: courses.name,
        courseCode: courses.code,
        startTime: attendanceSessions.startTime,
        endTime: attendanceSessions.endTime,
        status: attendanceSessions.status,
        sessionDate: attendanceSessions.sessionDate,
      })
      .from(attendanceSessions)
      .innerJoin(courses, eq(attendanceSessions.courseId, courses.id))
      .where(eq(attendanceSessions.id, parseInt(sessionId)))
      .limit(1);

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Get all enrolled students with their attendance records
    const enrolledStudents = await db
      .select({
        studentId: students.id,
        rollNumber: students.rollNumber,
        firstName: users.firstName,
        lastName: users.lastName,
        photoUrl: students.photoUrl,
      })
      .from(enrollments)
      .innerJoin(students, eq(enrollments.studentId, students.id))
      .innerJoin(users, eq(students.clerkUserId, users.clerkUserId))
      .where(eq(enrollments.courseId, session.courseId));

    const records = await db
      .select()
      .from(attendanceRecords)
      .where(eq(attendanceRecords.sessionId, parseInt(sessionId)));

    const recordMap = new Map(records.map((r) => [r.studentId, r]));

    const studentRecords = enrolledStudents.map((s) => {
      const record = recordMap.get(s.studentId);
      return {
        id: record?.id ?? null,
        studentId: s.studentId,
        studentName: [s.firstName, s.lastName].filter(Boolean).join(" "),
        rollNumber: s.rollNumber,
        photoUrl: s.photoUrl,
        status: record?.status ?? "absent",
        markedAt: record?.markedAt?.toISOString() ?? null,
        confidenceScore: record?.confidenceScore ?? null,
        isManualEntry: record?.isManualEntry ?? false,
      };
    });

    const presentCount = studentRecords.filter(
      (r) => r.status === "present"
    ).length;

    return NextResponse.json({
      ...session,
      records: studentRecords,
      totalStudents: enrolledStudents.length,
      presentCount,
    });
  } catch (error) {
    console.error("[SESSION_GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
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

    const { sessionId } = await params;

    const [session] = await db
      .select()
      .from(attendanceSessions)
      .where(
        and(
          eq(attendanceSessions.id, parseInt(sessionId)),
          eq(attendanceSessions.teacherId, user.id)
        )
      )
      .limit(1);

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const [updated] = await db
      .update(attendanceSessions)
      .set({ status: "ended", endTime: new Date() })
      .where(eq(attendanceSessions.id, parseInt(sessionId)))
      .returning();

    await pusherServer.trigger(
      CHANNELS.session(parseInt(sessionId)),
      EVENTS.SESSION_ENDED,
      { sessionId: parseInt(sessionId) }
    );

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[SESSION_PUT]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
