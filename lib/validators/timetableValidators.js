// File: lib/validators/timetableValidators.js
import * as z from "zod";

const timeStringRegex = /^(0[0-9]|1[0-9]|2[0-3]):([0-5][0-9])$/; // HH:MM format

// 1. Define the base object shape for a school period
const baseSchoolPeriodObjectSchema = z.object({
  name: z.string().min(1, "Period name is required.").max(50, "Period name is too long."),
  startTime: z.string().regex(timeStringRegex, "Start time must be in HH:MM format (e.g., 08:00)."),
  endTime: z.string().regex(timeStringRegex, "End time must be in HH:MM format (e.g., 09:30)."),
  sortOrder: z.preprocess(
    (val) => parseInt(String(val), 10),
    z.number({ required_error: "Sort order is required.", invalid_type_error: "Sort order must be a number."})
      .int("Sort order must be an integer.")
      .min(0, "Sort order cannot be negative.")
  ),
  isBreak: z.boolean().default(false).optional(),
});

// 2. Create the schema for creating a new period, adding refinement to the base
export const schoolPeriodSchema = baseSchoolPeriodObjectSchema.refine(data => {
    const [startH, startM] = data.startTime.split(':').map(Number);
    const [endH, endM] = data.endTime.split(':').map(Number);
    const startTimeInMinutes = startH * 60 + startM;
    const endTimeInMinutes = endH * 60 + endM;
    return startTimeInMinutes < endTimeInMinutes;
}, {
    message: "End time must be after start time.",
    path: ["endTime"], // Associate error with endTime field
});

// 3. Create the schema for updating a period, making fields optional from the base
// The API handler will be responsible for more complex validation like time overlaps
// and ensuring startTime < endTime when one or both are updated, using existing values.
export const updateSchoolPeriodSchema = baseSchoolPeriodObjectSchema.partial();