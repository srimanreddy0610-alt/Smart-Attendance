import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/lib/db";
import {
  AttendanceRecord,
  AttendanceSession,
  Course,
  Student,
  User,
} from "@/lib/db/schema";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");
    const studentId = searchParams.get("studentId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    await getDb();

    const user = await User.findOne({ clerkUserId: userId });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let filterRecord: any = {};
    let filterSession: any = {};

    // If student, restrict to their own records
    if (user.role === "student") {
      const student = await Student.findOne({ clerkUserId: userId });

      if (!student) {
        return NextResponse.json([]);
      }

      filterRecord.studentId = student._id;
    }

    if (studentId) {
      filterRecord.studentId = studentId;
    }

    if (courseId) {
      filterSession.courseId = courseId;
    }

    if (startDate || endDate) {
      filterSession.sessionDate = {};
      if (startDate) {
        filterSession.sessionDate.$gte = new Date(startDate);
      }
      if (endDate) {
        filterSession.sessionDate.$lte = new Date(endDate);
      }
    }

    // First find matching sessions
    const sessions = await AttendanceSession.find(filterSession).select('_id courseId sessionDate').populate({
      path: 'courseId',
      select: 'name code _id'
    }).lean();

    const sessionIds = sessions.map(s => s._id);

    filterRecord.sessionId = { $in: sessionIds };

    const records = await AttendanceRecord.find(filterRecord)
      .sort({ markedAt: -1 })
      .limit(100)
      .lean();

    // Map the results back to the desired format
    const results = records.map((record: any) => {
      const session = sessions.find((s: any) => s._id.toString() === record.sessionId.toString());
      const course = session?.courseId as any;

      return {
        id: record._id,
        sessionId: record.sessionId,
        studentId: record.studentId,
        status: record.status,
        markedAt: record.markedAt,
        confidenceScore: record.confidenceScore,
        isManualEntry: record.isManualEntry,
        sessionDate: session?.sessionDate,
        courseName: course?.name,
        courseCode: course?.code,
        courseId: course?._id,
      };
    }).sort((a: any, b: any) => {
        if(!a.sessionDate || !b.sessionDate) return 0;
        return new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime();
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error("[RECORDS_GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
