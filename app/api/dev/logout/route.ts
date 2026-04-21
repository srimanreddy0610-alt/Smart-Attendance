import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  const cookieStore = await cookies();
  cookieStore.delete("mock_user_id");
  
  return NextResponse.redirect(new URL("/sign-in", req.url));
}

