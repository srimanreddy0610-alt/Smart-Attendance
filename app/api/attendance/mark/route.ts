import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  attendanceSessions,
  attendanceRecords,
  students,
  users,
  enrollments,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { markAttendanceSchema } from "@/lib/validations/attendance";
import { pusherServer } from "@/lib/pusher/server";
import { CHANNELS, EVENTS } from "@/lib/pusher/channels";

function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - b[i]) ** 2;
  }
  return Math.sqrt(sum);
}

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

    if (!user || user.role !== "student") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = markAttendanceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { sessionId, faceDescriptor, confidenceScore, verificationFrames } =
      parsed.data;

    // Verify session is active
    const [session] = await db
      .select()
      .from(attendanceSessions)
      .where(
        and(
          eq(attendanceSessions.id, sessionId),
          eq(attendanceSessions.status, "active")
        )
      )
      .limit(1);

    if (!session) {
      return NextResponse.json(
        { error: "Session not found or already ended" },
        { status: 404 }
      );
    }

    // Get student
    const [student] = await db
      .select()
      .from(students)
      .where(eq(students.clerkUserId, userId))
      .limit(1);

    if (!student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    // Verify student is enrolled
    const [enrollment] = await db
      .select()
      .from(enrollments)
      .where(
        and(
          eq(enrollments.courseId, session.courseId),
          eq(enrollments.studentId, student.id)
        )
      )
      .limit(1);

    if (!enrollment) {
      return NextResponse.json(
        { error: "Not enrolled in this course" },
        { status: 403 }
      );
    }

    // Check if already marked present
    const [existingRecord] = await db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.sessionId, sessionId),
          eq(attendanceRecords.studentId, student.id),
          eq(attendanceRecords.status, "present")
        )
      )
      .limit(1);

    if (existingRecord) {
      return NextResponse.json(
        { error: "Attendance already marked" },
        { status: 409 }
      );
    }

    // Server-side face verification
    if (!student.faceDescriptor) {
      return NextResponse.json(
        { error: "Face not registered. Please complete face enrollment." },
        { status: 400 }
      );
    }

    const storedDescriptor = JSON.parse(student.faceDescriptor) as number[];
    const distance = euclideanDistance(storedDescriptor, faceDescriptor);
    const serverSimilarity = Math.max(
      0,
      Math.min(100, Math.round((1 - distance) * 100))
    );

    const threshold = Number(process.env.NEXT_PUBLIC_FACE_MATCH_THRESHOLD ?? "75");
    if (serverSimilarity < threshold) {
      return NextResponse.json(
        {
          error: "Face not recognized. Please try again.",
          similarity: serverSimilarity,
        },
        { status: 400 }
      );
    }

    // Upsert attendance record
    const [existingAbsent] = await db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.sessionId, sessionId),
          eq(attendanceRecords.studentId, student.id)
        )
      )
      .limit(1);

    let record;
    if (existingAbsent) {
      [record] = await db
        .update(attendanceRecords)
        .set({
          status: "present",
          markedAt: new Date(),
          confidenceScore: serverSimilarity,
          verificationFrames,
        })
        .where(eq(attendanceRecords.id, existingAbsent.id))
        .returning();
    } else {
      [record] = await db
        .insert(attendanceRecords)
        .values({
          sessionId,
          studentId: student.id,
          status: "present",
          markedAt: new Date(),
          confidenceScore: serverSimilarity,
          verificationFrames,
        })
        .returning();
    }

    // Notify via Pusher
    const studentName = [user.firstName, user.lastName]
      .filter(Boolean)
      .join(" ");

    await pusherServer.trigger(
      CHANNELS.session(sessionId),
      EVENTS.ATTENDANCE_MARKED,
      {
        studentId: student.id,
        studentName,
        rollNumber: student.rollNumber,
        confidenceScore: serverSimilarity,
      }
    );

    return NextResponse.json({
      success: true,
      similarity: serverSimilarity,
      record,
    });
  } catch (error) {
    console.error("[MARK_ATTENDANCE_POST]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
