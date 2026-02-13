import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, attendanceSessions, courses } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { LiveSessionView } from "@/components/teacher/live-session-view";

export default async function LiveSessionPage({
  params,
}: {
  params: Promise<{ courseId: string; sessionId: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkUserId, userId))
    .limit(1);

  if (!user || user.role !== "teacher") redirect("/");

  const { courseId, sessionId } = await params;

  const [session] = await db
    .select({
      id: attendanceSessions.id,
      courseId: attendanceSessions.courseId,
      courseName: courses.name,
      courseCode: courses.code,
      startTime: attendanceSessions.startTime,
      endTime: attendanceSessions.endTime,
      status: attendanceSessions.status,
    })
    .from(attendanceSessions)
    .innerJoin(courses, eq(attendanceSessions.courseId, courses.id))
    .where(
      and(
        eq(attendanceSessions.id, parseInt(sessionId)),
        eq(attendanceSessions.teacherId, user.id)
      )
    )
    .limit(1);

  if (!session) redirect("/teacher/courses");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Live Attendance</h1>
        <p className="text-muted-foreground">
          {session.courseName} ({session.courseCode})
        </p>
      </div>
      <LiveSessionView
        sessionId={session.id}
        courseId={parseInt(courseId)}
        courseName={session.courseName}
        startTime={session.startTime.toISOString()}
        endTime={session.endTime?.toISOString() ?? null}
        initialStatus={session.status}
      />
    </div>
  );
}
