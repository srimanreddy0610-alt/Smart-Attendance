import { getSessionUserId, getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LandingClient } from "@/components/landing/landing-client";

export default async function LandingPage() {
  const userId = await getSessionUserId();
  if (userId) redirect("/dashboard");

  return <LandingClient />;
}
