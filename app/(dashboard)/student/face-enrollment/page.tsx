import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { students } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { FaceEnrollmentWizard } from "@/components/student/face-enrollment-wizard";

export default async function FaceEnrollmentPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [student] = await db
    .select()
    .from(students)
    .where(eq(students.clerkUserId, userId))
    .limit(1);

  if (!student) redirect("/onboarding");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Face Enrollment</h1>
        <p className="text-muted-foreground">
          Register your face for attendance recognition
        </p>
      </div>
      <FaceEnrollmentWizard
        hasExistingFace={!!student.faceDescriptor}
        existingPhotoUrl={student.photoUrl}
      />
    </div>
  );
}
