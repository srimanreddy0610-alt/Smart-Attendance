import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { Student } from "@/lib/db/schema";

export default async function DashboardRoot() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  if (user.role === "admin") {
    redirect("/admin/dashboard");
  }

  if (user.role === "teacher") {
    redirect("/teacher/dashboard");
  }

  if (user.role === "parent") {
    redirect("/parent/dashboard");
  }

  await getDb();

  // Check if student has completed onboarding
  const student = await Student.findOne({ clerkUserId: user.clerkUserId }).select('_id');

  if (!student) {
    redirect("/onboarding");
  }

  redirect("/student/dashboard");
}
