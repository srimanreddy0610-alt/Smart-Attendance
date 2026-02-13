"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Play, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import Link from "next/link";

interface StartSessionFormProps {
  courseId: number;
  courseName: string;
  activeSessionId?: number;
}

export function StartSessionForm({
  courseId,
  courseName,
  activeSessionId,
}: StartSessionFormProps) {
  const router = useRouter();
  const [duration, setDuration] = useState(60);
  const [isLoading, setIsLoading] = useState(false);

  async function handleStart() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/attendance/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, duration }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start session");
      }

      const session = await res.json();
      toast.success("Attendance session started!");
      router.push(`/teacher/courses/${courseId}/session/${session.id}/live`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (activeSessionId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-12">
          <AlertCircle className="h-12 w-12 text-orange-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Active Session Already Running
          </h3>
          <p className="text-muted-foreground mb-4">
            There is already an active attendance session for this course
          </p>
          <Button asChild>
            <Link
              href={`/teacher/courses/${courseId}/session/${activeSessionId}/live`}
            >
              View Live Session
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>New Session</CardTitle>
        <CardDescription>
          Start an attendance session for {courseName}. Students will be notified
          in real-time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label>Duration: {duration} minutes</Label>
          <Slider
            value={[duration]}
            onValueChange={(v) => setDuration(v[0])}
            min={5}
            max={180}
            step={5}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>5 min</span>
            <span>180 min</span>
          </div>
        </div>

        <div className="rounded-lg border p-4 space-y-2">
          <p className="text-sm font-medium">Session Details</p>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Auto-end after: {duration} minutes</p>
            <p>
              End time:{" "}
              {new Date(
                Date.now() + duration * 60 * 1000
              ).toLocaleTimeString()}
            </p>
          </div>
        </div>

        <Button
          onClick={handleStart}
          className="w-full"
          size="lg"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          Start Attendance Session
        </Button>
      </CardContent>
    </Card>
  );
}
