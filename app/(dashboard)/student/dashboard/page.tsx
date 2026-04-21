import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/lib/db";
import { Student, User, Enrollment, AttendanceRecord, AttendanceSession, Timetable } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
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

  await getDb();

  const student = await Student.findOne({ clerkUserId: userId });

  if (!student) redirect("/onboarding");

  const user = await User.findOne({ clerkUserId: userId });

  // Enrolled courses
  const enrollmentsList = await Enrollment.find({ studentId: student._id }).populate({
    path: 'courseId',
    populate: { path: 'teacherId' }
  }).lean();

  const enrolledCourses = enrollmentsList.map((e: any) => {
    const c = e.courseId as any;
    const teacher = c?.teacherId as any;
    return {
      courseId: c?._id.toString(),
      courseName: c?.name,
      courseCode: c?.code,
      teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : "Unknown",
    };
  });

  const courseIds = enrolledCourses.map((c) => c.courseId);

  // Attendance stats
  const total = await AttendanceRecord.countDocuments({ studentId: student._id });
  const present = await AttendanceRecord.countDocuments({
    studentId: student._id,
    status: "present"
  });

  const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

  // Active sessions for enrolled courses
  const activeSessionsRaw = courseIds.length > 0
    ? await AttendanceSession.find({
        courseId: { $in: courseIds },
        status: "active"
      }).populate('courseId').lean()
    : [];

  const activeSessions = activeSessionsRaw.map((s: any) => ({
    sessionId: s._id.toString(),
    courseName: s.courseId?.name,
    startTime: s.startTime
  }));

  // Today's timetable
  const today = new Date().getDay();
  const dayOfWeek = today === 0 ? 7 : today;

  const todaysClassesRaw = courseIds.length > 0
    ? await Timetable.find({
        courseId: { $in: courseIds },
        dayOfWeek
      }).populate('courseId').sort({ startTime: 1 }).lean()
    : [];

  const todaysClasses = todaysClassesRaw.map((t: any) => ({
    courseName: t.courseId?.name,
    startTime: t.startTime,
    endTime: t.endTime,
    roomNumber: t.roomNumber
  }));

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
