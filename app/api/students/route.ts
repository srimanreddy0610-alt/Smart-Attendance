import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/lib/db";
import { User, Student } from "@/lib/db/schema";
import { studentOnboardingSchema } from "@/lib/validations/student";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await getDb();

    const user = await User.findOne({ clerkUserId: userId });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existing = await Student.findOne({ clerkUserId: userId });

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

    const student = await Student.create({
      clerkUserId: userId,
      user: user._id,
      rollNumber: parsed.data.rollNumber,
      department: parsed.data.department,
      semester: parsed.data.semester,
      section: parsed.data.section,
    });

    // Create enrollments for selected courses
    if (parsed.data.courseIds && parsed.data.courseIds.length > 0) {
      const { Enrollment } = await import("@/lib/db/schema");
      const enrollmentPromises = parsed.data.courseIds.map((courseId) => 
        Enrollment.create({
          courseId,
          studentId: student._id,
        })
      );
      await Promise.all(enrollmentPromises);
    }

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

    await getDb();

    const student = await Student.findOne({ clerkUserId: userId });

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
