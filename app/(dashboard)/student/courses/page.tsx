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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, User } from "lucide-react";

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
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              You are not enrolled in any courses yet.
            </p>
            <p className="text-sm text-muted-foreground">
              Your teacher will add you to courses.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {coursesWithAttendance.map((c) => (
            <Card key={c.courseId}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{c.courseName}</CardTitle>
                  <Badge variant={getBadgeVariant(c.percentage)}>
                    {c.percentage}%
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{c.courseCode}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>
                    {[c.teacherFirstName, c.teacherLastName]
                      .filter(Boolean)
                      .join(" ")}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>
                    {c.department} | Sem {c.semester} | Sec {c.section}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Attended: {c.present} / {c.total} sessions
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
