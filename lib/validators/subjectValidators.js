// File: lib/validators/subjectValidators.js
import * as z from "zod";

export const subjectSchema = z.object({
  name: z.string().min(2, { message: "Subject name must be at least 2 characters." }).max(100),
  code: z.string().max(20, { message: "Subject code can be up to 20 characters." }).optional().or(z.literal('')), // Optional, but unique per school if provided
  description: z.string().max(500, { message: "Description can be up to 500 characters." }).optional().or(z.literal('')),
});

// For updates, all fields are typically optional if using PATCH. For PUT with a full form, they might be required.
// Let's assume a PATCH-like update where any provided field is updated.
export const updateSubjectSchema = subjectSchema.partial();