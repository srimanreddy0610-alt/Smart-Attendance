import { auth, clerkClient } from "@clerk/nextjs/server";
import { getDb } from "@/lib/db";
import { User, Student } from "@/lib/db/schema";

export async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) return null;

  await getDb();

  const user = await User.findOne({ clerkUserId: userId });

  if (user) {
    console.log(`[AUTH] User found in DB: ${user.email}, Role: ${user.role}`);
    return user.toObject();
  }

  console.log(`[AUTH] User ${userId} not found in DB, syncing from Clerk...`);

  // User is authenticated with Clerk but not yet in DB (webhook may be delayed).
  // Auto-sync from Clerk to avoid requiring a manual page refresh.
  try {
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
    
    console.log(`[AUTH] Clerk User full metadata - Public:`, JSON.stringify(clerkUser.publicMetadata), "Unsafe:", JSON.stringify(clerkUser.unsafeMetadata));
    
    // Trust Clerk public or unsafe metadata for the role if it's set during registration
    let role: "admin" | "teacher" | "parent" | "student" = 
      (clerkUser.publicMetadata?.role as any) || (clerkUser.unsafeMetadata?.role as any) || "student";

    console.log(`[AUTH] Extracted Metadata Role: ${role}`);

    try {
      const newUser = await User.create({
        clerkUserId: userId,
        email,
        firstName: clerkUser.firstName || undefined,
        lastName: clerkUser.lastName || undefined,
        role,
      });
      return newUser.toObject();
    } catch (e: any) {
      if (e?.code === 11000) {
        const existing = await User.findOne({ clerkUserId: userId });
        return existing?.toObject() ?? null;
      }
      throw e;
    }
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

export async function getStudentProfile(clerkUserId: string) {
  await getDb();
  const student = await Student.findOne({ clerkUserId });
  return student?.toObject() ?? null;
}
