import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  users,
  courses,
  attendanceSessions,
  timetable,
  enrollments,
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
import { BookOpen, Users, Clock, Activity } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default async function TeacherDashboard() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkUserId, userId))
    .limit(1);

  if (!user || user.role !== "teacher") redirect("/");

  // Teacher's courses
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

  // Active sessions
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

  // Recent sessions
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

  // Today's timetable
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
        <h1 className="text-2xl font-bold">
          Welcome, {user.firstName || "Teacher"}
        </h1>
        <p className="text-muted-foreground">Manage your courses and attendance</p>
      </div>

      {/* Active Sessions Alert */}
      {activeSessions.length > 0 && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950/20">
          <CardContent className="flex items-center gap-4 pt-6">
            <Activity className="h-8 w-8 text-green-500 animate-pulse" />
            <div className="flex-1">
              <p className="font-semibold">Active Sessions</p>
              {activeSessions.map((s) => (
                <p key={s.id} className="text-sm text-muted-foreground">
                  {s.courseName} - Started at{" "}
                  {new Date(s.startTime).toLocaleTimeString()}
                </p>
              ))}
            </div>
            <Button asChild>
              <Link
                href={`/teacher/courses/${activeSessions[0].courseId}/session/${activeSessions[0].id}/live`}
              >
                View Live
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Courses
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teacherCourses.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Students
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Active Sessions
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSessions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Classes Today
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todaysClasses.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Schedule</CardTitle>
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
                    <Button size="sm" asChild>
                      <Link href={`/teacher/courses/${cls.courseId}/session`}>
                        Start Session
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Sessions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {recentSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No sessions yet
              </p>
            ) : (
              <div className="space-y-3">
                {recentSessions.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{s.courseName}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(s.sessionDate), "MMM dd, yyyy")}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={
                          s.status === "active" ? "default" : "secondary"
                        }
                      >
                        {s.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {Number(s.presentCount)}/{Number(s.totalEnrolled)} present
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
