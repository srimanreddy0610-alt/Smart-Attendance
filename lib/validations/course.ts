import { z } from "zod";

export const courseSchema = z.object({
  name: z.string().min(1, "Course name is required").max(200),
  code: z.string().min(1, "Course code is required").max(20),
  department: z.string().min(1, "Department is required").max(100),
  semester: z.number().int().min(1).max(10),
  section: z.string().min(1, "Section is required").max(10),
});

export type CourseValues = z.infer<typeof courseSchema>;
