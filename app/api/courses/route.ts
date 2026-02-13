import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { courses, users, enrollments, students } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { courseSchema } from "@/lib/validations/course";

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
    const parsed = courseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const [course] = await db
      .insert(courses)
      .values({
        ...parsed.data,
        teacherId: user.id,
      })
      .returning();

    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    console.error("[COURSES_POST]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
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

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role === "teacher") {
      const teacherCourses = await db
        .select({
          id: courses.id,
          name: courses.name,
          code: courses.code,
          department: courses.department,
          semester: courses.semester,
          section: courses.section,
          createdAt: courses.createdAt,
          studentCount: sql<number>`(
            SELECT COUNT(*) FROM enrollments WHERE enrollments.course_id = ${courses.id}
          )`.as("student_count"),
        })
        .from(courses)
        .where(eq(courses.teacherId, user.id))
        .orderBy(courses.createdAt);

      return NextResponse.json(teacherCourses);
    }

    // Student: get enrolled courses
    const [student] = await db
      .select()
      .from(students)
      .where(eq(students.clerkUserId, userId))
      .limit(1);

    if (!student) {
      return NextResponse.json([]);
    }

    const enrolledCourses = await db
      .select({
        id: courses.id,
        name: courses.name,
        code: courses.code,
        department: courses.department,
        semester: courses.semester,
        section: courses.section,
        teacherName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`.as("teacher_name"),
        enrolledAt: enrollments.enrolledAt,
      })
      .from(enrollments)
      .innerJoin(courses, eq(enrollments.courseId, courses.id))
      .innerJoin(users, eq(courses.teacherId, users.id))
      .where(eq(enrollments.studentId, student.id))
      .orderBy(courses.name);

    return NextResponse.json(enrolledCourses);
  } catch (error) {
    console.error("[COURSES_GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
