import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  users,
  courses,
  attendanceSessions,
  timetable,
} from "@/lib/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Users,
  Clock,
  Activity,
  Calendar,
  ArrowRight,
  MapPin,
  History,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { TeacherDashboardClient } from "@/components/teacher/teacher-dashboard-client";

export default async function TeacherDashboard() {
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
      studentCount: sql<number>`(
        SELECT COUNT(*) FROM enrollments WHERE enrollments.course_id = ${courses.id}
      )`.as("student_count"),
    })
    .from(courses)
    .where(eq(courses.teacherId, user.id))
    .orderBy(courses.name);

  const courseIds = teacherCourses.map((c) => c.id);

  const activeSessions = courseIds.length > 0
    ? await db
        .select({
          id: attendanceSessions.id,
          courseName: courses.name,
          courseId: courses.id,
          startTime: attendanceSessions.startTime,
        })
        .from(attendanceSessions)
        .innerJoin(courses, eq(attendanceSessions.courseId, courses.id))
        .where(
          and(
            eq(attendanceSessions.status, "active"),
            eq(attendanceSessions.teacherId, user.id)
          )
        )
    : [];

  const recentSessions = courseIds.length > 0
    ? await db
        .select({
          id: attendanceSessions.id,
          courseName: courses.name,
          sessionDate: attendanceSessions.sessionDate,
          status: attendanceSessions.status,
          presentCount: sql<number>`(
            SELECT COUNT(*) FROM attendance_records
            WHERE attendance_records.session_id = ${attendanceSessions.id}
            AND attendance_records.status = 'present'
          )`.as("present_count"),
          totalEnrolled: sql<number>`(
            SELECT COUNT(*) FROM enrollments
            WHERE enrollments.course_id = ${attendanceSessions.courseId}
          )`.as("total_enrolled"),
        })
        .from(attendanceSessions)
        .innerJoin(courses, eq(attendanceSessions.courseId, courses.id))
        .where(eq(attendanceSessions.teacherId, user.id))
        .orderBy(desc(attendanceSessions.startTime))
        .limit(5)
    : [];

  const today = new Date().getDay();
  const dayOfWeek = today === 0 ? 7 : today;

  const todaysClasses = courseIds.length > 0
    ? await db
        .select({
          courseName: courses.name,
          courseId: courses.id,
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

  const totalStudents = teacherCourses.reduce(
    (sum, c) => sum + Number(c.studentCount),
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {user.firstName || "Teacher"}
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your courses and attendance
        </p>
      </div>

      {/* Active Sessions Alert */}
      {activeSessions.length > 0 && (
        <div className="relative overflow-hidden rounded-xl border border-emerald-200 bg-linear-to-r from-emerald-50 to-teal-50 p-5 dark:border-emerald-900/50 dark:from-emerald-950/30 dark:to-teal-950/30">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-200/30 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/50">
              <Activity className="h-6 w-6 text-emerald-600 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                Active Sessions
              </p>
              {activeSessions.map((s) => (
                <p key={s.id} className="text-sm text-emerald-700/80 dark:text-emerald-300/80 truncate">
                  {s.courseName} - Started at{" "}
                  {new Date(s.startTime).toLocaleTimeString()}
                </p>
              ))}
            </div>
            <Button asChild size="sm" className="shrink-0">
              <Link
                href={`/teacher/courses/${activeSessions[0].courseId}/session/${activeSessions[0].id}/live`}
              >
                View Live
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Stats */}
      <TeacherDashboardClient
        totalCourses={teacherCourses.length}
        totalStudents={totalStudents}
        activeSessions={activeSessions.length}
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
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/teacher/courses/${cls.courseId}/session`}>
                        Start
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Sessions */}
        <div className="rounded-xl border bg-card">
          <div className="p-5 pb-3">
            <h3 className="font-semibold text-base">Recent Sessions</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Latest attendance sessions
            </p>
          </div>
          <div className="px-5 pb-5">
            {recentSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <History className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">No sessions yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentSessions.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <History className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{s.courseName}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(s.sessionDate), "MMM dd, yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge
                        variant={s.status === "active" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {s.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {Number(s.presentCount)}/{Number(s.totalEnrolled)}
                      </p>
                    </div>
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
