"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Clock,
  Users,
  CheckCircle,
  XCircle,
  StopCircle,
  Loader2,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLiveSession } from "@/hooks/use-live-session";

interface LiveSessionViewProps {
  sessionId: number;
  courseId: number;
  courseName: string;
  startTime: string;
  endTime: string | null;
  initialStatus: "active" | "ended";
}

export function LiveSessionView({
  sessionId,
  courseId,
  courseName,
  startTime,
  endTime,
  initialStatus,
}: LiveSessionViewProps) {
  const router = useRouter();
  const { session, isLoading, presentCount, totalStudents } =
    useLiveSession(sessionId);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [manualOverrideStudent, setManualOverrideStudent] = useState<{
    studentId: number;
    studentName: string;
  } | null>(null);
  const [timeRemaining, setTimeRemaining] = useState("");

  const currentStatus = session?.status ?? initialStatus;
  const percentage =
    totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

  // Timer
  useEffect(() => {
    if (!endTime || currentStatus === "ended") {
      setTimeRemaining("--:--");
      return;
    }

    const interval = setInterval(() => {
      const end = new Date(endTime).getTime();
      const now = Date.now();
      const diff = end - now;

      if (diff <= 0) {
        setTimeRemaining("00:00");
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeRemaining(
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime, currentStatus]);

  async function handleEndSession() {
    setIsEndingSession(true);
    try {
      const res = await fetch(`/api/attendance/sessions/${sessionId}`, {
        method: "PUT",
      });
      if (!res.ok) throw new Error("Failed to end session");
      toast.success("Session ended");
      router.refresh();
    } catch {
      toast.error("Failed to end session");
    } finally {
      setIsEndingSession(false);
    }
  }

  async function handleManualOverride() {
    if (!manualOverrideStudent) return;
    try {
      const res = await fetch("/api/attendance/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          studentId: manualOverrideStudent.studentId,
          status: "present",
        }),
      });
      if (!res.ok) throw new Error("Failed to mark attendance");
      toast.success(
        `${manualOverrideStudent.studentName} marked as present`
      );
      setManualOverrideStudent(null);
    } catch {
      toast.error("Failed to mark attendance");
    }
  }

  const records = session?.records ?? [];

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm font-medium text-muted-foreground mb-3">Status</p>
          <Badge
            variant={currentStatus === "active" ? "default" : "secondary"}
            className={`text-sm px-3 py-1 ${currentStatus === "active" ? "animate-pulse" : ""}`}
          >
            {currentStatus === "active" ? "● LIVE" : "ENDED"}
          </Badge>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-muted-foreground">Present</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
              <Users className="h-4 w-4 text-emerald-600" />
            </div>
          </div>
          <div className="text-2xl font-bold">
            {presentCount} <span className="text-muted-foreground text-lg font-normal">/ {totalStudents}</span>
          </div>
          <Progress value={percentage} className="mt-2 h-1.5" />
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-muted-foreground">Time Remaining</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
              <Clock className="h-4 w-4 text-blue-600" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono">
            {timeRemaining}
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm font-medium text-muted-foreground mb-3">Started At</p>
          <div className="text-2xl font-bold">
            {format(new Date(startTime), "hh:mm a")}
          </div>
        </div>
      </div>

      {/* End Session Button */}
      {currentStatus === "active" && (
        <Button
          variant="destructive"
          onClick={handleEndSession}
          disabled={isEndingSession}
        >
          {isEndingSession ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <StopCircle className="mr-2 h-4 w-4" />
          )}
          End Session
        </Button>
      )}

      {/* Student Attendance Table */}
      <div className="rounded-xl border bg-card">
        <div className="p-5 pb-3">
          <h3 className="font-semibold text-base">Student Attendance</h3>
        </div>
        <div className="px-5 pb-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Roll Number</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Marked At</TableHead>
                  <TableHead>Confidence</TableHead>
                  {currentStatus === "active" && (
                    <TableHead className="w-25">Action</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.studentId}>
                    <TableCell className="font-medium">
                      {record.rollNumber}
                    </TableCell>
                    <TableCell>{record.studentName}</TableCell>
                    <TableCell>
                      {record.status === "present" ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Present
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          Absent
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {record.markedAt
                        ? format(new Date(record.markedAt), "hh:mm:ss a")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {record.confidenceScore
                        ? `${record.confidenceScore}%`
                        : record.isManualEntry
                          ? "Manual"
                          : "-"}
                    </TableCell>
                    {currentStatus === "active" && (
                      <TableCell>
                        {record.status === "absent" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setManualOverrideStudent({
                                studentId: record.studentId,
                                studentName: record.studentName,
                              })
                            }
                          >
                            <UserCheck className="h-3 w-3 mr-1" />
                            Mark
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Manual Override Dialog */}
      <Dialog
        open={!!manualOverrideStudent}
        onOpenChange={(open) => !open && setManualOverrideStudent(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Present</DialogTitle>
            <DialogDescription>
              Mark {manualOverrideStudent?.studentName} as present manually?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setManualOverrideStudent(null)}
            >
              Cancel
            </Button>
            <Button onClick={handleManualOverride}>Confirm</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
