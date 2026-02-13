import { z } from "zod";

export const timetableSchema = z.object({
  courseId: z.number().int().positive(),
  dayOfWeek: z.number().int().min(1, "Day is required").max(7),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM format"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM format"),
  roomNumber: z.string().max(20).optional(),
});

export type TimetableValues = z.infer<typeof timetableSchema>;
