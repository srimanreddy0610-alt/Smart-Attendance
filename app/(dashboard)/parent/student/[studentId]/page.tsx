import { requireParent } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { Parent, Student, User, Enrollment, AttendanceRecord } from "@/lib/db/schema";
import { redirect } from "next/navigation";
import { 
  ArrowLeft, 
  User as UserIcon, 
  Clock, 
  BookOpen,
  PieChart,
  Activity,
  History
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StudentDashboardClient } from "@/components/student/student-dashboard-client";

export default async function ParentStudentViewPage({ 
  params 
}: { 
  params: Promise<{ studentId: string }> 
}) {
  const user = await requireParent();
  const { studentId } = await params;

  await getDb();

  // 1. Verify link
  const parent = await Parent.findOne({ 
    user: user._id,
    linkedStudents: studentId
  });

  if (!parent) {
    console.log(`[PARENT_VIEW] Parent ${user._id} not linked to student ${studentId}`);
    redirect("/parent/dashboard");
  }

  const studentData = await Student.findById(studentId).populate("user");
  if (!studentData) redirect("/parent/dashboard");

  const studentUser = studentData.user as any;

  // 2. Fetch student stats
  const enrollmentsList = await Enrollment.find({ studentId }).populate({
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

  const total = await AttendanceRecord.countDocuments({ studentId });
  const present = await AttendanceRecord.countDocuments({
    studentId,
    status: "present"
  });

  const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

  // Fetch recent attendance
  const recentAttendance = await AttendanceRecord.find({ studentId })
    .populate({
      path: 'sessionId',
      populate: { path: 'courseId' }
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link href="/parent/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {studentUser.firstName}&apos;s Progress
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Badge variant="secondary">{studentData.rollNumber}</Badge>
              <span>{studentData.department} • Semester {studentData.semester}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
       <StudentDashboardClient
        enrolledCount={enrolledCourses.length}
        percentage={percentage}
        present={present}
        total={total}
        classesToday={0} 
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
         {/* Course list */}
         <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Academic Courses
            </CardTitle>
            <CardDescription>
              Currently enrolled subjects and teachers.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <div className="grid gap-3 sm:grid-cols-2">
               {enrolledCourses.map((c) => (
                 <div key={c.courseId} className="flex items-center gap-3 p-3 border rounded-xl bg-muted/10">
                   <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                     <BookOpen className="h-5 w-5 text-primary" />
                   </div>
                   <div className="min-w-0">
                     <p className="font-medium text-sm truncate">{c.courseName}</p>
                     <p className="text-xs text-muted-foreground truncate">{c.courseCode} • {c.teacherName}</p>
                   </div>
                 </div>
               ))}
               {enrolledCourses.length === 0 && (
                 <p className="text-sm text-muted-foreground py-4 text-center col-span-2">No courses found.</p>
               )}
             </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-orange-500" />
              Recent Attendance
            </CardTitle>
            <CardDescription>
              Latest classroom entries.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
               {recentAttendance.map((record: any) => (
                 <div key={record._id.toString()} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                   <div className="min-w-0">
                     <p className="font-medium text-sm truncate">
                        {(record.sessionId?.courseId as any)?.name || "Unknown Course"}
                     </p>
                     <p className="text-[10px] text-muted-foreground">
                       {new Date(record.createdAt).toLocaleDateString()} at {new Date(record.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                     </p>
                   </div>
                   <Badge variant={record.status === 'present' ? 'default' : 'destructive'} className="text-[10px] h-5">
                      {record.status.toUpperCase()}
                   </Badge>
                 </div>
               ))}
               {recentAttendance.length === 0 && (
                 <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                   <Activity className="h-8 w-8 mb-2 opacity-20" />
                   <p className="text-xs italic">No activity records yet</p>
                 </div>
               )}
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
