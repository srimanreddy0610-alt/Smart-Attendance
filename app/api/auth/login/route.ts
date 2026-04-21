import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { User } from "@/lib/db/schema";
import { createSession } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    await getDb();
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user || !user.password) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    await createSession(user._id.toString());

    let dashboard = "/";
    if (user.role === "teacher") dashboard = "/teacher/dashboard";
    else if (user.role === "student") dashboard = "/student/dashboard";
    else if (user.role === "parent") dashboard = "/parent/dashboard";
    else if (user.role === "admin") dashboard = "/admin/dashboard";

    return NextResponse.json({ 
        success: true, 
        role: user.role,
        redirect: dashboard
    });
  } catch (error: any) {
    console.error("[LOGIN_ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

