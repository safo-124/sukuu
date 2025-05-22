// File: lib/validators/attendanceValidators.js
import * as z from "zod";
import { AttendanceStatus, TermPeriod } from "@prisma/client"; // Import enums from Prisma

// Schema for a single student's daily attendance record
export const dailyAttendanceRecordSchema = z.object({
  studentId: z.string().cuid({ message: "Invalid student ID." }),
  status: z.nativeEnum(AttendanceStatus, { errorMap: () => ({ message: "Invalid attendance status." })}),
  remarks: z.string().max(255, "Remarks too long.").optional().nullable(),
});

// Schema for submitting a batch of daily attendance records
export const bulkDailyAttendanceSchema = z.object({
  classId: z.string().cuid({ message: "Invalid class ID." }),
  date: z.string().refine((dateStr) => !isNaN(new Date(dateStr).getTime()), { message: "Invalid date format."}), // Expecting YYYY-MM-DD
  academicYear: z.string().regex(/^\d{4}-\d{4}$/, { message: "Academic year must be in YYYY-YYYY format." }),
  term: z.nativeEnum(TermPeriod, { errorMap: () => ({ message: "Invalid term." })}),
  records: z.array(dailyAttendanceRecordSchema).min(1, "At least one attendance record is required."),
});