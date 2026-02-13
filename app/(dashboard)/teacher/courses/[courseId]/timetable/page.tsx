import { redirect } from "next/navigation";

export default async function TimetablePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  // Timetable is managed from the course detail tabs
  redirect(`/teacher/courses/${courseId}`);
}
