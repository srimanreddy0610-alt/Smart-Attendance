import { NextResponse } from "next/server";
import { getCurrentUser, getSessionUserId } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { Student, Enrollment, Course } from "@/lib/db/schema";

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await getDb();
    const student = await Student.findOne({ user: userId });
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const { courseId } = await req.json();
    if (!courseId) return NextResponse.json({ error: "Course ID is required" }, { status: 400 });

    const course = await Course.findById(courseId);
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

    // Verify section matches
    if (!student.streamId) {
        return NextResponse.json({ error: "Your profile is incomplete. Please contact admin to set your Academic Stream." }, { status: 400 });
    }

    if (course.section !== student.section || course.streamId?.toString() !== student.streamId?.toString()) {
        console.log("Validation failed:", { 
            courseSection: course.section, 
            studentSection: student.section,
            courseStream: course.streamId?.toString(),
            studentStream: student.streamId?.toString()
        });
        return NextResponse.json({ error: "This course is not available for your section/stream" }, { status: 403 });
    }

    const existing = await Enrollment.findOne({ studentId: student._id, courseId });
    if (existing) return NextResponse.json({ error: "Already enrolled" }, { status: 409 });

    const enrollment = await Enrollment.create({
      studentId: student._id,
      courseId,
    });

    return NextResponse.json(enrollment, { status: 201 });
  } catch (error) {
    console.error("Enrollment error:", error);
    return NextResponse.json({ 
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}


