"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Filter } from "lucide-react";
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Classes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Attended</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{present}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Attendance %
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{percentage}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
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
            <p className="text-center text-muted-foreground py-8">
              No attendance records found
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
