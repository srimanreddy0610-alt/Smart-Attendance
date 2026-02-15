import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, students } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) return null;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkUserId, userId))
    .limit(1);

  if (user) return user;

  // User is authenticated with Clerk but not yet in DB (webhook may be delayed).
  // Auto-sync from Clerk to avoid requiring a manual page refresh.
  try {
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
    const teacherEmails = (process.env.TEACHER_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const role: "teacher" | "student" = teacherEmails.includes(
      email.toLowerCase()
    )
      ? "teacher"
      : "student";

    const [newUser] = await db
      .insert(users)
      .values({
        clerkUserId: userId,
        email,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        role,
      })
      .onConflictDoNothing()
      .returning();

    if (newUser) return newUser;

    // If onConflictDoNothing returned nothing, the webhook beat us - re-fetch
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.clerkUserId, userId))
      .limit(1);
    return existing ?? null;
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireTeacher() {
  const user = await requireUser();
  if (user.role !== "teacher")
    throw new Error("Forbidden: Teacher role required");
  return user;
}

export async function requireStudent() {
  const user = await requireUser();
  if (user.role !== "student")
    throw new Error("Forbidden: Student role required");
  return user;
}

export async function getStudentProfile(clerkUserId: string) {
  const [student] = await db
    .select()
    .from(students)
    .where(eq(students.clerkUserId, clerkUserId))
    .limit(1);

  return student ?? null;
}
