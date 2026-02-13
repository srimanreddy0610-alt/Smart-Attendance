import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, students } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { studentOnboardingSchema } from "@/lib/validations/student";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkUserId, userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [existing] = await db
      .select()
      .from(students)
      .where(eq(students.clerkUserId, userId))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "Student profile already exists" },
        { status: 409 }
      );
    }

    const body = await req.json();
    const parsed = studentOnboardingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const [student] = await db
      .insert(students)
      .values({
        clerkUserId: userId,
        rollNumber: parsed.data.rollNumber,
        department: parsed.data.department,
        semester: parsed.data.semester,
        section: parsed.data.section,
      })
      .returning();

    return NextResponse.json(student, { status: 201 });
  } catch (error) {
    console.error("[STUDENTS_POST]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [student] = await db
      .select()
      .from(students)
      .where(eq(students.clerkUserId, userId))
      .limit(1);

    if (!student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(student);
  } catch (error) {
    console.error("[STUDENTS_GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
