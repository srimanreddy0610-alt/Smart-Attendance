import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { User, Course, Enrollment, AttendanceSession, AttendanceRecord, Timetable } from "@/lib/db/schema";
import { CourseDetailTabs } from "@/components/teacher/course-detail-tabs";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const sessionUser = await getCurrentUser();
  const userId = sessionUser?._id?.toString();
  if (!userId) redirect("/sign-in");

  await getDb();

  const user = await User.findById(userId);

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
      enrolledAt: e.enrolledAt instanceof Date ? e.enrolledAt.toISOString() : e.enrolledAt,
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
      sessionDate: s.sessionDate instanceof Date ? s.sessionDate.toISOString() : s.sessionDate,
      startTime: s.startTime instanceof Date ? s.startTime.toISOString() : s.startTime,
      endTime: s.endTime instanceof Date ? s.endTime.toISOString() : s.endTime,
      status: s.status,
      presentCount
    };
  }));

  // Get timetable
  const timetableDocs = await Timetable.find({ courseId }).sort({ dayOfWeek: 1, startTime: 1 }).lean();
  const timetableEntries = timetableDocs.map((t: any) => ({
    id: t._id.toString(),
    courseId: t.courseId.toString(),
    dayOfWeek: t.dayOfWeek,
    startTime: t.startTime,
    endTime: t.endTime,
    roomNumber: t.roomNumber,
  }));

  const formattedCourse = {
    id: course._id.toString(),
    name: course.name,
    code: course.code,
    department: course.department,
    semester: course.semester,
    section: course.section,
    teacherId: course.teacherId.toString(),
    streamId: course.streamId?.toString() || "",
    createdAt: course.createdAt instanceof Date ? course.createdAt.toISOString() : course.createdAt,
  };

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
