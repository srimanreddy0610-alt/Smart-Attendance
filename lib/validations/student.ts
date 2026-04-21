import { z } from "zod";

export const studentOnboardingSchema = z.object({
  rollNumber: z.string().min(1, "Roll number is required").max(50),
  streamId: z.string().min(1, "Stream is required"),
  department: z.string().min(1, "Department is required").max(100),
  semester: z.number().int().min(1, "Minimum semester is 1").max(10, "Maximum semester is 10"),
  section: z.string().min(1, "Section is required").max(10),
  courseIds: z.array(z.string()).min(1, "Select at least one course"),
});

export type StudentOnboardingValues = z.infer<typeof studentOnboardingSchema>;
