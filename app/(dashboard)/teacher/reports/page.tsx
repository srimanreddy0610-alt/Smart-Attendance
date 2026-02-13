import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, courses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ReportsDashboard } from "@/components/teacher/reports-dashboard";

export default async function ReportsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkUserId, userId))
    .limit(1);

  if (!user || user.role !== "teacher") redirect("/");

  const teacherCourses = await db
    .select({
      id: courses.id,
      name: courses.name,
      code: courses.code,
    })
    .from(courses)
    .where(eq(courses.teacherId, user.id))
    .orderBy(courses.name);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        <p className="text-muted-foreground">
          View attendance reports and analytics
        </p>
      </div>
      <ReportsDashboard courses={teacherCourses} />
    </div>
  );
}
