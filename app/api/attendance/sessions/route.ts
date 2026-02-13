import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  attendanceSessions,
  courses,
  users,
  enrollments,
  attendanceRecords,
} from "@/lib/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { startSessionSchema } from "@/lib/validations/attendance";
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
    const parsed = startSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { courseId, duration } = parsed.data;

    // Verify course belongs to teacher
    const [course] = await db
      .select()
      .from(courses)
      .where(and(eq(courses.id, courseId), eq(courses.teacherId, user.id)))
      .limit(1);

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Check for existing active session
    const [activeSession] = await db
      .select()
      .from(attendanceSessions)
      .where(
        and(
          eq(attendanceSessions.courseId, courseId),
          eq(attendanceSessions.status, "active")
        )
      )
      .limit(1);

    if (activeSession) {
      return NextResponse.json(
        { error: "An active session already exists for this course" },
        { status: 409 }
      );
    }

    const now = new Date();
    const endTime = new Date(now.getTime() + duration * 60 * 1000);

    const [session] = await db
      .insert(attendanceSessions)
      .values({
        courseId,
        teacherId: user.id,
        sessionDate: now,
        startTime: now,
        endTime,
        status: "active",
        metadata: { duration },
      })
      .returning();

    // Notify enrolled students via Pusher
    const teacherName = [user.firstName, user.lastName]
      .filter(Boolean)
      .join(" ");

    await pusherServer.trigger(
      CHANNELS.course(courseId),
      EVENTS.SESSION_STARTED,
      {
        sessionId: session.id,
        courseName: course.name,
        teacherName,
      }
    );

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error("[SESSIONS_POST]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");
    const status = searchParams.get("status");

    let query = db
      .select({
        id: attendanceSessions.id,
        courseId: attendanceSessions.courseId,
        courseName: courses.name,
        courseCode: courses.code,
        teacherName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`.as("teacher_name"),
        sessionDate: attendanceSessions.sessionDate,
        startTime: attendanceSessions.startTime,
        endTime: attendanceSessions.endTime,
        status: attendanceSessions.status,
        presentCount: sql<number>`(
          SELECT COUNT(*) FROM attendance_records
          WHERE attendance_records.session_id = ${attendanceSessions.id}
          AND attendance_records.status = 'present'
        )`.as("present_count"),
        totalEnrolled: sql<number>`(
          SELECT COUNT(*) FROM enrollments
          WHERE enrollments.course_id = ${attendanceSessions.courseId}
        )`.as("total_enrolled"),
      })
      .from(attendanceSessions)
      .innerJoin(courses, eq(attendanceSessions.courseId, courses.id))
      .innerJoin(users, eq(attendanceSessions.teacherId, users.id))
      .orderBy(desc(attendanceSessions.startTime))
      .$dynamic();

    if (courseId) {
      query = query.where(
        eq(attendanceSessions.courseId, parseInt(courseId))
      );
    }

    const sessions = await query;

    return NextResponse.json(sessions);
  } catch (error) {
    console.error("[SESSIONS_GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
