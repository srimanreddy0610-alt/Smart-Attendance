"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Camera,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { loadFaceModels } from "@/lib/face-recognition/loader";
import {
  captureMultipleFrames,
  averageDescriptors,
  compareFaceDescriptors,
} from "@/lib/face-recognition/utils";
import { useWebcam } from "@/hooks/use-webcam";
import { useFaceDetection } from "@/hooks/use-face-detection";

const MATCH_THRESHOLD = Number(
  process.env.NEXT_PUBLIC_FACE_MATCH_THRESHOLD ?? "75"
);

interface MarkAttendanceFlowProps {
  sessionId: number;
  courseName: string;
  storedDescriptor: number[];
}

type Status = "loading" | "camera" | "capturing" | "verifying" | "success" | "failed";

export function MarkAttendanceFlow({
  sessionId,
  courseName,
  storedDescriptor,
}: MarkAttendanceFlowProps) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [similarity, setSimilarity] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [progress, setProgress] = useState(0);
  const { videoRef, isActive, start, stop, error: webcamError } = useWebcam();
  const { faceDetected } = useFaceDetection(videoRef, isActive && status === "camera");

  useEffect(() => {
    loadFaceModels()
      .then(() => {
        setModelsLoaded(true);
        setStatus("camera");
      })
      .catch(() => toast.error("Failed to load face models"));
  }, []);

  const handleCapture = useCallback(async () => {
    if (!videoRef.current || !modelsLoaded) return;

    setStatus("capturing");
    setProgress(0);

    try {
      setProgress(20);
      const descriptors = await captureMultipleFrames(videoRef.current, 3, 500);

      if (descriptors.length < 2) {
        toast.error("Could not detect face clearly. Please try again.");
        setStatus("camera");
        return;
      }

      setProgress(50);
      setStatus("verifying");

      const avgDescriptor = averageDescriptors(descriptors);
      const score = compareFaceDescriptors(storedDescriptor, avgDescriptor);
      setSimilarity(score);

      setProgress(70);

      if (score >= MATCH_THRESHOLD) {
        // Submit to API
        const res = await fetch("/api/attendance/mark", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            faceDescriptor: avgDescriptor,
            confidenceScore: score,
            verificationFrames: descriptors.length,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to mark attendance");
        }

        setProgress(100);
        setStatus("success");
        stop();
        toast.success(`Attendance marked! (${score}% match)`);
      } else {
        setAttempts((prev) => prev + 1);
        setStatus("failed");
        stop();
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Verification failed"
      );
      setAttempts((prev) => prev + 1);
      setStatus("failed");
    }
  }, [videoRef, modelsLoaded, storedDescriptor, sessionId, stop]);

  if (status === "loading") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <p>Loading face detection models...</p>
        </CardContent>
      </Card>
    );
  }

  if (status === "success") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-12">
          <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2">
            Attendance Marked Successfully!
          </h3>
          <p className="text-muted-foreground mb-4">
            Confidence: {similarity}% match
          </p>
          <Button onClick={() => router.push("/student/dashboard")}>
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (status === "failed") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-12">
          <XCircle className="h-16 w-16 text-destructive mb-4" />
          <h3 className="text-xl font-semibold mb-2">Face Not Recognized</h3>
          <p className="text-muted-foreground mb-2">
            Similarity: {similarity}% (minimum {MATCH_THRESHOLD}% required)
          </p>
          {attempts >= 3 ? (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Maximum attempts reached. Please contact your teacher for manual
                attendance.
              </p>
              <Button onClick={() => router.push("/student/dashboard")}>
                Back to Dashboard
              </Button>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Attempt {attempts} of 3. Please try again.
              </p>
              <Button
                onClick={() => {
                  setStatus("camera");
                  start();
                }}
              >
                Try Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verify Your Face</CardTitle>
        <CardDescription>
          Position your face in the frame and click &quot;Mark My Attendance&quot;
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative w-full bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full aspect-4/3 object-cover"
          />
          <div
            className={`absolute inset-0 border-4 m-6 rounded-lg transition-colors ${
              faceDetected ? "border-green-500" : "border-white/30"
            }`}
          />
          {faceDetected && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-green-500/80 px-3 py-1 rounded text-white text-sm">
              Face Detected
            </div>
          )}
        </div>

        {webcamError && (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>{webcamError}</span>
          </div>
        )}

        {(status === "capturing" || status === "verifying") && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-center text-muted-foreground">
              {status === "capturing"
                ? "Capturing frames..."
                : "Verifying identity..."}
            </p>
          </div>
        )}

        <div className="flex justify-center gap-3">
          {!isActive ? (
            <Button onClick={start}>
              <Camera className="h-4 w-4 mr-2" />
              Start Camera
            </Button>
          ) : (
            <Button
              onClick={handleCapture}
              disabled={!faceDetected || status === "capturing" || status === "verifying"}
            >
              {status === "capturing" || status === "verifying" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Mark My Attendance
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
