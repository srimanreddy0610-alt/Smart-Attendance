import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { students } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

const faceUpdateSchema = z.object({
  faceDescriptor: z.array(z.number()).length(128),
  photoUrl: z.string().url(),
});

export async function PUT(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = faceUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const [student] = await db
      .select()
      .from(students)
      .where(eq(students.clerkUserId, userId))
      .limit(1);

    if (!student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    const [updated] = await db
      .update(students)
      .set({
        faceDescriptor: JSON.stringify(parsed.data.faceDescriptor),
        photoUrl: parsed.data.photoUrl,
      })
      .where(eq(students.id, student.id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[STUDENTS_FACE_PUT]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
