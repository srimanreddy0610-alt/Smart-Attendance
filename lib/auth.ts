import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { User, Student } from "@/lib/db/schema";
import { decrypt } from "./session";

export async function getCurrentUser() {
  await getDb();
  
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const payload = await decrypt(session);

  if (!payload?.userId) {
    // Check for development bypass if needed, but let's stick to session for "simple" auth
    return null;
  }

  const user = await User.findById(payload.userId).select("-password");
  if (!user) return null;

  return JSON.parse(JSON.stringify(user.toObject()));
}

export async function getSessionUserId() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const payload = await decrypt(session);
  return (payload?.userId as string) || null;
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

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin")
    throw new Error("Forbidden: Admin role required");
  return user;
}

export async function requireParent() {
  const user = await requireUser();
  if (user.role !== "parent")
    throw new Error("Forbidden: Parent role required");
  return user;
}

export async function getStudentProfile(userId: string) {
  await getDb();
  const student = await Student.findOne({ user: userId });
  return student?.toObject() ?? null;
}
