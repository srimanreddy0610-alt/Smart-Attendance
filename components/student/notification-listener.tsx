"use client";

import { useSessionNotifications } from "@/hooks/use-session-notifications";

interface NotificationListenerProps {
  enrolledCourseIds: number[];
}

export function NotificationListener({
  enrolledCourseIds,
}: NotificationListenerProps) {
  useSessionNotifications(enrolledCourseIds);
  return null;
}
