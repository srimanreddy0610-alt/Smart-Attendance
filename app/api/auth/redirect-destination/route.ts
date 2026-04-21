import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { Student } from "@/lib/db/schema";

/**
 * Returns the correct destination URL for the currently signed-in user.
 * Called by the /dashboard client page after Clerk auth is confirmed.
 */
export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    console.log("[REDIRECT] No user found, going to sign-in");
    return NextResponse.json({ destination: "/sign-in" });
  }

  console.log(`[REDIRECT] User Role: ${user.role}`);

  if (user.role === "admin") {
    return NextResponse.json({ destination: "/admin/dashboard" });
  }

  if (user.role === "teacher") {
    return NextResponse.json({ destination: "/teacher/dashboard" });
  }

  if (user.role === "parent") {
    return NextResponse.json({ destination: "/parent/dashboard" });
  }

  await getDb();

  // Check if student has completed onboarding
  const student = await Student.findOne({ user: user._id }).select('_id');

  if (!student) {
    console.log("[REDIRECT] Student onboarding incomplete, going to /onboarding");
    return NextResponse.json({ destination: "/onboarding" });
  }

  console.log("[REDIRECT] Student onboarding complete, going to dashboard");

  return NextResponse.json({ destination: "/student/dashboard" });
}

