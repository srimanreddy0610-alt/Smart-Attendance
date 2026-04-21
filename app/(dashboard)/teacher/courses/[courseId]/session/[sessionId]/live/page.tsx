import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { User, AttendanceSession } from "@/lib/db/schema";
import { LiveSessionView } from "@/components/teacher/live-session-view";

export default async function LiveSessionPage({
  params,
}: {
  params: Promise<{ courseId: string; sessionId: string }>;
}) {
  const sessionUser = await getCurrentUser();
  const userId = sessionUser?._id?.toString();
  if (!userId) redirect("/sign-in");

  await getDb();

  const user = await User.findById(userId);

  if (!user || user.role !== "teacher") redirect("/");

  const { courseId, sessionId } = await params;

  const session = await AttendanceSession.findOne({
    _id: sessionId,
    teacherId: user._id
  }).populate('courseId');

  if (!session) redirect("/teacher/courses");

  const course = session.courseId as any;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Live Attendance</h1>
        <p className="text-muted-foreground">
          {course.name} ({course.code})
        </p>
      </div>
      <LiveSessionView
        sessionId={session._id.toString()}
        courseId={courseId}
        courseName={course.name}
        startTime={session.startTime.toISOString()}
        endTime={session.endTime?.toISOString() ?? null}
        initialStatus={session.status}
      />
    </div>
  );
}
