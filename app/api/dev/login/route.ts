import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { User } from "@/lib/db/schema";

export async function GET(req: Request) {
  // Only allow in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Only available in development" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  console.log(`[DEV_LOGIN] Login attempt for: ${email}`);

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  try {
    await getDb();
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.error(`[DEV_LOGIN] ❌ User NOT found in DB for email: ${email}`);
      return NextResponse.json({ error: "User not found in seeded data" }, { status: 404 });
    }

    console.log(`[DEV_LOGIN] 🚀 Successful login for ${email} (Role: ${user.role})`);

    // Set a cookie that we'll check in getCurrentUser
    const cookieStore = await cookies();
    cookieStore.set("mock_user_id", user._id.toString(), {
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
      httpOnly: true,
    });

    // Redirect to the appropriate dashboard
    let dashboard = "/";
    if (user.role === "teacher") dashboard = "/teacher/dashboard";
    if (user.role === "student") dashboard = "/student/dashboard";
    if (user.role === "parent") dashboard = "/parent/dashboard";
    if (user.role === "admin") dashboard = "/admin/dashboard";

    return NextResponse.redirect(new URL(dashboard, req.url));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

