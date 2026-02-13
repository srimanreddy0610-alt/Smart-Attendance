"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { BarChart3, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

interface Course {
  id: number;
  name: string;
  code: string;
}

interface SessionData {
  id: number;
  courseName: string;
  courseCode: string;
  sessionDate: string;
  presentCount: number;
  totalEnrolled: number;
  status: string;
}

export function ReportsDashboard({ courses }: { courses: Course[] }) {
  const [selectedCourse, setSelectedCourse] = useState<string>(
    courses.length > 0 ? String(courses[0].id) : ""
  );

  const { data: sessions, isLoading } = useQuery<SessionData[]>({
    queryKey: ["sessions", selectedCourse],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCourse) params.set("courseId", selectedCourse);
      const res = await fetch(`/api/attendance/sessions?${params}`);
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return res.json();
    },
    enabled: !!selectedCourse,
  });

  const chartData =
    sessions?.map((s) => ({
      date: format(new Date(s.sessionDate), "MMM dd"),
      present: Number(s.presentCount),
      total: Number(s.totalEnrolled),
      percentage:
        Number(s.totalEnrolled) > 0
          ? Math.round(
              (Number(s.presentCount) / Number(s.totalEnrolled)) * 100
            )
          : 0,
    })) ?? [];

  const totalSessions = sessions?.length ?? 0;
  const avgAttendance =
    chartData.length > 0
      ? Math.round(
          chartData.reduce((sum, d) => sum + d.percentage, 0) /
            chartData.length
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Course Filter */}
      <div className="flex items-center gap-4">
        <Select value={selectedCourse} onValueChange={setSelectedCourse}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Select course" />
          </SelectTrigger>
          <SelectContent>
            {courses.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name} ({c.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {courses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Create courses to view reports
            </p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalSessions}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Average Attendance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgAttendance}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Latest Session
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-medium">
                  {sessions && sessions.length > 0
                    ? format(
                        new Date(sessions[0].sessionDate),
                        "MMM dd, yyyy"
                      )
                    : "No sessions"}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          {chartData.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Attendance Per Session
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Bar
                        dataKey="present"
                        fill="hsl(var(--primary))"
                        name="Present"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="total"
                        fill="hsl(var(--muted))"
                        name="Total"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Attendance Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis fontSize={12} domain={[0, 100]} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="percentage"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        name="Attendance %"
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Sessions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Session History</CardTitle>
            </CardHeader>
            <CardContent>
              {sessions && sessions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Present</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Attendance %</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((s) => {
                      const pct =
                        Number(s.totalEnrolled) > 0
                          ? Math.round(
                              (Number(s.presentCount) /
                                Number(s.totalEnrolled)) *
                                100
                            )
                          : 0;
                      return (
                        <TableRow key={s.id}>
                          <TableCell>
                            {format(
                              new Date(s.sessionDate),
                              "MMM dd, yyyy"
                            )}
                          </TableCell>
                          <TableCell>{Number(s.presentCount)}</TableCell>
                          <TableCell>{Number(s.totalEnrolled)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                pct >= 75
                                  ? "default"
                                  : pct >= 50
                                    ? "secondary"
                                    : "destructive"
                              }
                            >
                              {pct}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                s.status === "active"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {s.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No sessions found for this course
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
