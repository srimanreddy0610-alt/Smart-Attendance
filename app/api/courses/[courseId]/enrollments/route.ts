import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { courses, enrollments, students, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = await params;

    const enrolledStudents = await db
      .select({
        enrollmentId: enrollments.id,
        studentId: students.id,
        rollNumber: students.rollNumber,
        department: students.department,
        semester: students.semester,
        section: students.section,
        photoUrl: students.photoUrl,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        enrolledAt: enrollments.enrolledAt,
      })
      .from(enrollments)
      .innerJoin(students, eq(enrollments.studentId, students.id))
      .innerJoin(users, eq(students.clerkUserId, users.clerkUserId))
      .where(eq(enrollments.courseId, parseInt(courseId)))
      .orderBy(students.rollNumber);

    return NextResponse.json(enrolledStudents);
  } catch (error) {
    console.error("[ENROLLMENTS_GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
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

    const { courseId } = await params;
    const body = await req.json();
    const { rollNumber } = body;

    if (!rollNumber) {
      return NextResponse.json(
        { error: "Roll number is required" },
        { status: 400 }
      );
    }

    const [student] = await db
      .select()
      .from(students)
      .where(eq(students.rollNumber, rollNumber))
      .limit(1);

    if (!student) {
      return NextResponse.json(
        { error: "Student not found with this roll number" },
        { status: 404 }
      );
    }

    const [existing] = await db
      .select()
      .from(enrollments)
      .where(
        and(
          eq(enrollments.courseId, parseInt(courseId)),
          eq(enrollments.studentId, student.id)
        )
      )
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "Student already enrolled" },
        { status: 409 }
      );
    }

    const [enrollment] = await db
      .insert(enrollments)
      .values({
        courseId: parseInt(courseId),
        studentId: student.id,
      })
      .returning();

    return NextResponse.json(enrollment, { status: 201 });
  } catch (error) {
    console.error("[ENROLLMENTS_POST]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
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

    const { courseId } = await params;
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json(
        { error: "Student ID is required" },
        { status: 400 }
      );
    }

    await db
      .delete(enrollments)
      .where(
        and(
          eq(enrollments.courseId, parseInt(courseId)),
          eq(enrollments.studentId, parseInt(studentId))
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ENROLLMENTS_DELETE]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
