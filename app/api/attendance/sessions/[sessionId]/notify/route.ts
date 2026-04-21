import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { AttendanceSession, Enrollment, Student, User } from "@/lib/db/schema";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const user = await getCurrentUser();
  const userId = user?._id?.toString();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { sessionId } = await params;
    await getDb();

    const session = await AttendanceSession.findById(sessionId).populate('courseId');
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    const course = session.courseId as any;
    
    // Get all enrolled students
    const enrollments = await Enrollment.find({ courseId: course._id }).populate({
      path: 'studentId',
      populate: { path: 'user' }
    });

    const studentEmails = enrollments
      .map((e: any) => e.studentId?.user?.email)
      .filter(Boolean);

    // Mock sending email
    console.log(`[NOTIFICATION] Sending attendance alert for ${course.name} to:`, studentEmails);
    console.log(`[NOTIFICATION] Access Code: ${session.accessCode}`);

    return NextResponse.json({ success: true, count: studentEmails.length });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
