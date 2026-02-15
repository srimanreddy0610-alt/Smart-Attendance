"use client";

import { BookOpen, ClipboardCheck, Calendar } from "lucide-react";
import { AnimatedCounter } from "@/components/ui/animated-counter";

interface StudentDashboardClientProps {
  enrolledCount: number;
  percentage: number;
  present: number;
  total: number;
  classesToday: number;
}

export function StudentDashboardClient({
  enrolledCount,
  percentage,
  present,
  total,
  classesToday,
}: StudentDashboardClientProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="group rounded-xl border bg-card p-5 hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-muted-foreground">
            Enrolled Courses
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
        </div>
        <div className="text-3xl font-bold tracking-tight">
          <AnimatedCounter value={enrolledCount} />
        </div>
      </div>

      <div className="group rounded-xl border bg-card p-5 hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-muted-foreground">
            Overall Attendance
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500/15 transition-colors">
            <ClipboardCheck className="h-4 w-4 text-emerald-600" />
          </div>
        </div>
        <div className="text-3xl font-bold tracking-tight">
          <AnimatedCounter value={percentage} suffix="%" />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {present} of {total} classes
        </p>
      </div>

      <div className="group rounded-xl border bg-card p-5 hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-muted-foreground">
            Classes Today
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 group-hover:bg-blue-500/15 transition-colors">
            <Calendar className="h-4 w-4 text-blue-600" />
          </div>
        </div>
        <div className="text-3xl font-bold tracking-tight">
          <AnimatedCounter value={classesToday} />
        </div>
      </div>
    </div>
  );
}
