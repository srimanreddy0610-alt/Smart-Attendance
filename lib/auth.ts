import { auth } from "@clerk/nextjs/server";
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

  return user ?? null;
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
