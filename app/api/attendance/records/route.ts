import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  AttendanceRecord,
  AttendanceSession,
  Student,
  User,
} from "@/lib/db/schema";

export async function GET(req: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");
    const studentId = searchParams.get("studentId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    await getDb();

    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filterRecord: any = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filterSession: any = {};

    // If student, restrict to their own records
    if (user.role === "student") {
      const student = await Student.findOne({ user: userId });

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = records.map((record: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const session = sessions.find((s: any) => s._id.toString() === record.sessionId.toString());
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

