// File: lib/validators/classValidators.js
import * as z from "zod";

export const createClassSchema = z.object({
  name: z.string().min(1, { message: "Class name is required." }).max(100),
  section: z.string().max(50).optional().or(z.literal('')), // e.g., A, B, Blue, Gold
  academicYear: z.string().regex(/^\d{4}-\d{4}$/, { message: "Academic year must be in YYYY-YYYY format (e.g., 2024-2025)." }),
  homeroomTeacherId: z.string().cuid({ message: "Invalid teacher selection." }).optional().or(z.literal('')), // Optional
});

// You can add an updateClassSchema later if needed, likely making fields optional
// export const updateClassSchema = createClassSchema.partial();