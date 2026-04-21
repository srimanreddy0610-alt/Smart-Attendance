import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/lib/db";
import { Student, User, Enrollment, Course, Stream } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, GraduationCap, Mail, User as UserIcon, Sparkles, Building2 } from "lucide-react";
import { RegisterCourseButton } from "@/components/student/register-course-button";

export default async function StudentProfilePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  await getDb();

  const user = await User.findOne({ clerkUserId: userId });
  const student = await Student.findOne({ clerkUserId: userId }).populate('streamId');

  if (!student || !user) redirect("/onboarding");

  // Enrolled courses
  const enrollments = await Enrollment.find({ studentId: student._id }).populate({
    path: 'courseId',
    populate: { path: 'teacherId' }
  }).lean();

  const enrolledCourseIds = enrollments.map((e: any) => e.courseId?._id.toString());

  // Available courses for suggestion
  const suggestedCourses = await Course.find({
    streamId: student.streamId._id,
    section: student.section,
    _id: { $nin: enrolledCourseIds }
  }).populate('teacherId').limit(4).lean();

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
        <p className="text-muted-foreground mt-1 text-lg">Manage your academic profile and enrollments</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-border/50 shadow-xl overflow-hidden bg-card/50 backdrop-blur-sm">
            <div className="h-24 bg-linear-to-br from-primary/80 to-primary/40" />
            <CardContent className="pt-0 relative">
              <div className="absolute -top-12 left-1/2 -translate-x-1/2">
                <div className="w-24 h-24 rounded-2xl bg-background p-1 shadow-2xl">
                    <div className="w-full h-full rounded-xl bg-primary/10 flex items-center justify-center">
                        <UserIcon className="h-10 w-10 text-primary" />
                    </div>
                </div>
              </div>
              <div className="mt-16 text-center">
                <h3 className="text-xl font-bold">{user.firstName} {user.lastName}</h3>
                <p className="text-sm text-muted-foreground">{student.rollNumber}</p>
                
                <div className="mt-6 space-y-3 text-left">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{user.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{(student.streamId as any).name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    <span>{student.department} | Section {student.section}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Courses Section */}
        <div className="lg:col-span-2 space-y-8">
          {/* Enrolled Courses */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Registered Courses
              </h3>
              <Badge variant="secondary">{enrollments.length} Enrolled</Badge>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {enrollments.map((e: any) => (
                <Card key={e._id} className="group hover:border-primary/40 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <Badge variant="outline" className="text-[10px] uppercase">{e.courseId.code}</Badge>
                    </div>
                    <h4 className="font-bold text-sm mb-1 line-clamp-1">{e.courseId.name}</h4>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {e.courseId.teacherId?.firstName} {e.courseId.teacherId?.lastName}
                    </p>
                  </CardContent>
                </Card>
              ))}
              {enrollments.length === 0 && (
                <div className="col-span-full border-2 border-dashed rounded-xl py-12 flex flex-col items-center justify-center text-muted-foreground">
                    <BookOpen className="h-10 w-10 mb-2 opacity-20" />
                    <p>No courses registered yet</p>
                </div>
              )}
            </div>
          </section>

          {/* Suggested Courses */}
          {suggestedCourses.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  Suggested for You
                </h3>
              </div>
              <div className="space-y-3">
                {suggestedCourses.map((c: any) => (
                  <div key={c._id} className="flex items-center justify-between p-4 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-background border flex items-center justify-center shadow-sm">
                        <BookOpen className="h-5 w-5 text-primary/60" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.code} • {c.teacherId?.firstName} {c.teacherId?.lastName}</p>
                      </div>
                    </div>
                    <RegisterCourseButton courseId={c._id.toString()} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
