"use client";

import WaveText from "@/components/ui/smoothui/wave-text";

export function LandingAnimations() {
  return (
    <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
      Smart Attendance with{" "}
      <WaveText
        className="text-primary"
        amplitude={6}
        duration={1.5}
        staggerDelay={0.04}
      >
        Face Recognition
      </WaveText>
    </h1>
  );
}
