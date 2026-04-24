"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Plus,
  Trash2,
  Loader2,
  UserPlus,
  Pencil,
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

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { courseSchema, type CourseValues } from "@/lib/validations/course";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const dayNames = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface Stream {
  _id: string;
  name: string;
}

interface Timetable {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  roomNumber: string | null;
}

interface CourseDetailTabsProps {
  course: {
    id: string;
    name: string;
    code: string;
    department: string;
    semester: number;
    section: string;
  };
  enrolledStudents: Array<{
    enrollmentId: string;
    studentId: string;
    rollNumber: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    enrolledAt: string;
  }>;
  recentSessions: Array<{
    id: string;
    sessionDate: string;
    startTime: string;
    endTime: string | null;
    status: "active" | "ended";
    presentCount: number;
  }>;
  timetableEntries: Array<{
    id: string;
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

  // Course edit form
  const form = useForm<CourseValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(courseSchema as any),
    defaultValues: {
      name: course.name,
      code: course.code,
      department: course.department,
      streamId: (course as { streamId?: string }).streamId || "",
      semester: course.semester,
      section: course.section,
    },
  });

  const [streams, setStreams] = useState<Stream[]>([]);

  useEffect(() => {
    fetch("/api/streams").then(res => res.json()).then(setStreams).catch(() => {});
  }, []);


  // Timetable editing state
  const [editingTimetable, setEditingTimetable] = useState<Timetable | null>(null);

  // Timetable form state
  const [ttDay, setTtDay] = useState("1");
  const [ttStart, setTtStart] = useState("09:00");
  const [ttEnd, setTtEnd] = useState("10:00");
  const [ttRoom, setTtRoom] = useState("");

  const resetTimetableForm = () => {
    setTtDay("1");
    setTtStart("09:00");
    setTtEnd("10:00");
    setTtRoom("");
    setEditingTimetable(null);
  };

  async function onUpdateCourse(values: CourseValues) {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/courses/${course.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update course");
      }

      toast.success("Course updated successfully!");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed");
    } finally {
      setIsLoading(false);
    }
  }

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

  async function handleRemoveStudent(studentId: string) {
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
      const payload = {
        dayOfWeek: parseInt(ttDay),
        startTime: ttStart,
        endTime: ttEnd,
        roomNumber: ttRoom || undefined,
      };

      const url = editingTimetable 
        ? `/api/courses/${course.id}/timetable?timetableId=${editingTimetable.id}`
        : `/api/courses/${course.id}/timetable`;
      
      const method = editingTimetable ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save schedule");
      }
      toast.success(editingTimetable ? "Schedule updated!" : "Schedule added!");
      setAddTimetableOpen(false);
      resetTimetableForm();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed");
    } finally {
      setIsLoading(false);
    }
  }

  function startEditingTimetable(t: Timetable) {
    setEditingTimetable(t);
    setTtDay(String(t.dayOfWeek));
    setTtStart(t.startTime);
    setTtEnd(t.endTime);
    setTtRoom(t.roomNumber || "");
    setAddTimetableOpen(true);
  }

  async function handleDeleteTimetable(timetableId: string) {
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
        <TabsTrigger value="settings">
          Settings
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
                <DialogTitle>{editingTimetable ? "Edit Schedule" : "Add Class Schedule"}</DialogTitle>
                <DialogDescription>
                  {editingTimetable ? "Modify this class timing" : "Add a recurring class schedule"}
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
                  {editingTimetable ? "Save Changes" : "Add Schedule"}
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
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEditingTimetable(t)}
                          >
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTimetable(t.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </TabsContent>
      
      {/* Settings Tab */}
      <TabsContent value="settings" className="space-y-6">
        <div className="rounded-xl border bg-card p-6">
          <h3 className="text-lg font-bold mb-4">Edit Course Details</h3>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onUpdateCourse)} className="space-y-4 max-w-2xl">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course Code</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="streamId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Academic Stream</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select stream" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {streams.map((s) => (
                          <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="semester"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Semester</FormLabel>
                      <Select onValueChange={(val) => field.onChange(Number(val))} defaultValue={String(field.value)}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.from({ length: 10 }, (_, i) => i + 1).map((s) => (
                            <SelectItem key={s} value={String(s)}>Sem {s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="section"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Section</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {["A", "B", "C", "D"].map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </form>
          </Form>
        </div>

        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6">
          <h3 className="text-lg font-bold text-destructive mb-2">Danger Zone</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Deleting this course will remove all enrollments and attendance history. This action cannot be undone.
          </p>
          <Button variant="destructive" size="sm">
            Delete Course
          </Button>
        </div>
      </TabsContent>
    </Tabs>
  );
}
