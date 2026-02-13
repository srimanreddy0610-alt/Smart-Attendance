import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  users,
  courses,
  enrollments,
  students,
  attendanceSessions,
  timetable,
} from "@/lib/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { CourseDetailTabs } from "@/components/teacher/course-detail-tabs";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkUserId, userId))
    .limit(1);

  if (!user || user.role !== "teacher") redirect("/");

  const { courseId } = await params;

  const [course] = await db
    .select()
    .from(courses)
    .where(and(eq(courses.id, parseInt(courseId)), eq(courses.teacherId, user.id)))
    .limit(1);

  if (!course) redirect("/teacher/courses");

  // Get enrolled students
  const enrolledStudents = await db
    .select({
      enrollmentId: enrollments.id,
      studentId: students.id,
      rollNumber: students.rollNumber,
      department: students.department,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      photoUrl: students.photoUrl,
      enrolledAt: enrollments.enrolledAt,
    })
    .from(enrollments)
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .innerJoin(users, eq(students.clerkUserId, users.clerkUserId))
    .where(eq(enrollments.courseId, parseInt(courseId)))
    .orderBy(students.rollNumber);

  // Get recent sessions
  const recentSessions = await db
    .select({
      id: attendanceSessions.id,
      sessionDate: attendanceSessions.sessionDate,
      startTime: attendanceSessions.startTime,
      endTime: attendanceSessions.endTime,
      status: attendanceSessions.status,
      presentCount: sql<number>`(
        SELECT COUNT(*) FROM attendance_records
        WHERE attendance_records.session_id = ${attendanceSessions.id}
        AND attendance_records.status = 'present'
      )`.as("present_count"),
    })
    .from(attendanceSessions)
    .where(eq(attendanceSessions.courseId, parseInt(courseId)))
    .orderBy(desc(attendanceSessions.startTime))
    .limit(20);

  // Get timetable
  const timetableEntries = await db
    .select()
    .from(timetable)
    .where(eq(timetable.courseId, parseInt(courseId)))
    .orderBy(timetable.dayOfWeek, timetable.startTime);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{course.name}</h1>
        <p className="text-muted-foreground">
          {course.code} | {course.department} | Sem {course.semester} | Sec{" "}
          {course.section}
        </p>
      </div>
      <CourseDetailTabs
        course={course}
        enrolledStudents={enrolledStudents}
        recentSessions={recentSessions}
        timetableEntries={timetableEntries}
      />
    </div>
  );
}
