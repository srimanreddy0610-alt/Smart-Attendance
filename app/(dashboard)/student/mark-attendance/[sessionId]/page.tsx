import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  Student,
  AttendanceSession,
  Course,
  Enrollment,
  AttendanceRecord,
} from "@/lib/db/schema";
import { MarkAttendanceFlow } from "@/components/student/mark-attendance-flow";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function MarkAttendancePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const user = await getCurrentUser();
  const userId = user?._id?.toString();
  if (!userId) redirect("/sign-in");

  const { sessionId } = await params;
  await getDb();

  const student = await Student.findOne({ user: userId });

  if (!student) redirect("/onboarding");

  if (!student.faceDescriptor) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-orange-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Face Not Registered
            </h3>
            <p className="text-muted-foreground mb-4">
              You need to register your face before marking attendance
            </p>
            <Button asChild>
              <Link href="/student/face-enrollment">
                Register Face
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const session = await AttendanceSession.findById(sessionId).populate('courseId').lean();

  if (!session) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold">Session Not Found</h3>
        </CardContent>
      </Card>
    );
  }

  const course = session.courseId as any;

  if (session.status !== "active") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Session Has Ended</h3>
          <p className="text-muted-foreground mt-2">
            This attendance session is no longer active
          </p>
          <Button asChild className="mt-4">
            <Link href="/student/dashboard">Go to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Check enrollment
  const enrollment = await Enrollment.findOne({
    courseId: course._id,
    studentId: student._id
  });

  if (!enrollment) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold">Not Enrolled</h3>
          <p className="text-muted-foreground">
            You are not enrolled in this course
          </p>
        </CardContent>
      </Card>
    );
  }

  // Check if already marked
  const existingRecord = await AttendanceRecord.findOne({
    sessionId: session._id,
    studentId: student._id,
    status: "present"
  });

  if (existingRecord) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
          <h3 className="text-lg font-semibold">Attendance Already Marked</h3>
          <p className="text-muted-foreground mt-2">
            Marked at{" "}
            {existingRecord.markedAt
              ? new Date(existingRecord.markedAt).toLocaleTimeString()
              : "N/A"}
            {existingRecord.confidenceScore &&
              ` (${existingRecord.confidenceScore}% match)`}
          </p>
          <Button asChild className="mt-4">
            <Link href="/student/dashboard">Go to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mark Attendance</h1>
        <p className="text-muted-foreground">
          {course.name} ({course.code})
        </p>
      </div>
      <MarkAttendanceFlow
        sessionId={session._id.toString()}
        courseName={course.name}
        storedDescriptor={JSON.parse(student.faceDescriptor)}
        expectedAccessCode={session.accessCode}
      />
    </div>
  );
}
