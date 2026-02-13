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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              variant={currentStatus === "active" ? "default" : "secondary"}
              className="text-lg px-3 py-1"
            >
              {currentStatus === "active" ? "LIVE" : "ENDED"}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Present</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {presentCount} / {totalStudents}
            </div>
            <Progress value={percentage} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Time Remaining
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {timeRemaining}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Started At</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium">
              {format(new Date(startTime), "hh:mm a")}
            </div>
          </CardContent>
        </Card>
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
      <Card>
        <CardHeader>
          <CardTitle>Student Attendance</CardTitle>
        </CardHeader>
        <CardContent>
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
                    <TableHead className="w-[100px]">Action</TableHead>
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
        </CardContent>
      </Card>

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
