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
import { eq, and, sql } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  ClipboardCheck,
  Calendar,
  AlertCircle,
  Clock,
  MapPin,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { NotificationListener } from "@/components/student/notification-listener";
import { StudentDashboardClient } from "@/components/student/student-dashboard-client";

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
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {user?.firstName || "Student"}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s your attendance overview
        </p>
      </div>

      {/* Active Sessions Alert */}
      {activeSessions.length > 0 && (
        <div className="relative overflow-hidden rounded-xl border border-orange-200 bg-linear-to-r from-orange-50 to-amber-50 p-5 dark:border-orange-900/50 dark:from-orange-950/30 dark:to-amber-950/30">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-200/30 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/50">
              <AlertCircle className="h-6 w-6 text-orange-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-orange-900 dark:text-orange-200">
                Active Attendance Session
              </p>
              {activeSessions.map((s) => (
                <p key={s.sessionId} className="text-sm text-orange-700/80 dark:text-orange-300/80 truncate">
                  {s.courseName} - Started at{" "}
                  {new Date(s.startTime).toLocaleTimeString()}
                </p>
              ))}
            </div>
            <Button asChild size="sm" className="shrink-0">
              <Link href={`/student/mark-attendance/${activeSessions[0].sessionId}`}>
                Mark Attendance
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <StudentDashboardClient
        enrolledCount={enrolledCourses.length}
        percentage={percentage}
        present={present}
        total={total}
        classesToday={todaysClasses.length}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Today's Schedule */}
        <div className="rounded-xl border bg-card">
          <div className="p-5 pb-3">
            <h3 className="font-semibold text-base">Today&apos;s Schedule</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Your classes for today
            </p>
          </div>
          <div className="px-5 pb-5">
            {todaysClasses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Calendar className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">No classes scheduled for today</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todaysClasses.map((cls, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{cls.courseName}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{cls.startTime} - {cls.endTime}</span>
                        {cls.roomNumber && (
                          <>
                            <span className="text-border">|</span>
                            <span className="flex items-center gap-0.5">
                              <MapPin className="h-3 w-3" />
                              {cls.roomNumber}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Enrolled Courses */}
        <div className="rounded-xl border bg-card">
          <div className="p-5 pb-3">
            <h3 className="font-semibold text-base">My Courses</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {enrolledCourses.length} enrolled
            </p>
          </div>
          <div className="px-5 pb-5">
            {enrolledCourses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <BookOpen className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">Not enrolled in any courses yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {enrolledCourses.map((c) => (
                  <div
                    key={c.courseId}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <BookOpen className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{c.courseName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {c.teacherName}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {c.courseCode}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
