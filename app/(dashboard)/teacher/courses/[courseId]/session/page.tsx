import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { User, Course, AttendanceSession } from "@/lib/db/schema";
import { StartSessionForm } from "@/components/teacher/start-session-form";

export default async function SessionPage({
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
  });

  if (!course) redirect("/teacher/courses");

  // Check for existing active session
  const activeSession = await AttendanceSession.findOne({
    courseId,
    status: "active"
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Start Attendance Session</h1>
        <p className="text-muted-foreground">
          {course.name} ({course.code})
        </p>
      </div>
      <StartSessionForm
        courseId={course._id.toString()}
        courseName={course.name}
        activeSessionId={activeSession?._id?.toString()}
      />
    </div>
  );
}
