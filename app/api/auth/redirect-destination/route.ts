import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { students } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Returns the correct destination URL for the currently signed-in user.
 * Called by the /dashboard client page after Clerk auth is confirmed.
 */
export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ destination: "/sign-in" });
  }

  if (user.role === "teacher") {
    return NextResponse.json({ destination: "/teacher/dashboard" });
  }

  // Check if student has completed onboarding
  const [student] = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.clerkUserId, user.clerkUserId))
    .limit(1);

  if (!student) {
    return NextResponse.json({ destination: "/onboarding" });
  }

  return NextResponse.json({ destination: "/student/dashboard" });
}
