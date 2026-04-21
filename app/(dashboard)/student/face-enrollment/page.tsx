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
    <div className="max-w-2xl mx-auto space-y-8 py-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Face Enrollment</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Register your face for high-speed attendance recognition
        </p>
      </div>
      <FaceEnrollmentWizard
        hasExistingFace={!!student.faceDescriptor}
        existingPhotoUrl={student.photoUrl ?? null}
      />
    </div>
  );
}
