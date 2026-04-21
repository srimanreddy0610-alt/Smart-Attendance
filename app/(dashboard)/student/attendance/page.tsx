import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/lib/db";
import { Student, Enrollment } from "@/lib/db/schema";
import { AttendanceHistory } from "@/components/student/attendance-history";

export default async function StudentAttendancePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  await getDb();

  const student = await Student.findOne({ clerkUserId: userId });

  if (!student) redirect("/onboarding");

  const enrollmentsList = await Enrollment.find({ studentId: student._id }).populate('courseId').lean();

  const enrolledCourses = enrollmentsList.map((e: any) => {
    const c = e.courseId as any;
    return {
      courseId: c?._id.toString(),
      courseName: c?.name,
      courseCode: c?.code,
    };
  }).sort((a: any, b: any) => (a.courseName || "").localeCompare(b.courseName || ""));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Attendance History</h1>
        <p className="text-muted-foreground">
          View your attendance records
        </p>
      </div>
      <AttendanceHistory courses={enrolledCourses} />
    </div>
  );
}
