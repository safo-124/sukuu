// File: lib/validators/classValidators.js
import * as z from "zod";

export const createClassSchema = z.object({
  name: z.string().min(1, { message: "Class name is required." }).max(100),
  section: z.string().max(50).optional().or(z.literal('')),
  academicYear: z.string().regex(/^\d{4}-\d{4}$/, { message: "Academic year must be in YYYY-YYYY format (e.g., 2024-2025)." }),
  homeroomTeacherId: z.string().cuid({ message: "Invalid teacher selection." }).optional().or(z.literal('')),
});

// Schema for updating a class
export const updateClassSchema = z.object({
  name: z.string().min(1, { message: "Class name is required." }).max(100).optional(), // Optional if not changing name
  section: z.string().max(50).optional().nullable(), // Allow explicit null to clear section
  homeroomTeacherId: z.string().cuid({ message: "Invalid teacher selection." }).optional().nullable(), // Allow explicit null to unassign
  // academicYear is typically not changed during an edit of an existing class instance.
  // If it needs to change, it often implies creating a new class for the new year.
});