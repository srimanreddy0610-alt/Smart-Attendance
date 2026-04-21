"use client";

import { useState } from "react";
import { RoleSelection } from "@/components/onboarding/role-selection";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";

export function OnboardingView() {
  const [step, setStep] = useState<"role" | "student_info">("role");

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 overflow-hidden">
      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-blue-500/5 blur-3xl" />
      </div>

      {step === "role" ? (
        <RoleSelection onSelectStudent={() => setStep("student_info")} />
      ) : (
        <div className="w-full max-w-lg">
           <OnboardingForm />
        </div>
      )}
    </div>
  );
}
