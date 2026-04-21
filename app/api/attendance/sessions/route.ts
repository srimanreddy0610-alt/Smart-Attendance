import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/lib/db";
import {
  AttendanceSession,
  Course,
  User,
  Enrollment,
  AttendanceRecord,
} from "@/lib/db/schema";
import { startSessionSchema } from "@/lib/validations/attendance";
import { pusherServer } from "@/lib/pusher/server";
import { CHANNELS, EVENTS } from "@/lib/pusher/channels";

export async function POST(req: Request) {
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

    const body = await req.json();
    const parsed = startSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { courseId, duration } = parsed.data;

    // Verify course belongs to teacher
    const course = await Course.findOne({
      _id: courseId,
      teacherId: user._id
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Check for existing active session
    const activeSession = await AttendanceSession.findOne({
      courseId,
      status: "active"
    });

    if (activeSession) {
      return NextResponse.json(
        { error: "An active session already exists for this course" },
        { status: 409 }
      );
    }

    const now = new Date();
    const endTime = new Date(now.getTime() + duration * 60 * 1000);

    const session = await AttendanceSession.create({
      courseId,
      teacherId: user._id,
      sessionDate: now,
      startTime: now,
      endTime,
      status: "active",
      metadata: { duration },
    });

    // Notify enrolled students via Pusher
    const teacherName = [user.firstName, user.lastName]
      .filter(Boolean)
      .join(" ");

    await pusherServer.trigger(
      CHANNELS.course(courseId),
      EVENTS.SESSION_STARTED,
      {
        sessionId: session._id.toString(),
        courseName: course.name,
        teacherName,
      }
    );

    return NextResponse.json({ ...session.toObject(), id: session._id }, { status: 201 });
  } catch (error) {
    console.error("[SESSIONS_POST]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");
    
    await getDb();

    let queryFilter: any = {};
    if(courseId) queryFilter.courseId = courseId;

    const sessions = await AttendanceSession.find(queryFilter)
      .populate('courseId')
      .populate('teacherId')
      .sort({ startTime: -1 })
      .lean();

    const sessionsWithStats = await Promise.all(sessions.map(async (s: any) => {
      const presentCount = await AttendanceRecord.countDocuments({
        sessionId: s._id,
        status: 'present'
      });
      
      const totalEnrolled = await Enrollment.countDocuments({
        courseId: s.courseId._id
      });
      
      const course = s.courseId;
      const teacher = s.teacherId;

      return {
        id: s._id,
        courseId: s.courseId._id,
        courseName: course?.name,
        courseCode: course?.code,
        teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : "Unknown",
        sessionDate: s.sessionDate,
        startTime: s.startTime,
        endTime: s.endTime,
        status: s.status,
        presentCount,
        totalEnrolled
      };
    }));

    return NextResponse.json(sessionsWithStats);
  } catch (error) {
    console.error("[SESSIONS_GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
