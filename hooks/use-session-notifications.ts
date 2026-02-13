"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getPusherClient } from "@/lib/pusher/client";
import { EVENTS } from "@/lib/pusher/channels";

interface SessionStartedData {
  sessionId: number;
  courseName: string;
  teacherName: string;
}

export function useSessionNotifications(enrolledCourseIds: number[]) {
  const router = useRouter();

  useEffect(() => {
    if (enrolledCourseIds.length === 0) return;

    const pusher = getPusherClient();
    const channels = enrolledCourseIds.map((id) => {
      const channel = pusher.subscribe(`course-${id}`);

      channel.bind(EVENTS.SESSION_STARTED, (data: SessionStartedData) => {
        toast.info(
          `Attendance started for ${data.courseName}`,
          {
            description: `by ${data.teacherName}`,
            action: {
              label: "Mark Attendance",
              onClick: () =>
                router.push(`/student/mark-attendance/${data.sessionId}`),
            },
            duration: 30000,
          }
        );
      });

      channel.bind(EVENTS.SESSION_ENDING_SOON, (data: { courseName: string; sessionId: number }) => {
        toast.warning(
          `Attendance ending soon for ${data.courseName}`,
          {
            description: "5 minutes remaining!",
            action: {
              label: "Mark Now",
              onClick: () =>
                router.push(`/student/mark-attendance/${data.sessionId}`),
            },
            duration: 15000,
          }
        );
      });

      channel.bind(EVENTS.SESSION_ENDED, (data: { sessionId: number }) => {
        toast.info("Attendance session has ended");
      });

      return channel;
    });

    return () => {
      channels.forEach((channel) => {
        channel.unbind_all();
        channel.unsubscribe();
      });
    };
  }, [enrolledCourseIds, router]);
}
