// File: lib/validators/gradeScaleValidators.js
import * as z from "zod";

// Schema for creating/updating a GradeScale definition
export const gradeScaleSchema = z.object({
  name: z.string().min(3, "Scale name must be at least 3 characters.").max(100),
  description: z.string().max(500).optional().or(z.literal('')),
  isActive: z.boolean().optional(), // isActive might be managed separately or defaulted
});

// Schema for creating/updating a single GradeScaleEntry
export const gradeScaleEntrySchema = z.object({
  minPercentage: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number({ required_error: "Min percentage is required.", invalid_type_error: "Min percentage must be a number."})
      .min(0, "Percentage cannot be negative.")
      .max(100, "Percentage cannot exceed 100.")
  ),
  maxPercentage: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number({ required_error: "Max percentage is required.", invalid_type_error: "Max percentage must be a number."})
      .min(0, "Percentage cannot be negative.")
      .max(100, "Percentage cannot exceed 100.")
  ),
  gradeLetter: z.string().min(1, "Grade letter is required.").max(10, "Grade letter too long."), // e.g., A+, Distinction
  gradePoint: z.preprocess(
    (val) => (val === "" || val === null || val === undefined) ? undefined : parseFloat(String(val)),
    z.number({ invalid_type_error: "Grade point must be a number."})
      .min(0, "Grade point cannot be negative.")
      .max(10, "Grade point seems too high.") // Adjust max as per your system (e.g. 4.0, 5.0)
      .optional()
      .nullable()
  ),
  remark: z.string().max(100, "Remark is too long.").optional().or(z.literal('')),
}).refine(data => data.minPercentage <= data.maxPercentage, {
  message: "Min percentage cannot be greater than max percentage.",
  path: ["minPercentage"], // Or ["maxPercentage"]
});

// Schema for managing multiple entries for a GradeScale
export const manageGradeScaleEntriesSchema = z.object({
    entries: z.array(gradeScaleEntrySchema)
    // You might add other fields here if needed when saving all entries for a scale
}).refine(data => {
    // Check for overlapping percentage ranges within the submitted entries
    const sortedEntries = [...data.entries].sort((a, b) => a.minPercentage - b.minPercentage);
    for (let i = 0; i < sortedEntries.length - 1; i++) {
        if (sortedEntries[i].maxPercentage >= sortedEntries[i+1].minPercentage) { // Or > if ranges can touch
            return false; // Found an overlap
        }
    }
    return true;
}, {
    message: "Grade percentage ranges must not overlap.",
    path: ["entries"], // General error on the array of entries
});