"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPusherClient } from "@/lib/pusher/client";
import { EVENTS } from "@/lib/pusher/channels";

interface AttendanceRecord {
  id: number;
  studentId: number;
  studentName: string;
  rollNumber: string;
  status: "present" | "absent";
  markedAt: string | null;
  confidenceScore: number | null;
  isManualEntry: boolean;
}

interface SessionData {
  id: number;
  courseId: number;
  courseName: string;
  startTime: string;
  endTime: string | null;
  status: "active" | "ended";
  records: AttendanceRecord[];
  totalStudents: number;
  presentCount: number;
}

export function useLiveSession(sessionId: number) {
  const queryClient = useQueryClient();
  const [isEnding, setIsEnding] = useState(false);

  const { data: session, isLoading } = useQuery<SessionData>({
    queryKey: ["session", sessionId],
    queryFn: async () => {
      const res = await fetch(`/api/attendance/sessions/${sessionId}`);
      if (!res.ok) throw new Error("Failed to fetch session");
      return res.json();
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`session-${sessionId}`);

    channel.bind(EVENTS.ATTENDANCE_MARKED, () => {
      queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
    });

    channel.bind(EVENTS.SESSION_ENDED, () => {
      setIsEnding(true);
      queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, [sessionId, queryClient]);

  return {
    session,
    isLoading,
    isEnding,
    presentCount: session?.presentCount ?? 0,
    totalStudents: session?.totalStudents ?? 0,
  };
}
