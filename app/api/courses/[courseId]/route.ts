import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { Course, User, Enrollment, Timetable } from "@/lib/db/schema";
import { courseSchema } from "@/lib/validations/course";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const user = await getCurrentUser();
  const userId = user?._id?.toString();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = await params;
    await getDb();

    const course = await Course.findById(courseId).populate({
      path: 'teacherId',
      select: 'firstName lastName'
    }).lean();

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const studentCount = await Enrollment.countDocuments({ courseId: course._id });
    
    const teacher = course.teacherId as any;

    const formattedCourse = {
      id: course._id,
      name: course.name,
      code: course.code,
      department: course.department,
      semester: course.semester,
      section: course.section,
      teacherId: teacher?._id,
      createdAt: course.createdAt,
      teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : "Unknown",
      studentCount,
    };

    const timetableEntries = await Timetable.find({ courseId: course._id })
      .sort({ dayOfWeek: 1, startTime: 1 })
      .lean();

    const formattedTable = timetableEntries.map((t: any) => ({
      ...t,
      id: t._id,
    }));

    return NextResponse.json({ ...formattedCourse, timetable: formattedTable });
  } catch (error) {
    console.error("[COURSE_GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const user = await getCurrentUser();
  const userId = user?._id?.toString();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await getDb();
    
    const user = await User.findById(userId);

    if (!user || user.role !== "teacher") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { courseId } = await params;
    const course = await Course.findOne({
      _id: courseId,
      teacherId: user._id
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = courseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await Course.findByIdAndUpdate(courseId, parsed.data, { new: true });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[COURSE_PUT]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const user = await getCurrentUser();
  const userId = user?._id?.toString();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await getDb();

    const user = await User.findById(userId);

    if (!user || user.role !== "teacher") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { courseId } = await params;
    const course = await Course.findOne({
      _id: courseId,
      teacherId: user._id
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    await Course.findByIdAndDelete(courseId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[COURSE_DELETE]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
