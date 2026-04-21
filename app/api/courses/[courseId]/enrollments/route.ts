import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/lib/db";
import { Course, Enrollment, Student, User } from "@/lib/db/schema";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = await params;
    await getDb();

    const enrollments = await Enrollment.find({ courseId })
      .populate({
        path: 'studentId',
        populate: {
          path: 'user',
          select: 'firstName lastName email clerkUserId'
        }
      }).lean();

    const enrolledStudents = enrollments.map((e: any) => {
      const student = e.studentId;
      const user = student?.user;
      return {
        enrollmentId: e._id,
        studentId: student?._id,
        rollNumber: student?.rollNumber,
        department: student?.department,
        semester: student?.semester,
        section: student?.section,
        photoUrl: student?.photoUrl,
        firstName: user?.firstName,
        lastName: user?.lastName,
        email: user?.email,
        enrolledAt: e.enrolledAt,
      };
    }).sort((a: any, b: any) => (a.rollNumber || "").localeCompare(b.rollNumber || ""));

    return NextResponse.json(enrolledStudents);
  } catch (error) {
    console.error("[ENROLLMENTS_GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await getDb();

    const user = await User.findOne({ clerkUserId: userId });

    if (!user || user.role !== "teacher") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { courseId } = await params;
    const body = await req.json();
    const { rollNumber } = body;

    if (!rollNumber) {
      return NextResponse.json(
        { error: "Roll number is required" },
        { status: 400 }
      );
    }

    const student = await Student.findOne({ rollNumber });

    if (!student) {
      return NextResponse.json(
        { error: "Student not found with this roll number" },
        { status: 404 }
      );
    }

    const existing = await Enrollment.findOne({
      courseId,
      studentId: student._id
    });

    if (existing) {
      return NextResponse.json(
        { error: "Student already enrolled" },
        { status: 409 }
      );
    }

    const enrollment = await Enrollment.create({
      courseId,
      studentId: student._id,
    });

    return NextResponse.json(enrollment, { status: 201 });
  } catch (error) {
    console.error("[ENROLLMENTS_POST]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await getDb();

    const user = await User.findOne({ clerkUserId: userId });

    if (!user || user.role !== "teacher") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { courseId } = await params;
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json(
        { error: "Student ID is required" },
        { status: 400 }
      );
    }

    await Enrollment.deleteOne({
      courseId,
      studentId
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ENROLLMENTS_DELETE]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
