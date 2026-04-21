import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/lib/db";
import { Student, Enrollment, AttendanceRecord, AttendanceSession } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { BookOpen, User, GraduationCap } from "lucide-react";

export default async function StudentCoursesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  await getDb();

  const student = await Student.findOne({ clerkUserId: userId });

  if (!student) redirect("/onboarding");

  const enrollmentsList = await Enrollment.find({ studentId: student._id }).populate({
    path: 'courseId',
    populate: { path: 'teacherId' }
  }).lean();

  const enrolledCourses = enrollmentsList.map((e: any) => {
    const c = e.courseId as any;
    const teacher = c?.teacherId as any;
    return {
      courseId: c?._id,
      courseName: c?.name,
      courseCode: c?.code,
      department: c?.department,
      semester: c?.semester,
      section: c?.section,
      teacherFirstName: teacher?.firstName,
      teacherLastName: teacher?.lastName,
    };
  }).sort((a: any, b: any) => (a.courseName || "").localeCompare(b.courseName || ""));

  // Get attendance percentage per course
  const coursesWithAttendance = await Promise.all(
    enrolledCourses.map(async (c) => {
      const total = await AttendanceSession.countDocuments({ courseId: c.courseId });

      const presentRecords = await AttendanceRecord.find({
        studentId: student._id,
        status: "present"
      }).populate('sessionId');
      
      const present = presentRecords.filter((r: any) => r.sessionId?.courseId?.toString() === c.courseId.toString()).length;

      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

      return { 
        ...c, 
        courseId: c.courseId.toString(),
        total, 
        present, 
        percentage 
      };
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
