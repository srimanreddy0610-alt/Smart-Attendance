import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/lib/db";
import { Student } from "@/lib/db/schema";
import { FaceEnrollmentWizard } from "@/components/student/face-enrollment-wizard";

export default async function FaceEnrollmentPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  await getDb();

  const student = await Student.findOne({ clerkUserId: userId });

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
        existingPhotoUrl={student.photoUrl ?? null}
      />
    </div>
  );
}
