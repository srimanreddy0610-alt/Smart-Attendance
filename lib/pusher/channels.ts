export const CHANNELS = {
  student: (studentId: number) => `student-${studentId}`,
  session: (sessionId: number) => `session-${sessionId}`,
  course: (courseId: number) => `course-${courseId}`,
} as const;

export const EVENTS = {
  SESSION_STARTED: "session:started",
  SESSION_ENDING_SOON: "session:ending-soon",
  SESSION_ENDED: "session:ended",
  ATTENDANCE_MARKED: "attendance:marked",
} as const;
