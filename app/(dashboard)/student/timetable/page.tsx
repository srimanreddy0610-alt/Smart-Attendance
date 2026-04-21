import { redirect } from "next/navigation";
import { getSessionUserId, getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { Student, Enrollment, Course, Timetable } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Calendar, BookOpen } from "lucide-react";

const DAYS = [
  { id: 1, name: "Monday" },
  { id: 2, name: "Tuesday" },
  { id: 3, name: "Wednesday" },
  { id: 4, name: "Thursday" },
  { id: 5, name: "Friday" },
  { id: 6, name: "Saturday" },
  { id: 7, name: "Sunday" },
];

export default async function StudentTimetablePage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in");

  await getDb();

  const student = await Student.findOne({ user: userId });
  if (!student) redirect("/onboarding");

  // Get enrolled courses
  const enrollments = await Enrollment.find({ studentId: student._id }).lean();
  const enrolledCourseIds = enrollments.map((e: any) => e.courseId);

  // Get all timetable entries for those courses
  const timetableEntriesRaw = await Timetable.find({
    courseId: { $in: enrolledCourseIds }
  }).populate('courseId').sort({ startTime: 1 }).lean();

  const timetableByDay = DAYS.map((day) => ({
    ...day,
    classes: timetableEntriesRaw
      .filter((t: any) => t.dayOfWeek === day.id)
      .map((t: any) => ({
        id: t._id.toString(),
        courseName: t.courseId?.name,
        courseCode: t.courseId?.code,
        startTime: t.startTime,
        endTime: t.endTime,
        roomNumber: t.roomNumber,
      })),
  }));

  const currentDay = new Date().getDay();
  const defaultDay = (currentDay === 0 ? 7 : currentDay).toString();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Academic Schedule</h1>
        <p className="text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Showing schedule for Section {student.section}
        </p>
      </div>

      <Tabs defaultValue={defaultDay} className="w-full">
        <div className="flex items-center justify-between gap-4 overflow-x-auto pb-2 scrollbar-none">
            <TabsList className="h-12 inline-flex">
            {DAYS.map((day) => (
                <TabsTrigger key={day.id} value={day.id.toString()} className="px-5">
                <span className="hidden md:inline">{day.name}</span>
                <span className="md:hidden">{day.name.substring(0, 3)}</span>
                </TabsTrigger>
            ))}
            </TabsList>
        </div>

        {timetableByDay.map((day) => (
          <TabsContent key={day.id} value={day.id.toString()} className="mt-6 space-y-4">
            {day.classes.length === 0 ? (
              <Card className="border-dashed py-12 flex flex-col items-center justify-center text-muted-foreground bg-muted/10">
                <div className="bg-muted p-3 rounded-full mb-3">
                    <Clock className="h-8 w-8 opacity-20" />
                </div>
                <p>No classes scheduled for {day.name}</p>
                <p className="text-xs">Enjoy your day off!</p>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {day.classes.map((cls) => (
                  <Card key={cls.id} className="group hover:border-primary/40 transition-all hover:shadow-md">
                    <CardContent className="p-5 flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/5 group-hover:bg-primary/10 transition-colors">
                        <BookOpen className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                           <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">{cls.courseCode}</Badge>
                           <span className="text-xs font-bold text-primary flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded">
                              <MapPin className="h-3 w-3" />
                              {cls.roomNumber || "TBA"}
                           </span>
                        </div>
                        <h4 className="font-bold text-base mb-2 group-hover:text-primary transition-colors truncate">
                          {cls.courseName}
                        </h4>
                        <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                          <span className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded-md tracking-tight">
                            <Clock className="h-3.5 w-3.5" />
                            {cls.startTime} - {cls.endTime}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}


