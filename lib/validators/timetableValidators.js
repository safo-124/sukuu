// File: lib/validators/timetableValidators.js
import * as z from "zod";
import { DayOfWeek } from "@prisma/client"; // Make sure DayOfWeek is imported if used here, or just in timetableSlotSchema

const timeStringRegex = /^(0[0-9]|1[0-9]|2[0-3]):([0-5][0-9])$/; // HH:MM format

// 1. Define the base object shape for a school period
const baseSchoolPeriodObjectSchema = z.object({
  name: z.string().min(1, { message: "Period name is required." }).max(50, "Period name is too long."),
  startTime: z.string().regex(timeStringRegex, "Start time must be in HH:MM format (e.g., 08:00)."),
  endTime: z.string().regex(timeStringRegex, "End time must be in HH:MM format (e.g., 09:30)."),
  sortOrder: z.preprocess(
    (val) => {
        const num = parseInt(String(val), 10);
        return isNaN(num) ? undefined : num; // Handle non-numeric input for Zod number type check
    },
    z.number({ 
        required_error: "Sort order is required.", 
        invalid_type_error: "Sort order must be a number."
    })
      .int({ message: "Sort order must be an integer."})
      .min(0, { message: "Sort order cannot be negative."})
  ),
  isBreak: z.boolean().default(false).optional(),
});

// 2. Schema for creating a new period (adds refinement to the base)
export const schoolPeriodSchema = baseSchoolPeriodObjectSchema.refine(data => {
    // This refinement only runs if individual fields (startTime, endTime) are valid strings in HH:MM format
    if (!data.startTime || !data.endTime) return true; // Skip if formats are already invalid (caught by regex)
    const [startH, startM] = data.startTime.split(':').map(Number);
    const [endH, endM] = data.endTime.split(':').map(Number);
    // Check if parsing resulted in NaN (e.g. if regex was bypassed or refine runs before full parse)
    if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return true; 
    
    const startTimeInMinutes = startH * 60 + startM;
    const endTimeInMinutes = endH * 60 + endM;
    return startTimeInMinutes < endTimeInMinutes;
}, {
    message: "End time must be after start time.",
    path: ["endTime"], // Associate error with endTime field
});

// 3. Schema for updating a period (makes fields optional from the base)
// The API handler for PUT will be responsible for more complex validation like time overlaps
// with existing periods and ensuring startTime < endTime if both are provided in an update.
export const updateSchoolPeriodSchema = baseSchoolPeriodObjectSchema.partial();


// --- Schemas for TimetableSlot ---
export const timetableSlotSchema = z.object({
  classId: z.string().cuid({ message: "Invalid Class ID."}),
  subjectId: z.string().cuid({ message: "Please select a valid subject." }),
  teacherId: z.string().cuid({ message: "Please select a valid teacher for this subject/class." }), // Teacher is required for a slot
  dayOfWeek: z.nativeEnum(DayOfWeek, { errorMap: () => ({ message: "Please select a valid day."})}),
  startTime: z.string().regex(timeStringRegex, "Start time must be in HH:MM format."),
  endTime: z.string().regex(timeStringRegex, "End time must be in HH:MM format."),
  room: z.string().max(50, "Room name/number too long.").optional().or(z.literal('')),
}).refine(data => {
    if (!data.startTime || !data.endTime) return true;
    const [startH, startM] = data.startTime.split(':').map(Number);
    const [endH, endM] = data.endTime.split(':').map(Number);
    if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return true;
    return (startH * 60 + startM) < (endH * 60 + endM);
}, { message: "End time must be after start time for the slot.", path: ["endTime"] });

// For updating a timetable slot, usually you might only change subject, teacher, or room.
// Changing time/day often means deleting and recreating.
// If time/day are editable, update schema needs careful refinement.
export const updateTimetableSlotSchema = z.object({
  subjectId: z.string().cuid("Please select a valid subject.").optional(),
  teacherId: z.string().cuid("Please select a valid teacher.").optional().nullable(), // Allow unassigning teacher
  room: z.string().max(50, "Room name/number too long.").optional().nullable(),
  // Day, startTime, endTime are kept fixed for an existing slot in this update schema.
  // If they need to be updatable, add them here as optional and handle complex conflict checks in API.
}).partial(); // .partial() makes all fields optional.