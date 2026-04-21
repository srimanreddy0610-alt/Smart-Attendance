import { NextResponse } from "next/server";
import { getCurrentUser, getSessionUserId } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { Course, User, Enrollment, Student } from "@/lib/db/schema";
import { courseSchema } from "@/lib/validations/course";

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await getDb();

    const user = await User.findById(userId);

    if (!user || user.role !== "teacher") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = courseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const course = await Course.create({
      ...parsed.data,
      teacherId: user._id,
    });

    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    console.error("[COURSES_POST]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await getDb();

    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role === "teacher") {
      const courses = await Course.find({ teacherId: user._id }).sort({ createdAt: 1 }).lean();
      
      const coursesWithCounts = await Promise.all(courses.map(async (c) => {
        const studentCount = await Enrollment.countDocuments({ courseId: c._id });
        return {
          id: c._id,
          name: c.name,
          code: c.code,
          department: c.department,
          semester: c.semester,
          section: c.section,
          createdAt: c.createdAt,
          studentCount,
        };
      }));

      return NextResponse.json(coursesWithCounts);
    }

    // Handle generic GET with query params
    const { searchParams } = new URL(req.url);
    const streamId = searchParams.get("streamId");
    const section = searchParams.get("section");

    if (streamId) {
      const query: any = { streamId };
      if (section) query.section = section;
      const courses = await Course.find(query).sort({ name: 1 }).lean();
      return NextResponse.json(courses);
    }

    // Student: get enrolled courses
    const student = await Student.findOne({ user: userId });

    if (!student) {
      return NextResponse.json([]);
    }

    const enrollments = await Enrollment.find({ studentId: student._id })
      .populate({
        path: 'courseId',
        populate: {
          path: 'teacherId',
          model: 'User',
          select: 'firstName lastName'
        }
      }).lean();

    const enrolledCourses = enrollments.map((e: any) => {
      const course = e.courseId;
      const teacher = course?.teacherId;
      return {
        id: course?._id,
        name: course?.name,
        code: course?.code,
        department: course?.department,
        semester: course?.semester,
        section: course?.section,
        teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : "Unknown",
        enrolledAt: e.enrolledAt,
      };
    }).sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    return NextResponse.json(enrolledCourses);
  } catch (error) {
    console.error("[COURSES_GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


