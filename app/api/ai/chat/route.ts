import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "@/lib/db";
import {
  students,
  courses,
  enrollments,
  attendanceRecords,
  attendanceSessions,
  timetable,
  users,
} from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message, history } = await req.json();
  if (!message?.trim()) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  // Fetch student profile + user name
  const [student] = await db
    .select()
    .from(students)
    .where(eq(students.clerkUserId, userId))
    .limit(1);

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const [userRecord] = await db
    .select({ firstName: users.firstName, lastName: users.lastName })
    .from(users)
    .where(eq(users.clerkUserId, userId))
    .limit(1);

  // Fetch enrolled courses with attendance stats
  const enrolledCourses = await db
    .select({
      courseId: courses.id,
      courseName: courses.name,
      courseCode: courses.code,
      teacherFirstName: users.firstName,
      teacherLastName: users.lastName,
    })
    .from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .innerJoin(users, eq(courses.teacherId, users.id))
    .where(eq(enrollments.studentId, student.id));

  const coursesWithStats = await Promise.all(
    enrolledCourses.map(async (c) => {
      const [totalResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(attendanceSessions)
        .where(eq(attendanceSessions.courseId, c.courseId));

      const [presentResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(attendanceRecords)
        .innerJoin(
          attendanceSessions,
          eq(attendanceRecords.sessionId, attendanceSessions.id),
        )
        .where(
          and(
            eq(attendanceSessions.courseId, c.courseId),
            eq(attendanceRecords.studentId, student.id),
            eq(attendanceRecords.status, "present"),
          ),
        );

      const total = Number(totalResult?.count ?? 0);
      const present = Number(presentResult?.count ?? 0);
      const absent = total - present;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

      // How many more classes can be missed and still stay above 75%?
      // present / (total + future) >= 0.75 → future = (present/0.75) - total
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
        ...c,
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
  const courseIds = enrolledCourses.map((c) => c.courseId);

  const todaysClasses =
    courseIds.length > 0
      ? await db
          .select({
            courseName: courses.name,
            startTime: timetable.startTime,
            endTime: timetable.endTime,
            roomNumber: timetable.roomNumber,
          })
          .from(timetable)
          .innerJoin(courses, eq(timetable.courseId, courses.id))
          .where(
            and(
              eq(timetable.dayOfWeek, dayOfWeek),
              sql`${timetable.courseId} IN (${sql.join(
                courseIds.map((id) => sql`${id}`),
                sql`, `,
              )})`,
            ),
          )
          .orderBy(timetable.startTime)
      : [];

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
    todaysClasses.length > 0
      ? todaysClasses
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
