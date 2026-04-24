import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { 
  Course, 
  Enrollment, 
  AttendanceSession, 
  Student, 
  Timetable,
  AttendanceRecord
} from "@/lib/db/schema";
import { StudentDashboardClient } from "@/components/student/student-dashboard-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  AlertCircle,
  Clock,
  MapPin,
  ArrowRight,
  BookOpen,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { NotificationListener } from "@/components/student/notification-listener";
import { RegisterCourseButton } from "@/components/student/register-course-button";

export default async function StudentDashboard() {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") redirect("/sign-in");

  await getDb();

  const student = await Student.findOne({ user: user._id }).lean();

  if (!student) redirect("/onboarding");

  // Enrolled courses
  const enrollmentsList = await Enrollment.find({ studentId: student._id }).populate({
    path: 'courseId',
    populate: { path: 'teacherId' }
  }).lean();

  const tempCourseIds = enrollmentsList.map((e: any) => (e.courseId as any)?._id);

  // Active sessions for enrolled courses
  const activeSessionsRaw = tempCourseIds.length > 0
    ? await AttendanceSession.find({
        courseId: { $in: tempCourseIds },
        status: "active"
      }).populate('courseId').lean()
    : [];

  interface ActiveSessionInfo {
    _id: any;
    courseId?: {
      _id: any;
      name: string;
    };
    startTime: Date;
  }

  const activeSessions = (activeSessionsRaw as unknown as ActiveSessionInfo[]).map((s) => ({
    sessionId: s._id.toString(),
    courseName: s.courseId?.name,
    startTime: s.startTime
  }));

  const enrolledCourses = enrollmentsList.map((e: any) => {
    const c = e.courseId;
    const teacher = c?.teacherId;
    const hasActiveSession = (activeSessionsRaw as unknown as ActiveSessionInfo[]).some((s) => s.courseId?._id.toString() === c?._id.toString());
    
    return {
      courseId: c?._id.toString(),
      courseName: c?.name,
      courseCode: c?.code,
      teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : "Unknown",
      isLive: hasActiveSession,
      activeSessionId: (activeSessionsRaw as unknown as ActiveSessionInfo[]).find((s) => s.courseId?._id.toString() === c?._id.toString())?._id.toString(),
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

  // Today's timetable
  const today = new Date().getDay();
  const dayOfWeek = today === 0 ? 7 : today;

  const todaysClassesRaw = courseIds.length > 0
    ? await Timetable.find({
        courseId: { $in: courseIds },
        dayOfWeek
      }).populate('courseId').sort({ startTime: 1 }).lean()
    : [];

  interface TimetableEntry {
    courseId?: {
      _id: any;
      name: string;
    };
    startTime: string;
    endTime: string;
    roomNumber?: string;
  }

  const todaysClasses = (todaysClassesRaw as unknown as TimetableEntry[]).map((t) => ({
    courseId: t.courseId?._id.toString(),
    courseName: t.courseId?.name,
    startTime: t.startTime,
    endTime: t.endTime,
    roomNumber: t.roomNumber
  }));

  // Available courses in student's section/stream not enrolled yet
  const availableCoursesRaw = await Course.find({
    streamId: student.streamId,
    section: student.section,
    _id: { $nin: courseIds }
  }).populate('teacherId').lean();

  interface CourseInfo {
    _id: any;
    name: string;
    code: string;
    teacherId?: {
      firstName: string;
      lastName: string;
    };
  }

  const availableCourses = (availableCoursesRaw as unknown as CourseInfo[]).map((c) => ({
    id: c._id.toString(),
    name: c.name,
    code: c.code,
    teacherName: c.teacherId ? `${c.teacherId.firstName} ${c.teacherId.lastName}` : "Unknown"
  }));

  return (
    <div className="space-y-8">
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
        <div className="relative overflow-hidden rounded-2xl border-2 border-primary/20 bg-linear-to-br from-primary/10 via-background to-primary/5 p-6 shadow-xl shadow-primary/10 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-1/2 left-0 -translate-y-1/2 w-1 h-12 bg-primary rounded-r-full" />
          
          <div className="relative flex flex-col sm:flex-row items-center gap-6">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30 relative">
              <AlertCircle className="h-8 w-8 text-primary-foreground" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-foreground opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-primary-foreground shadow-sm"></span>
              </span>
            </div>
            
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                <Badge variant="default" className="bg-primary hover:bg-primary text-[10px] font-black uppercase tracking-wider px-2 py-0.5">
                  Live Now
                </Badge>
                <h2 className="text-xl font-bold tracking-tight">Active Attendance Session</h2>
              </div>
              <div className="space-y-1">
                {activeSessions.map((s) => (
                  <p key={s.sessionId} className="text-muted-foreground font-medium flex items-center justify-center sm:justify-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    {s.courseName} &middot; Started {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                ))}
              </div>
            </div>
            
            <Button asChild size="lg" className="shrink-0 rounded-xl px-8 h-12 text-base font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform active:scale-[0.98]">
              <Link href={`/student/mark-attendance/${activeSessions[0].sessionId}`}>
                Mark Your Attendance
                <ArrowRight className="ml-2 h-5 w-5" />
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
          <div className="p-5 pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-base">Today&apos;s Schedule</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Your classes for today
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary hover:bg-primary/10">
                <Link href="/student/timetable">
                    View Full
                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
            </Button>
          </div>
          <div className="px-5 pb-5">
            {todaysClasses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Calendar className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">No classes scheduled for today</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todaysClasses.map((cls, i) => {
                  const isLive = activeSessionsRaw.some((s: any) => s.courseId?._id.toString() === cls.courseId?.toString());
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors ${isLive ? 'border-primary/30 bg-primary/5 shadow-inner' : ''}`}
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isLive ? 'bg-primary text-primary-foreground animate-pulse' : 'bg-primary/10 text-primary'}`}>
                        <Clock className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{cls.courseName}</p>
                            {isLive && (
                                <Badge variant="default" className="h-4 px-1.5 text-[8px] font-bold leading-none bg-primary">LIVE</Badge>
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
                      {isLive && (
                        <Button size="sm" className="h-8 rounded-lg text-xs" asChild>
                            <Link href={`/student/mark-attendance/${activeSessionsRaw.find((s: any) => s.courseId?._id.toString() === cls.courseId?.toString())?._id}`}>
                                Join 
                            </Link>
                        </Button>
                      )}
                    </div>
                  );
                })}
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
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${c.isLive ? 'bg-orange-500/10 animate-pulse' : 'bg-primary/10'}`}>
                        <BookOpen className={`h-4 w-4 ${c.isLive ? 'text-orange-600' : 'text-primary'}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                           <p className="font-medium text-sm truncate">{c.courseName}</p>
                           {c.isLive && (
                              <Badge variant="default" className="bg-orange-500 hover:bg-orange-600 text-[9px] h-4 px-1 leading-none animate-bounce">
                                LIVE
                              </Badge>
                           )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {c.teacherName}
                        </p>
                      </div>
                    </div>
                    {c.isLive ? (
                        <Button size="sm" variant="outline" className="shrink-0 h-8 text-xs border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800" asChild>
                            <Link href={`/student/mark-attendance/${c.activeSessionId}`}>
                                Mark
                            </Link>
                        </Button>
                    ) : (
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          {c.courseCode}
                        </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Available Courses to Register */}
      {availableCourses.length > 0 && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="p-5 border-b bg-muted/30 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500 fill-amber-500/20" />
                Available in Your Section
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Explore and register for new courses in Section {student.section}
              </p>
            </div>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
              {availableCourses.length} New
            </Badge>
          </div>
          <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
            {availableCourses.map((c) => (
              <div
                key={c.id}
                className="group relative flex flex-col justify-between rounded-xl border bg-background p-4 hover:border-primary/40 hover:shadow-md transition-all duration-300"
              >
                <div className="space-y-1 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                      {c.code}
                    </span>
                  </div>
                  <h4 className="font-bold text-base group-hover:text-primary transition-colors line-clamp-1">
                    {c.name}
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-1 flex items-center gap-1">
                     <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                     {c.teacherName}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-dashed">
                   <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Ongoing Term
                   </div>
                   <RegisterCourseButton courseId={c.id} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

