import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

/**
 * Server-side smart redirect hub.
 * Determines where to send the user based on their role and profile state.
 */
export default async function DashboardRedirectPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  if (user.role === "teacher") {
    redirect("/teacher/dashboard");
  }

  if (user.role === "student") {
    redirect("/student/dashboard");
  }

  if (user.role === "admin") {
    redirect("/admin/dashboard");
  }

  if (user.role === "parent") {
    redirect("/parent/dashboard");
  }

  // Fallback
  redirect("/sign-in");
}
