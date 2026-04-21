import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { User, Course, AttendanceSession, Timetable, Enrollment, AttendanceRecord } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
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
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") redirect("/sign-in");

  await getDb();

  const teacherCourses = await Course.find({ teacherId: user._id }).sort({ name: 1 }).lean();
  
  const coursesWithStats = await Promise.all(teacherCourses.map(async (c: any) => {
    const studentCount = await Enrollment.countDocuments({ courseId: c._id });
    return {
      id: c._id.toString(),
      name: c.name,
      code: c.code,
      studentCount
    };
  }));

  const courseIds = teacherCourses.map((c: any) => c._id);

  const activeSessions = courseIds.length > 0
    ? await AttendanceSession.find({
        courseId: { $in: courseIds },
        status: "active",
        teacherId: user._id
      }).populate('courseId', 'name _id').lean()
    : [];

  const formattedActiveSessions = activeSessions.map((s: any) => ({
    id: s._id.toString(),
    courseName: s.courseId?.name,
    courseId: s.courseId?._id.toString(),
    startTime: s.startTime instanceof Date ? s.startTime.toISOString() : s.startTime
  }));

  const recentSessions = courseIds.length > 0
    ? await AttendanceSession.find({ teacherId: user._id })
        .populate('courseId', 'name _id')
        .sort({ startTime: -1 })
        .limit(5)
        .lean()
    : [];

  const formattedRecentSessions = await Promise.all(recentSessions.map(async (s: any) => {
    const presentCount = await AttendanceRecord.countDocuments({
      sessionId: s._id,
      status: 'present'
    });
    const totalEnrolled = await Enrollment.countDocuments({
      courseId: s.courseId?._id
    });
    return {
      id: s._id.toString(),
      courseName: s.courseId?.name,
      sessionDate: s.sessionDate instanceof Date ? s.sessionDate.toISOString() : s.sessionDate,
      status: s.status,
      presentCount: Number(presentCount),
      totalEnrolled: Number(totalEnrolled)
    };
  }));

  const today = new Date().getDay();
  const dayOfWeek = today === 0 ? 7 : today;

  const todaysClasses = courseIds.length > 0
    ? await Timetable.find({
        courseId: { $in: courseIds },
        dayOfWeek
      }).populate('courseId', 'name _id section').sort({ startTime: 1 }).lean()
    : [];

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const formattedClasses = todaysClasses.map((t: any) => {
    const [startH, startM] = t.startTime.split(':').map(Number);
    const [endH, endM] = t.endTime.split(':').map(Number);
    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;
    const isOngoing = currentMinutes >= startTotal && currentMinutes <= endTotal;

    return {
      courseName: t.courseId?.name,
      courseId: t.courseId?._id.toString(),
      section: t.courseId?.section,
      startTime: t.startTime,
      endTime: t.endTime,
      roomNumber: t.roomNumber,
      isOngoing
    };
  });

  const totalStudents = coursesWithStats.reduce(
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
      {formattedActiveSessions.length > 0 && (
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
              {formattedActiveSessions.map((s) => (
                <p key={s.id} className="text-sm text-emerald-700/80 dark:text-emerald-300/80 truncate">
                  {s.courseName} - Started at{" "}
                  {new Date(s.startTime).toLocaleTimeString()}
                </p>
              ))}
            </div>
            <Button asChild size="sm" className="shrink-0">
              <Link
                href={`/teacher/courses/${formattedActiveSessions[0].courseId}/session/${formattedActiveSessions[0].id}/live`}
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
        activeSessions={formattedActiveSessions.length}
        classesToday={formattedClasses.length}
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
            {formattedClasses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Calendar className="h-8 w-8 text-primary opacity-60" />
                </div>
                <h4 className="font-bold text-lg mb-1">Welcome, Professor!</h4>
                <p className="text-sm text-muted-foreground max-w-[250px]">
                  You haven&apos;t been assigned any sections for today yet. 
                  Contact your Admin to link courses to your account.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {formattedClasses.map((cls, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 rounded-xl border p-4 transition-all duration-300 ${cls.isOngoing ? 'border-primary bg-primary/5 shadow-md scale-[1.02]' : 'hover:bg-muted/50'}`}
                  >
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${cls.isOngoing ? 'bg-primary text-primary-foreground animate-pulse' : 'bg-primary/10 text-primary'}`}>
                      <Clock className="h-5 w-5" />
                    </div>
                      <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm truncate">{cls.courseName}</p>
                        <Badge variant="outline" className="text-[10px] h-4 leading-none border-primary/30 text-primary/70">
                          Sec {cls.section}
                        </Badge>
                        {cls.isOngoing && (
                            <Badge variant="default" className="text-[8px] h-4 leading-none bg-primary animate-bounce">NOW</Badge>
                        )}
                      </div>
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
                    <Button 
                        size="sm" 
                        variant={cls.isOngoing ? "default" : "outline"} 
                        className={cls.isOngoing ? "shadow-lg shadow-primary/20" : ""}
                        asChild
                    >
                      <Link href={`/teacher/courses/${cls.courseId}/session`}>
                        {cls.isOngoing ? "Start Attendance" : "Start"}
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
            {formattedRecentSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <History className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">No sessions yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {formattedRecentSessions.map((s) => (
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

