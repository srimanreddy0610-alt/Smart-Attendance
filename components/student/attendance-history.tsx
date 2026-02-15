"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Filter } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Course {
  courseId: number;
  courseName: string;
  courseCode: string;
}

interface AttendanceRecord {
  id: number;
  sessionId: number;
  status: "present" | "absent";
  markedAt: string | null;
  confidenceScore: number | null;
  isManualEntry: boolean;
  sessionDate: string;
  courseName: string;
  courseCode: string;
  courseId: number;
}

interface AttendanceHistoryProps {
  courses: Course[];
}

export function AttendanceHistory({ courses }: AttendanceHistoryProps) {
  const [selectedCourse, setSelectedCourse] = useState<string>("all");

  const { data: records, isLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ["attendance-records", selectedCourse],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCourse !== "all") {
        params.set("courseId", selectedCourse);
      }
      const res = await fetch(`/api/attendance/records?${params}`);
      if (!res.ok) throw new Error("Failed to fetch records");
      return res.json();
    },
  });

  const total = records?.length ?? 0;
  const present = records?.filter((r) => r.status === "present").length ?? 0;
  const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All courses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {courses.map((c) => (
                <SelectItem key={c.courseId} value={String(c.courseId)}>
                  {c.courseName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="group rounded-xl border bg-card p-5 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">Total Classes</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
              <CalendarIcon className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="text-3xl font-bold tracking-tight">{total}</div>
        </div>
        <div className="group rounded-xl border bg-card p-5 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">Attended</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500/15 transition-colors">
              <CalendarIcon className="h-4 w-4 text-emerald-600" />
            </div>
          </div>
          <div className="text-3xl font-bold tracking-tight">{present}</div>
        </div>
        <div className="group rounded-xl border bg-card p-5 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">Attendance %</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 group-hover:bg-blue-500/15 transition-colors">
              <Filter className="h-4 w-4 text-blue-600" />
            </div>
          </div>
          <div className="text-3xl font-bold tracking-tight">{percentage}%</div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        <div className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : records && records.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Marked At</TableHead>
                  <TableHead>Confidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      {format(new Date(record.sessionDate), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{record.courseName}</p>
                        <p className="text-xs text-muted-foreground">
                          {record.courseCode}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          record.status === "present"
                            ? "default"
                            : "destructive"
                        }
                      >
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {record.markedAt
                        ? format(new Date(record.markedAt), "hh:mm a")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {record.confidenceScore
                        ? `${record.confidenceScore}%`
                        : record.isManualEntry
                          ? "Manual"
                          : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <CalendarIcon className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">No attendance records found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
