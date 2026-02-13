import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, courses } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { CourseList } from "@/components/teacher/course-list";

export default async function TeacherCoursesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkUserId, userId))
    .limit(1);

  if (!user || user.role !== "teacher") redirect("/");

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
    .orderBy(courses.name);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Courses</h1>
          <p className="text-muted-foreground">
            Manage your courses and students
          </p>
        </div>
      </div>
      <CourseList courses={teacherCourses} />
    </div>
  );
}
