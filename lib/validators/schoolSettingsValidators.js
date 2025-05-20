// File: lib/validators/schoolSettingsValidators.js (or a general academic validator)
import * as z from "zod";
import { TermPeriod } from "@prisma/client";

export const academicSessionSettingsSchema = z.object({
  currentAcademicYear: z.string()
    .regex(/^\d{4}-\d{4}$/, { message: "Academic year must be in YYYY-YYYY format (e.g., 2024-2025)." })
    .min(9, { message: "Academic year is required."}), // YYYY-YYYY is 9 chars
  currentTerm: z.nativeEnum(TermPeriod, { 
    errorMap: () => ({ message: "Please select a valid term or semester." }) 
  }).optional().nullable(), // Making it optional or nullable if a school might not have a "current term" set
});