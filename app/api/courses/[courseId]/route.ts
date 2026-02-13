import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { courses, users, enrollments, timetable } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { courseSchema } from "@/lib/validations/course";

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

    const [course] = await db
      .select({
        id: courses.id,
        name: courses.name,
        code: courses.code,
        department: courses.department,
        semester: courses.semester,
        section: courses.section,
        teacherId: courses.teacherId,
        createdAt: courses.createdAt,
        teacherName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`.as("teacher_name"),
        studentCount: sql<number>`(
          SELECT COUNT(*) FROM enrollments WHERE enrollments.course_id = ${courses.id}
        )`.as("student_count"),
      })
      .from(courses)
      .innerJoin(users, eq(courses.teacherId, users.id))
      .where(eq(courses.id, parseInt(courseId)))
      .limit(1);

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const timetableEntries = await db
      .select()
      .from(timetable)
      .where(eq(timetable.courseId, parseInt(courseId)))
      .orderBy(timetable.dayOfWeek, timetable.startTime);

    return NextResponse.json({ ...course, timetable: timetableEntries });
  } catch (error) {
    console.error("[COURSE_GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const [course] = await db
      .select()
      .from(courses)
      .where(
        and(eq(courses.id, parseInt(courseId)), eq(courses.teacherId, user.id))
      )
      .limit(1);

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = courseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(courses)
      .set(parsed.data)
      .where(eq(courses.id, parseInt(courseId)))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[COURSE_PUT]", error);
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
    const [course] = await db
      .select()
      .from(courses)
      .where(
        and(eq(courses.id, parseInt(courseId)), eq(courses.teacherId, user.id))
      )
      .limit(1);

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    await db.delete(courses).where(eq(courses.id, parseInt(courseId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[COURSE_DELETE]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
