// File: lib/validators/assessmentValidators.js
import * as z from "zod";
import { TermPeriod } from "@prisma/client"; // Ensure this enum is correctly imported

// Base validator for a string that should be a date, and is optional
const optionalDateString = z.string().refine((dateStr) => {
    // If the string is empty, undefined, or null, it's valid for an optional field that hasn't been touched
    if (dateStr === null || dateStr === undefined || dateStr === "") return true;
    const date = new Date(dateStr);
    return !isNaN(date.getTime()); // Check if the parsed date is valid
}, { message: "Invalid date format." }).optional().or(z.literal('')); // .or(z.literal('')) allows empty string to pass as 'optional'

// Schema for creating a new Assessment
export const createAssessmentSchema = z.object({
  name: z.string().min(3, { message: "Assessment name must be at least 3 characters." }).max(150),
  classId: z.string().cuid({ message: "Please select a valid class." }),
  subjectId: z.string().cuid({ message: "Please select a valid subject." }),
  academicYear: z.string().regex(/^\d{4}-\d{4}$/, { message: "Academic year must be in YYYY-YYYY format (e.g., 2024-2025)." }),
  term: z.nativeEnum(TermPeriod, { errorMap: () => ({ message: "Please select a valid term." })}),
  maxMarks: z.preprocess(
    (val) => {
        const numVal = parseFloat(String(val)); // Convert to number
        return isNaN(numVal) ? undefined : numVal; // Zod handles undefined for required_error if needed
    },
    z.number({ 
        required_error: "Maximum marks are required.",
        invalid_type_error: "Maximum marks must be a number." 
    })
     .positive({ message: "Maximum marks must be a positive number." })
     .max(1000, { message: "Maximum marks cannot exceed 1000."})
  ),
  // For required assessmentDate: ensure string is non-empty, then refine.
  assessmentDate: z.string()
    .min(1, {message: "Assessment date is required."}) // Must not be an empty string
    .refine((dateStr) => { // Then, refine the non-empty string
        const date = new Date(dateStr);
        return !isNaN(date.getTime()); // Check if valid date
    }, { message: "Assessment Date must be a valid date."}),
  description: z.string().max(500, { message: "Description can be up to 500 characters." }).optional().or(z.literal('')),
});

// Schema for updating an existing Assessment
// Most fields are optional. If provided, they must meet their validation rules.
export const updateAssessmentSchema = z.object({
  name: z.string().min(3, { message: "Assessment name must be at least 3 characters." }).max(150).optional(),
  classId: z.string().cuid({ message: "Please select a valid class." }).optional(),
  subjectId: z.string().cuid({ message: "Please select a valid subject." }).optional(),
  academicYear: z.string().regex(/^\d{4}-\d{4}$/, { message: "Academic year must be in YYYY-YYYY format." }).optional(),
  term: z.nativeEnum(TermPeriod, { errorMap: () => ({ message: "Please select a valid term." })}).optional(),
  maxMarks: z.preprocess(
    (val) => {
        // If empty string, null, or undefined, treat as undefined (for optional number)
        if (val === "" || val === null || val === undefined) return undefined;
        const numVal = parseFloat(String(val));
        return isNaN(numVal) ? undefined : numVal; // Allows Zod to catch type error if not parseable
    },
    z.number({ invalid_type_error: "Maximum marks must be a number." })
     .positive({ message: "Maximum marks must be a positive number." })
     .max(1000, { message: "Maximum marks cannot exceed 1000."})
     .optional() // Make the number validation itself optional for updates
  ),
  assessmentDate: optionalDateString, // Use the pre-defined optional & refined schema
  description: z.string().max(500, { message: "Description can be up to 500 characters." }).optional().or(z.literal('')),
});