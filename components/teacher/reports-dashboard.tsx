"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { BarChart3, TrendingUp } from "lucide-react";
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
        <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-16 text-muted-foreground">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted mb-4">
            <BarChart3 className="h-7 w-7 opacity-50" />
          </div>
          <p className="font-medium mb-1">No reports yet</p>
          <p className="text-sm">Create courses to view attendance reports</p>
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="group rounded-xl border bg-card p-5 hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">Total Sessions</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
              </div>
              <div className="text-3xl font-bold tracking-tight">{totalSessions}</div>
            </div>
            <div className="group rounded-xl border bg-card p-5 hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">Average Attendance</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500/15 transition-colors">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
              <div className="text-3xl font-bold tracking-tight">{avgAttendance}%</div>
            </div>
            <div className="group rounded-xl border bg-card p-5 hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">Latest Session</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 group-hover:bg-blue-500/15 transition-colors">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                </div>
              </div>
              <div className="text-lg font-semibold tracking-tight">
                {sessions && sessions.length > 0
                  ? format(new Date(sessions[0].sessionDate), "MMM dd, yyyy")
                  : "No sessions"}
              </div>
            </div>
          </div>

          {/* Charts */}
          {chartData.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <BarChart3 className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm">Attendance Per Session</h3>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "0.5rem",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="present" fill="hsl(var(--primary))" name="Present" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="total" fill="hsl(var(--muted))" name="Total" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-xl border bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold text-sm">Attendance Trend</h3>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis fontSize={11} domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "0.5rem",
                        fontSize: "12px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="percentage"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2.5}
                      name="Attendance %"
                      dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 0 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Sessions Table */}
          <div className="rounded-xl border bg-card">
            <div className="p-5 pb-3">
              <h3 className="font-semibold text-base">Session History</h3>
            </div>
            <div className="px-5 pb-5">
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
                            {format(new Date(s.sessionDate), "MMM dd, yyyy")}
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
                                s.status === "active" ? "default" : "secondary"
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
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <BarChart3 className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm">No sessions found for this course</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
