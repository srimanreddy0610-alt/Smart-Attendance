import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  users,
  students,
  enrollments,
  courses,
  attendanceSessions,
  attendanceRecords,
  timetable,
} from "@/lib/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  ClipboardCheck,
  Calendar,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { NotificationListener } from "@/components/student/notification-listener";

export default async function StudentDashboard() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [student] = await db
    .select()
    .from(students)
    .where(eq(students.clerkUserId, userId))
    .limit(1);

  if (!student) redirect("/onboarding");

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkUserId, userId))
    .limit(1);

  // Enrolled courses
  const enrolledCourses = await db
    .select({
      courseId: courses.id,
      courseName: courses.name,
      courseCode: courses.code,
      teacherName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`.as("teacher_name"),
    })
    .from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .innerJoin(users, eq(courses.teacherId, users.id))
    .where(eq(enrollments.studentId, student.id));

  const courseIds = enrolledCourses.map((c) => c.courseId);

  // Attendance stats
  const totalRecords = await db
    .select({ count: sql<number>`COUNT(*)`.as("count") })
    .from(attendanceRecords)
    .where(eq(attendanceRecords.studentId, student.id));

  const presentRecords = await db
    .select({ count: sql<number>`COUNT(*)`.as("count") })
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.studentId, student.id),
        eq(attendanceRecords.status, "present")
      )
    );

  const total = Number(totalRecords[0]?.count ?? 0);
  const present = Number(presentRecords[0]?.count ?? 0);
  const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

  // Active sessions for enrolled courses
  const activeSessions = courseIds.length > 0
    ? await db
        .select({
          sessionId: attendanceSessions.id,
          courseName: courses.name,
          startTime: attendanceSessions.startTime,
        })
        .from(attendanceSessions)
        .innerJoin(courses, eq(attendanceSessions.courseId, courses.id))
        .where(
          and(
            eq(attendanceSessions.status, "active"),
            sql`${attendanceSessions.courseId} IN (${sql.join(courseIds.map(id => sql`${id}`), sql`, `)})`
          )
        )
    : [];

  // Today's timetable
  const today = new Date().getDay();
  const dayOfWeek = today === 0 ? 7 : today;

  const todaysClasses = courseIds.length > 0
    ? await db
        .select({
          courseName: courses.name,
          startTime: timetable.startTime,
          endTime: timetable.endTime,
          roomNumber: timetable.roomNumber,
        })
        .from(timetable)
        .innerJoin(courses, eq(timetable.courseId, courses.id))
        .where(
          and(
            eq(timetable.dayOfWeek, dayOfWeek),
            sql`${timetable.courseId} IN (${sql.join(courseIds.map(id => sql`${id}`), sql`, `)})`
          )
        )
        .orderBy(timetable.startTime)
    : [];

  return (
    <div className="space-y-6">
      <NotificationListener enrolledCourseIds={courseIds} />

      <div>
        <h1 className="text-2xl font-bold">
          Welcome, {user?.firstName || "Student"}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s your attendance overview
        </p>
      </div>

      {/* Active Sessions Alert */}
      {activeSessions.length > 0 && (
        <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="flex items-center gap-4 pt-6">
            <AlertCircle className="h-8 w-8 text-orange-500" />
            <div className="flex-1">
              <p className="font-semibold">Active Attendance Session</p>
              {activeSessions.map((s) => (
                <p key={s.sessionId} className="text-sm text-muted-foreground">
                  {s.courseName} - Started at{" "}
                  {new Date(s.startTime).toLocaleTimeString()}
                </p>
              ))}
            </div>
            <Button asChild>
              <Link href={`/student/mark-attendance/${activeSessions[0].sessionId}`}>
                Mark Attendance
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Enrolled Courses
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enrolledCourses.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Overall Attendance
            </CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{percentage}%</div>
            <p className="text-xs text-muted-foreground">
              {present} of {total} classes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Classes Today
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todaysClasses.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Schedule</CardTitle>
          <CardDescription>Your classes for today</CardDescription>
        </CardHeader>
        <CardContent>
          {todaysClasses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No classes scheduled for today
            </p>
          ) : (
            <div className="space-y-3">
              {todaysClasses.map((cls, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{cls.courseName}</p>
                    <p className="text-sm text-muted-foreground">
                      {cls.startTime} - {cls.endTime}
                      {cls.roomNumber && ` | Room ${cls.roomNumber}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enrolled Courses */}
      <Card>
        <CardHeader>
          <CardTitle>My Courses</CardTitle>
        </CardHeader>
        <CardContent>
          {enrolledCourses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You are not enrolled in any courses yet
            </p>
          ) : (
            <div className="space-y-3">
              {enrolledCourses.map((c) => (
                <div
                  key={c.courseId}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{c.courseName}</p>
                    <p className="text-sm text-muted-foreground">
                      {c.courseCode} | {c.teacherName}
                    </p>
                  </div>
                  <Badge variant="outline">{c.courseCode}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
