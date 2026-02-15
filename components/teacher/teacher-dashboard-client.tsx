"use client";

import { BookOpen, Users, Activity, Calendar } from "lucide-react";
import { AnimatedCounter } from "@/components/ui/animated-counter";

interface TeacherDashboardClientProps {
  totalCourses: number;
  totalStudents: number;
  activeSessions: number;
  classesToday: number;
}

export function TeacherDashboardClient({
  totalCourses,
  totalStudents,
  activeSessions,
  classesToday,
}: TeacherDashboardClientProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="group rounded-xl border bg-card p-5 hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-muted-foreground">
            Total Courses
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
        </div>
        <div className="text-3xl font-bold tracking-tight">
          <AnimatedCounter value={totalCourses} />
        </div>
      </div>

      <div className="group rounded-xl border bg-card p-5 hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-muted-foreground">
            Total Students
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 group-hover:bg-blue-500/15 transition-colors">
            <Users className="h-4 w-4 text-blue-600" />
          </div>
        </div>
        <div className="text-3xl font-bold tracking-tight">
          <AnimatedCounter value={totalStudents} />
        </div>
      </div>

      <div className="group rounded-xl border bg-card p-5 hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-muted-foreground">
            Active Sessions
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500/15 transition-colors">
            <Activity className="h-4 w-4 text-emerald-600" />
          </div>
        </div>
        <div className="text-3xl font-bold tracking-tight">
          <AnimatedCounter value={activeSessions} />
        </div>
      </div>

      <div className="group rounded-xl border bg-card p-5 hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-muted-foreground">
            Classes Today
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 group-hover:bg-amber-500/15 transition-colors">
            <Calendar className="h-4 w-4 text-amber-600" />
          </div>
        </div>
        <div className="text-3xl font-bold tracking-tight">
          <AnimatedCounter value={classesToday} />
        </div>
      </div>
    </div>
  );
}
