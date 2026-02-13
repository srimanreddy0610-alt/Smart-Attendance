import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { students, enrollments, courses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { AttendanceHistory } from "@/components/student/attendance-history";

export default async function StudentAttendancePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [student] = await db
    .select()
    .from(students)
    .where(eq(students.clerkUserId, userId))
    .limit(1);

  if (!student) redirect("/onboarding");

  const enrolledCourses = await db
    .select({
      courseId: courses.id,
      courseName: courses.name,
      courseCode: courses.code,
    })
    .from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(eq(enrollments.studentId, student.id))
    .orderBy(courses.name);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Attendance History</h1>
        <p className="text-muted-foreground">
          View your attendance records
        </p>
      </div>
      <AttendanceHistory courses={enrolledCourses} />
    </div>
  );
}
