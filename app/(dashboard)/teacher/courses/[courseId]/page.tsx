import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/lib/db";
import { User, Course, Enrollment, AttendanceSession, AttendanceRecord, Timetable } from "@/lib/db/schema";
import { CourseDetailTabs } from "@/components/teacher/course-detail-tabs";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  await getDb();

  const user = await User.findOne({ clerkUserId: userId });

  if (!user || user.role !== "teacher") redirect("/");

  const { courseId } = await params;

  const course = await Course.findOne({
    _id: courseId,
    teacherId: user._id
  }).lean();

  if (!course) redirect("/teacher/courses");

  // Get enrolled students
  const enrollmentsList = await Enrollment.find({ courseId }).populate({
    path: 'studentId',
    populate: { path: 'user' }
  }).lean();

  const enrolledStudents = enrollmentsList.map((e: any) => {
    const student = e.studentId as any;
    const studentUser = student?.user as any;
    return {
      enrollmentId: e._id.toString(),
      studentId: student?._id.toString(),
      rollNumber: student?.rollNumber,
      department: student?.department,
      firstName: studentUser?.firstName,
      lastName: studentUser?.lastName,
      email: studentUser?.email,
      photoUrl: student?.photoUrl,
      enrolledAt: e.enrolledAt,
    };
  }).sort((a, b) => (a.rollNumber || "").localeCompare(b.rollNumber || ""));

  // Get recent sessions
  const sessionsList = await AttendanceSession.find({ courseId }).sort({ startTime: -1 }).limit(20).lean();

  const recentSessions = await Promise.all(sessionsList.map(async (s: any) => {
    const presentCount = await AttendanceRecord.countDocuments({
      sessionId: s._id,
      status: 'present'
    });
    return {
      id: s._id.toString(),
      sessionDate: s.sessionDate,
      startTime: s.startTime,
      endTime: s.endTime,
      status: s.status,
      presentCount
    };
  }));

  // Get timetable
  const timetableDocs = await Timetable.find({ courseId }).sort({ dayOfWeek: 1, startTime: 1 }).lean();
  const timetableEntries = timetableDocs.map((t: any) => ({ ...t, id: t._id.toString() }));

  const formattedCourse = {
    ...course,
    id: course._id.toString()
  } as any;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{course.name}</h1>
        <p className="text-muted-foreground">
          {course.code} | {course.department} | Sem {course.semester} | Sec{" "}
          {course.section}
        </p>
      </div>
      <CourseDetailTabs
        course={formattedCourse}
        enrolledStudents={enrolledStudents}
        recentSessions={recentSessions}
        timetableEntries={timetableEntries}
      />
    </div>
  );
}
