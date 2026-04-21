import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/lib/db";
import {
  AttendanceSession,
  AttendanceRecord,
  Student,
  User,
  Course,
  Enrollment,
} from "@/lib/db/schema";
import { pusherServer } from "@/lib/pusher/server";
import { CHANNELS, EVENTS } from "@/lib/pusher/channels";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await params;
    await getDb();

    const session = await AttendanceSession.findById(sessionId).populate('courseId').lean();

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }
    
    const course = session.courseId as any;

    const formattedSession = {
      id: session._id,
      courseId: course._id,
      courseName: course.name,
      courseCode: course.code,
      startTime: session.startTime,
      endTime: session.endTime,
      status: session.status,
      sessionDate: session.sessionDate,
    };

    // Get all enrolled students with their attendance records
    const enrollments = await Enrollment.find({ courseId: course._id }).populate({
      path: 'studentId',
      populate: {
        path: 'user'
      }
    }).lean();

    const records = await AttendanceRecord.find({ sessionId }).lean();
    const recordMap = new Map(records.map((r: any) => [r.studentId.toString(), r]));

    const studentRecords = enrollments.map((e: any) => {
      const student = e.studentId as any;
      const userObj = student?.user as any;
      const record = recordMap.get(student?._id.toString());
      
      return {
        id: record?._id ?? null,
        studentId: student?._id,
        studentName: userObj ? `${userObj.firstName} ${userObj.lastName}` : "Unknown",
        rollNumber: student?.rollNumber,
        photoUrl: student?.photoUrl,
        status: record?.status ?? "absent",
        markedAt: record?.markedAt ? new Date(record.markedAt).toISOString() : null,
        confidenceScore: record?.confidenceScore ?? null,
        isManualEntry: record?.isManualEntry ?? false,
      };
    });

    const presentCount = studentRecords.filter(
      (r) => r.status === "present"
    ).length;

    return NextResponse.json({
      ...formattedSession,
      records: studentRecords,
      totalStudents: enrollments.length,
      presentCount,
    });
  } catch (error) {
    console.error("[SESSION_GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
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

    const { sessionId } = await params;

    const session = await AttendanceSession.findOne({
      _id: sessionId,
      teacherId: user._id
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const updated = await AttendanceSession.findByIdAndUpdate(
      sessionId,
      { status: "ended", endTime: new Date() },
      { new: true }
    );

    await pusherServer.trigger(
      CHANNELS.session(sessionId),
      EVENTS.SESSION_ENDED,
      { sessionId }
    );

    return NextResponse.json({ ...updated?.toObject(), id: updated?._id });
  } catch (error) {
    console.error("[SESSION_PUT]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
