import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, courses, attendanceSessions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { StartSessionForm } from "@/components/teacher/start-session-form";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkUserId, userId))
    .limit(1);

  if (!user || user.role !== "teacher") redirect("/");

  const { courseId } = await params;

  const [course] = await db
    .select()
    .from(courses)
    .where(and(eq(courses.id, parseInt(courseId)), eq(courses.teacherId, user.id)))
    .limit(1);

  if (!course) redirect("/teacher/courses");

  // Check for existing active session
  const [activeSession] = await db
    .select()
    .from(attendanceSessions)
    .where(
      and(
        eq(attendanceSessions.courseId, parseInt(courseId)),
        eq(attendanceSessions.status, "active")
      )
    )
    .limit(1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Start Attendance Session</h1>
        <p className="text-muted-foreground">
          {course.name} ({course.code})
        </p>
      </div>
      <StartSessionForm
        courseId={course.id}
        courseName={course.name}
        activeSessionId={activeSession?.id}
      />
    </div>
  );
}
