import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/lib/db";
import { User, Course, Enrollment } from "@/lib/db/schema";
import { CourseList } from "@/components/teacher/course-list";

export default async function TeacherCoursesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  await getDb();

  const user = await User.findOne({ clerkUserId: userId });

  if (!user || user.role !== "teacher") redirect("/");

  const coursesList = await Course.find({ teacherId: user._id }).sort({ name: 1 }).lean();

  const teacherCourses = await Promise.all(coursesList.map(async (c: any) => {
    const studentCount = await Enrollment.countDocuments({ courseId: c._id });
    return {
      id: c._id.toString(),
      name: c.name,
      code: c.code,
      department: c.department,
      semester: c.semester,
      section: c.section,
      createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
      studentCount,
    };
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Courses</h1>
          <p className="text-muted-foreground">
            Manage your courses and students
          </p>
        </div>
      </div>
      <CourseList courses={teacherCourses} />
    </div>
  );
}
