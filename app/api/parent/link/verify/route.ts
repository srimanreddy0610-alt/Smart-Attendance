import { NextResponse } from "next/server";
import { requireParent } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { Parent, ParentLinkOTP } from "@/lib/db/schema";

export async function POST(req: Request) {
  try {
    const parentUser = await requireParent();
    const { studentId, otp } = await req.json();

    if (!studentId || !otp) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await getDb();

    // 1. Verify OTP
    const validOtp = await ParentLinkOTP.findOne({
      parentId: parentUser.clerkUserId,
      studentId,
      otp,
      expiresAt: { $gt: new Date() }
    });

    if (!validOtp) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
    }

    // 2. Link student to parent
    const parent = await Parent.findOne({ clerkUserId: parentUser.clerkUserId });
    
    if (!parent) {
      return NextResponse.json({ error: "Parent record not found" }, { status: 404 });
    }

    if (!parent.linkedStudents.includes(studentId)) {
      parent.linkedStudents.push(studentId);
      await parent.save();
    }

    // 3. Cleanup OTP
    await ParentLinkOTP.deleteOne({ _id: validOtp._id });

    return NextResponse.json({ message: "Student linked successfully" });

  } catch (error: any) {
    console.error("[VERIFY_LINK_ERROR]", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
