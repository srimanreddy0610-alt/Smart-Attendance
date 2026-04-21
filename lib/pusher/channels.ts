export const CHANNELS = {
  student: (studentId: string) => `student-${studentId}`,
  session: (sessionId: string) => `session-${sessionId}`,
  course: (courseId: string) => `course-${courseId}`,
} as const;

export const EVENTS = {
  SESSION_STARTED: "session:started",
  SESSION_ENDING_SOON: "session:ending-soon",
  SESSION_ENDED: "session:ended",
  ATTENDANCE_MARKED: "attendance:marked",
} as const;
