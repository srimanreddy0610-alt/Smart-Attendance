import { getSessionUserId, getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getDb } from "@/lib/db";
import {
  Student,
  Course,
  Enrollment,
  AttendanceRecord,
  AttendanceSession,
  Timetable,
  User,
} from "@/lib/db/schema";

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message, history } = await req.json();
  if (!message?.trim()) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  await getDb();

  // Fetch student profile + user name
  const student = await Student.findOne({ user: userId });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const userRecord = await User.findById(userId);

  // Fetch enrolled courses with attendance stats
  const enrollments = await Enrollment.find({ studentId: student._id }).populate({
    path: 'courseId',
    populate: { path: 'teacherId' }
  });

  const coursesWithStats = await Promise.all(
    enrollments.map(async (e: any) => {
      const c = e.courseId;
      const teacher = c.teacherId;

      const total = await AttendanceSession.countDocuments({ courseId: c._id });

      const presentRecords = await AttendanceRecord.find({
        studentId: student._id,
        status: "present"
      }).populate('sessionId');
      
      const present = presentRecords.filter((r: any) => r.sessionId?.courseId?.toString() === c._id.toString()).length;

      const absent = total - present;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

      // How many more classes can be missed and still stay above 75%?
      const safeToMiss =
        total > 0
          ? Math.max(0, Math.floor((present - 0.75 * total) / 0.75))
          : null;

      // How many must attend to reach 75%?
      const neededForTarget =
        percentage < 75 && total > 0
          ? Math.ceil((0.75 * total - present) / (1 - 0.75))
          : 0;

      return {
        courseId: c._id,
        courseName: c.name,
        courseCode: c.code,
        teacherFirstName: teacher?.firstName,
        teacherLastName: teacher?.lastName,
        total,
        present,
        absent,
        percentage,
        safeToMiss,
        neededForTarget,
        status:
          percentage >= 75 ? "safe" : percentage >= 60 ? "warning" : "critical",
      };
    }),
  );

  // Today's schedule
  const today = new Date().getDay();
  const dayOfWeek = today === 0 ? 7 : today;
  const courseIds = enrollments.map((e: any) => e.courseId._id);

  const todaysClasses = courseIds.length > 0 
    ? await Timetable.find({
        dayOfWeek,
        courseId: { $in: courseIds }
    }).populate('courseId').sort({ startTime: 1 })
    : [];

  const formattedClasses = todaysClasses.map((t: any) => ({
    courseName: t.courseId?.name,
    startTime: t.startTime,
    endTime: t.endTime,
    roomNumber: t.roomNumber,
  }));

  // Build context for Gemini
  const today_date = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const coursesSummary = coursesWithStats
    .map((c) => {
      const teacherName = [c.teacherFirstName, c.teacherLastName]
        .filter(Boolean)
        .join(" ");
      const missInfo =
        c.safeToMiss !== null && c.safeToMiss > 0
          ? `Can miss ${c.safeToMiss} more class(es) and stay above 75%.`
          : c.percentage < 75
            ? `Needs to attend ${c.neededForTarget} consecutive class(es) to reach 75%.`
            : "Must attend all remaining classes to maintain 75%.";
      return `- ${c.courseName} (${c.courseCode}) | Teacher: ${teacherName} | Attended: ${c.present}/${c.total} = ${c.percentage}% | Status: ${c.status.toUpperCase()} | ${missInfo}`;
    })
    .join("\n");

  const scheduleInfo =
    formattedClasses.length > 0
      ? formattedClasses
          .map(
            (t) =>
              `- ${t.courseName}: ${t.startTime}–${t.endTime}${t.roomNumber ? ` in ${t.roomNumber}` : ""}`,
          )
          .join("\n")
      : "No classes scheduled today.";

  const studentName =
    [userRecord?.firstName, userRecord?.lastName].filter(Boolean).join(" ") ||
    "Student";

  const systemPrompt = `You are AttendAI, a helpful and friendly AI attendance advisor for a college student named ${studentName}.

Today is ${today_date}.

Student Profile:
- Name: ${studentName}
- Roll Number: ${student.rollNumber}
- Department: ${student.department}
- Semester: ${student.semester}
- Section: ${student.section}

Attendance Summary (minimum required: 75% per course):
${coursesSummary || "No courses enrolled yet."}

Today's Schedule:
${scheduleInfo}

Your role:
- Answer questions about attendance, risk levels, and course status
- Give personalized advice on which courses need immediate attention
- Warn about courses at risk (below 75%) with clear action steps
- Be encouraging and supportive
- Keep responses concise (2-4 sentences unless detailed breakdown is needed)
- Use emojis sparingly to keep the tone friendly
- Never make up data — only use the information provided above`;

  // Build Gemini chat
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    systemInstruction: systemPrompt,
  });

  const chat = model.startChat({
    history: (history ?? []).map((msg: { role: string; content: string }) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    })),
  });

  const result = await chat.sendMessage(message);
  const response = result.response.text();

  return NextResponse.json({ response });
}


