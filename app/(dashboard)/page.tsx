import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { students } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export default async function DashboardRoot() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  if (user.role === "teacher") {
    redirect("/teacher/dashboard");
  }

  // Check if student has completed onboarding
  const [student] = await db
    .select()
    .from(students)
    .where(eq(students.clerkUserId, user.clerkUserId))
    .limit(1);

  if (!student) {
    redirect("/onboarding");
  }

  redirect("/student/dashboard");
}
