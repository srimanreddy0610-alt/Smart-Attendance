"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Plus,
  Trash2,
  Loader2,
  UserPlus,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import Link from "next/link";

const dayNames = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface CourseDetailTabsProps {
  course: {
    id: number;
    name: string;
    code: string;
    department: string;
    semester: number;
    section: string;
  };
  enrolledStudents: Array<{
    enrollmentId: number;
    studentId: number;
    rollNumber: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    enrolledAt: Date;
  }>;
  recentSessions: Array<{
    id: number;
    sessionDate: Date;
    startTime: Date;
    endTime: Date | null;
    status: "active" | "ended";
    presentCount: number;
  }>;
  timetableEntries: Array<{
    id: number;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    roomNumber: string | null;
  }>;
}

export function CourseDetailTabs({
  course,
  enrolledStudents,
  recentSessions,
  timetableEntries,
}: CourseDetailTabsProps) {
  const router = useRouter();
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [addTimetableOpen, setAddTimetableOpen] = useState(false);
  const [rollNumber, setRollNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Timetable form state
  const [ttDay, setTtDay] = useState("1");
  const [ttStart, setTtStart] = useState("09:00");
  const [ttEnd, setTtEnd] = useState("10:00");
  const [ttRoom, setTtRoom] = useState("");

  async function handleAddStudent() {
    if (!rollNumber.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/courses/${course.id}/enrollments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rollNumber: rollNumber.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add student");
      }
      toast.success("Student added successfully!");
      setRollNumber("");
      setAddStudentOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRemoveStudent(studentId: number) {
    try {
      const res = await fetch(
        `/api/courses/${course.id}/enrollments?studentId=${studentId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to remove student");
      toast.success("Student removed");
      router.refresh();
    } catch {
      toast.error("Failed to remove student");
    }
  }

  async function handleAddTimetable() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/courses/${course.id}/timetable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dayOfWeek: parseInt(ttDay),
          startTime: ttStart,
          endTime: ttEnd,
          roomNumber: ttRoom || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add schedule");
      }
      toast.success("Schedule added!");
      setAddTimetableOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteTimetable(timetableId: number) {
    try {
      const res = await fetch(
        `/api/courses/${course.id}/timetable?timetableId=${timetableId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Schedule removed");
      router.refresh();
    } catch {
      toast.error("Failed to remove schedule");
    }
  }

  return (
    <Tabs defaultValue="students">
      <TabsList>
        <TabsTrigger value="students">
          Students ({enrolledStudents.length})
        </TabsTrigger>
        <TabsTrigger value="sessions">
          Sessions ({recentSessions.length})
        </TabsTrigger>
        <TabsTrigger value="timetable">
          Timetable ({timetableEntries.length})
        </TabsTrigger>
      </TabsList>

      {/* Students Tab */}
      <TabsContent value="students" className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {enrolledStudents.length} students enrolled
          </p>
          <Dialog open={addStudentOpen} onOpenChange={setAddStudentOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Student
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Student</DialogTitle>
                <DialogDescription>
                  Enter the student&apos;s roll number to enroll them
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Roll Number</Label>
                  <Input
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="e.g. CS2021001"
                  />
                </div>
                <Button
                  onClick={handleAddStudent}
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Add Student
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-xl border bg-card">
          <div className="p-0">
            {enrolledStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted mb-3">
                  <UserPlus className="h-5 w-5 opacity-50" />
                </div>
                <p className="text-sm">No students enrolled yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Roll Number</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Enrolled</TableHead>
                    <TableHead className="w-12.5" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrolledStudents.map((s) => (
                    <TableRow key={s.enrollmentId}>
                      <TableCell className="font-medium">
                        {s.rollNumber}
                      </TableCell>
                      <TableCell>
                        {[s.firstName, s.lastName].filter(Boolean).join(" ")}
                      </TableCell>
                      <TableCell>{s.email}</TableCell>
                      <TableCell>
                        {format(new Date(s.enrolledAt), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveStudent(s.studentId)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </TabsContent>

      {/* Sessions Tab */}
      <TabsContent value="sessions" className="space-y-4">
        <div className="flex justify-end">
          <Button asChild>
            <Link href={`/teacher/courses/${course.id}/session`}>
              Start New Session
            </Link>
          </Button>
        </div>
        <div className="rounded-xl border bg-card">
          <div className="p-0">
            {recentSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted mb-3">
                  <Plus className="h-5 w-5 opacity-50" />
                </div>
                <p className="text-sm">No sessions yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>End Time</TableHead>
                    <TableHead>Present</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSessions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        {format(new Date(s.sessionDate), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        {format(new Date(s.startTime), "hh:mm a")}
                      </TableCell>
                      <TableCell>
                        {s.endTime
                          ? format(new Date(s.endTime), "hh:mm a")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {Number(s.presentCount)} / {enrolledStudents.length}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            s.status === "active" ? "default" : "secondary"
                          }
                        >
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {s.status === "active" && (
                          <Button size="sm" variant="outline" asChild>
                            <Link
                              href={`/teacher/courses/${course.id}/session/${s.id}/live`}
                            >
                              View Live
                            </Link>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </TabsContent>

      {/* Timetable Tab */}
      <TabsContent value="timetable" className="space-y-4">
        <div className="flex justify-end">
          <Dialog open={addTimetableOpen} onOpenChange={setAddTimetableOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Schedule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Class Schedule</DialogTitle>
                <DialogDescription>
                  Add a recurring class schedule
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Day of Week</Label>
                  <Select value={ttDay} onValueChange={setTtDay}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6].map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          {dayNames[d]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={ttStart}
                      onChange={(e) => setTtStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      value={ttEnd}
                      onChange={(e) => setTtEnd(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label>Room Number (optional)</Label>
                  <Input
                    value={ttRoom}
                    onChange={(e) => setTtRoom(e.target.value)}
                    placeholder="e.g. Room 301"
                  />
                </div>
                <Button
                  onClick={handleAddTimetable}
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Add Schedule
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-xl border bg-card">
          <div className="p-0">
            {timetableEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted mb-3">
                  <Plus className="h-5 w-5 opacity-50" />
                </div>
                <p className="text-sm">No schedule added yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Day</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead className="w-12.5" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timetableEntries.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{dayNames[t.dayOfWeek]}</TableCell>
                      <TableCell>{t.startTime}</TableCell>
                      <TableCell>{t.endTime}</TableCell>
                      <TableCell>{t.roomNumber || "-"}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteTimetable(t.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
