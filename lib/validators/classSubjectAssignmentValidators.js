// File: lib/validators/classSubjectAssignmentValidators.js
import * as z from "zod";

// Original schema (for API payload where classId & academicYear are added server-side or known context)
export const createClassSubjectAssignmentSchema = z.object({
  classId: z.string().cuid({ message: "Invalid Class ID." }),
  subjectId: z.string().cuid({ message: "Please select a valid subject." }),
  teacherId: z.string().cuid({ message: "Invalid Teacher ID." }).optional().nullable(),
  academicYear: z.string().regex(/^\d{4}-\d{4}$/, { message: "Academic year must be in YYYY-YYYY format." }),
});

export const updateClassSubjectAssignmentSchema = z.object({
  teacherId: z.string().cuid({ message: "Invalid Teacher ID." }).optional().nullable(),
});

// --- NEW SCHEMAS FOR THE DIALOG FORM ---
// Schema for the "Add Assignment" dialog form fields
export const addAssignmentDialogFormSchema = z.object({
  subjectId: z.string().min(1, "Subject selection is required."), // Use min(1) to catch empty string from Select
  teacherId: z.string().cuid("Invalid teacher selection.").optional().nullable().or(z.literal("")), // Allow empty string for "no teacher"
});

// Schema for the "Edit Assignment" dialog form fields (only teacherId is editable)
export const editAssignmentDialogFormSchema = z.object({
  subjectId: z.string().cuid(), // Will be disabled/read-only in form, but pass for context
  teacherId: z.string().cuid("Invalid teacher selection.").optional().nullable().or(z.literal("")),
});