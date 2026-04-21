import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/lib/db";
import {
  AttendanceSession,
  AttendanceRecord,
  Student,
  User,
  Enrollment,
} from "@/lib/db/schema";
import { markAttendanceSchema } from "@/lib/validations/attendance";
import { pusherServer } from "@/lib/pusher/server";
import { CHANNELS, EVENTS } from "@/lib/pusher/channels";

function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - b[i]) ** 2;
  }
  return Math.sqrt(sum);
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await getDb();

    const user = await User.findOne({ clerkUserId: userId });

    if (!user || user.role !== "student") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = markAttendanceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { sessionId, faceDescriptor, confidenceScore, verificationFrames, accessCode } =
      parsed.data;

    // Verify session is active and check access code
    const session = await AttendanceSession.findOne({
      _id: sessionId,
      status: "active"
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found or already ended" },
        { status: 404 }
      );
    }

    if (session.accessCode && session.accessCode.toUpperCase() !== accessCode.toUpperCase()) {
      return NextResponse.json(
        { error: "Invalid access code" },
        { status: 403 }
      );
    }

    // Get student
    const student = await Student.findOne({ clerkUserId: userId });

    if (!student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    // Verify student is enrolled
    const enrollment = await Enrollment.findOne({
      courseId: session.courseId,
      studentId: student._id
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: "Not enrolled in this course" },
        { status: 403 }
      );
    }

    // Check if already marked present
    const existingRecord = await AttendanceRecord.findOne({
      sessionId,
      studentId: student._id,
      status: "present"
    });

    if (existingRecord) {
      return NextResponse.json(
        { error: "Attendance already marked" },
        { status: 409 }
      );
    }

    // Server-side face verification
    if (!student.faceDescriptor) {
      return NextResponse.json(
        { error: "Face not registered. Please complete face enrollment." },
        { status: 400 }
      );
    }

    const storedDescriptor = JSON.parse(student.faceDescriptor) as number[];
    const distance = euclideanDistance(storedDescriptor, faceDescriptor);
    const serverSimilarity = Math.max(
      0,
      Math.min(100, Math.round((1 - distance) * 100))
    );

    const threshold = Number(process.env.NEXT_PUBLIC_FACE_MATCH_THRESHOLD ?? "75");
    if (serverSimilarity < threshold) {
      return NextResponse.json(
        {
          error: "Face not recognized. Please try again.",
          similarity: serverSimilarity,
        },
        { status: 400 }
      );
    }

    // Upsert attendance record
    const record = await AttendanceRecord.findOneAndUpdate(
      {
        sessionId,
        studentId: student._id
      },
      {
        status: "present",
        markedAt: new Date(),
        confidenceScore: serverSimilarity,
        verificationFrames,
      },
      { new: true, upsert: true }
    );

    // Notify via Pusher
    const studentName = [user.firstName, user.lastName]
      .filter(Boolean)
      .join(" ");

    await pusherServer.trigger(
      CHANNELS.session(sessionId.toString()),
      EVENTS.ATTENDANCE_MARKED,
      {
        studentId: student._id.toString(),
        studentName,
        rollNumber: student.rollNumber,
        confidenceScore: serverSimilarity,
      }
    );

    return NextResponse.json({
      success: true,
      similarity: serverSimilarity,
      record,
    });
  } catch (error) {
    console.error("[MARK_ATTENDANCE_POST]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
