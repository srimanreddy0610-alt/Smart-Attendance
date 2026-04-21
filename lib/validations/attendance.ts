import { z } from "zod";

export const startSessionSchema = z.object({
  courseId: z.string(),
  duration: z.number().int().min(5).max(180).default(60),
});

export const markAttendanceSchema = z.object({
  sessionId: z.string(),
  faceDescriptor: z.array(z.number()).length(128),
  confidenceScore: z.number().int().min(0).max(100),
  verificationFrames: z.number().int().min(1).max(10),
  accessCode: z.string().length(6),
});

export const manualAttendanceSchema = z.object({
  sessionId: z.string(),
  studentId: z.string(),
  status: z.enum(["present", "absent"]),
});

export type StartSessionValues = z.infer<typeof startSessionSchema>;
export type MarkAttendanceValues = z.infer<typeof markAttendanceSchema>;
export type ManualAttendanceValues = z.infer<typeof manualAttendanceSchema>;
