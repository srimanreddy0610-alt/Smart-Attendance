import { redirect } from "next/navigation";
import { getSessionUserId, getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { User, Course } from "@/lib/db/schema";
import { ReportsDashboard } from "@/components/teacher/reports-dashboard";

export default async function ReportsPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in");

  await getDb();

  const user = await User.findById(userId);

  if (!user || user.role !== "teacher") redirect("/");

  const coursesDocs = await Course.find({ teacherId: user._id }).sort({ name: 1 }).lean();

  const teacherCourses = coursesDocs.map((c: any) => ({
    id: c._id.toString(),
    name: c.name,
    code: c.code,
  }));

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


