"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";

/**
 * Client-side smart redirect hub.
 * Waits for Clerk to settle, then calls the server to determine
 * where to send the user (teacher dashboard / student dashboard / onboarding).
 */
export default function DashboardRedirectPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }

    // Ask the server where this user should go
    fetch("/api/auth/redirect-destination")
      .then((res) => res.json())
      .then(({ destination }) => {
        router.replace(destination);
      })
      .catch(() => {
        // Fallback: just go to sign-in on any error
        router.replace("/sign-in");
      });
  }, [isLoaded, isSignedIn, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">Redirecting you...</p>
      </div>
    </div>
  );
}
