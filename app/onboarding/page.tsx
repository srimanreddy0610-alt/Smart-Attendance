import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { Student } from "@/lib/db/schema";
import { OnboardingView } from "@/components/onboarding/onboarding-view";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) {
    console.log("[ONBOARDING_PAGE] No user found, redirecting to sign-in");
    redirect("/sign-in");
  }

  console.log(`[ONBOARDING_PAGE] Rendering for user ${user._id}, role: ${user.role}`);

  // If role is already set to something other than student, redirect them to their dashboard
  // Unless they landed here specifically to change it (optional logic)
  if (user.role === "teacher") redirect("/teacher/dashboard");
  if (user.role === "admin") redirect("/admin/dashboard");
  if (user.role === "parent") redirect("/parent/dashboard");

  await getDb();

  const existingStudent = await Student.findOne({ user: user._id }).select('_id');

  if (existingStudent) {
    console.log("[ONBOARDING_PAGE] Student profile already exists, redirecting to student dashboard");
    redirect("/student/dashboard");
  }

  return <OnboardingView />;
}

