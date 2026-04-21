import { NextResponse } from "next/server";
import { requireParent } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { Student, User, Parent, ParentLinkOTP } from "@/lib/db/schema";

export async function POST(req: Request) {
  try {
    const parentUser = await requireParent();
    const { identifier } = await req.json(); // Roll number or Email

    if (!identifier) {
      return NextResponse.json({ error: "Roll number or email is required" }, { status: 400 });
    }

    await getDb();

    // 1. Find the student
    let student: any = null;

    // Try finding by email first
    const studentUser = await User.findOne({ 
      email: identifier.toLowerCase(),
      role: "student" 
    });

    if (studentUser) {
      student = await Student.findOne({ user: studentUser._id });
    } else {
      // Try finding by roll number
      student = await Student.findOne({ rollNumber: identifier.toUpperCase() }).populate("user");
    }

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // 2. Ensure parent record exists
    let parent = await Parent.findOne({ user: parentUser._id });
    if (!parent) {
      parent = await Parent.create({
        user: parentUser._id,
        linkedStudents: []
      });
    }

    // 3. Check if already linked
    if (parent.linkedStudents.includes(student._id)) {
      return NextResponse.json({ error: "Student is already linked to your account" }, { status: 400 });
    }

    // 4. Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // 5. Save OTP (overwrite existing for this relationship if exists)
    await ParentLinkOTP.findOneAndUpdate(
      { parentId: parentUser._id, studentId: student._id },
      { otp, expiresAt },
      { upsert: true, new: true }
    );

    // 6. "Send" Email
    const studentEmail = studentUser?.email || (student.user as any)?.email;
    
    console.log(`[OTP_LINK] To: ${studentEmail}, Code: ${otp}`);
    
    // TODO: Integrate actual email service here (e.g., Resend, Nodemailer)
    // For now, it logs to the server console.

    return NextResponse.json({ 
      message: "OTP sent to student's email",
      studentId: student._id,
      email: studentEmail.replace(/(.{2})(.*)(?=@)/, "$1***") // Obfuscate email
    });

  } catch (error: any) {
    console.error("[REQUEST_LINK_ERROR]", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

