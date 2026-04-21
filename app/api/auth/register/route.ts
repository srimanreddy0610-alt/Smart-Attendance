import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { User } from "@/lib/db/schema";
import { createSession } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const { email, password, firstName, lastName, role } = await req.json();

    if (!email || !password || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await getDb();
    
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      role
    });

    await createSession(user._id.toString());

    return NextResponse.json({ 
        success: true, 
        role: user.role 
    }, { status: 201 });
  } catch (error: any) {
    console.error("[REGISTER_ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

