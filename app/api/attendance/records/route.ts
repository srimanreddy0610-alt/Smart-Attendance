import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  attendanceRecords,
  attendanceSessions,
  courses,
  students,
  users,
} from "@/lib/db/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");
    const studentId = searchParams.get("studentId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkUserId, userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const conditions = [];

    // If student, restrict to their own records
    if (user.role === "student") {
      const [student] = await db
        .select()
        .from(students)
        .where(eq(students.clerkUserId, userId))
        .limit(1);

      if (!student) {
        return NextResponse.json([]);
      }

      conditions.push(eq(attendanceRecords.studentId, student.id));
    }

    if (studentId) {
      conditions.push(eq(attendanceRecords.studentId, parseInt(studentId)));
    }

    if (courseId) {
      conditions.push(eq(attendanceSessions.courseId, parseInt(courseId)));
    }

    if (startDate) {
      conditions.push(gte(attendanceSessions.sessionDate, new Date(startDate)));
    }

    if (endDate) {
      conditions.push(lte(attendanceSessions.sessionDate, new Date(endDate)));
    }

    const records = await db
      .select({
        id: attendanceRecords.id,
        sessionId: attendanceRecords.sessionId,
        studentId: attendanceRecords.studentId,
        status: attendanceRecords.status,
        markedAt: attendanceRecords.markedAt,
        confidenceScore: attendanceRecords.confidenceScore,
        isManualEntry: attendanceRecords.isManualEntry,
        sessionDate: attendanceSessions.sessionDate,
        courseName: courses.name,
        courseCode: courses.code,
        courseId: courses.id,
      })
      .from(attendanceRecords)
      .innerJoin(
        attendanceSessions,
        eq(attendanceRecords.sessionId, attendanceSessions.id)
      )
      .innerJoin(courses, eq(attendanceSessions.courseId, courses.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(attendanceSessions.sessionDate))
      .limit(100);

    return NextResponse.json(records);
  } catch (error) {
    console.error("[RECORDS_GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
