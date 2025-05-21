// File: lib/validators/studentMarkValidators.js
import * as z from "zod";

// Schema for a single student's mark entry
export const studentMarkEntrySchema = z.object({
  studentId: z.string().cuid({ message: "Invalid student ID." }),
  marksObtained: z.preprocess(
    (val) => {
        // Allow empty string or null to mean "not yet marked" or "clear mark"
        if (val === "" || val === null || val === undefined) return undefined;
        const num = parseFloat(String(val));
        return isNaN(num) ? undefined : num; // Zod handles type error if still undefined for required
    },
    // Marks are optional if just viewing or if some students aren't marked yet.
    // The API can decide if marks are required for *all* students in a batch save.
    // For now, let's make it optional in the base schema.
    z.number({ invalid_type_error: "Marks must be a number." })
     .min(0, { message: "Marks cannot be negative." })
     // maxMarks validation will be done against the Assessment's maxMarks in the API
     .optional() 
  ),
  remarks: z.string().max(500, "Remarks too long.").optional().nullable(),
});

// Schema for submitting a batch of student marks
export const bulkStudentMarksSchema = z.object({
  assessmentId: z.string().cuid({ message: "Invalid assessment ID." }), // Ensure this is passed or known by API
  marks: z.array(studentMarkEntrySchema),
  // We'll also need maxMarks from the assessment for server-side validation of marksObtained
});