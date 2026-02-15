import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  students,
  enrollments,
  courses,
  users,
  attendanceRecords,
  attendanceSessions,
} from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { BookOpen, User, GraduationCap } from "lucide-react";

export default async function StudentCoursesPage() {
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
      department: courses.department,
      semester: courses.semester,
      section: courses.section,
      teacherFirstName: users.firstName,
      teacherLastName: users.lastName,
    })
    .from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .innerJoin(users, eq(courses.teacherId, users.id))
    .where(eq(enrollments.studentId, student.id))
    .orderBy(courses.name);

  // Get attendance percentage per course
  const coursesWithAttendance = await Promise.all(
    enrolledCourses.map(async (c) => {
      const totalSessions = await db
        .select({ count: sql<number>`COUNT(*)`.as("count") })
        .from(attendanceSessions)
        .where(eq(attendanceSessions.courseId, c.courseId));

      const presentCount = await db
        .select({ count: sql<number>`COUNT(*)`.as("count") })
        .from(attendanceRecords)
        .innerJoin(
          attendanceSessions,
          eq(attendanceRecords.sessionId, attendanceSessions.id)
        )
        .where(
          and(
            eq(attendanceSessions.courseId, c.courseId),
            eq(attendanceRecords.studentId, student.id),
            eq(attendanceRecords.status, "present")
          )
        );

      const total = Number(totalSessions[0]?.count ?? 0);
      const present = Number(presentCount[0]?.count ?? 0);
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

      return { ...c, total, present, percentage };
    })
  );

  function getBadgeVariant(percentage: number) {
    if (percentage >= 75) return "default";
    if (percentage >= 50) return "secondary";
    return "destructive";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Courses</h1>
        <p className="text-muted-foreground">
          Courses you are enrolled in
        </p>
      </div>

      {coursesWithAttendance.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-16 text-muted-foreground">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted mb-4">
            <BookOpen className="h-7 w-7 opacity-50" />
          </div>
          <p className="font-medium mb-1">No courses yet</p>
          <p className="text-sm">Your teacher will add you to courses</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {coursesWithAttendance.map((c) => (
            <div key={c.courseId} className="group rounded-xl border bg-card p-5 hover:shadow-md transition-all duration-300">
              <div className="flex items-start justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
                  <GraduationCap className="h-5 w-5 text-primary" />
                </div>
                <Badge variant={getBadgeVariant(c.percentage)}>
                  {c.percentage}%
                </Badge>
              </div>
              <h3 className="font-semibold text-base mb-0.5 line-clamp-2">{c.courseName}</h3>
              <p className="text-xs font-mono text-muted-foreground mb-3">{c.courseCode}</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <User className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {[c.teacherFirstName, c.teacherLastName].filter(Boolean).join(" ")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {c.department} &middot; Sem {c.semester} &middot; Sec {c.section}
                </p>
                <p className="text-xs text-muted-foreground">
                  Attended: {c.present} / {c.total} sessions
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
