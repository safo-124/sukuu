// File: lib/validators/teacherValidators.js
import * as z from "zod";

// Helper for date string validation
const generalDateString = z.string().refine((dateStr) => {
    if (dateStr === null || dateStr === undefined || dateStr === "") return true;
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
}, { message: "Invalid date format." }).optional().or(z.literal(''));

// Common fields for a user profile part of a teacher
const commonUserFieldsShape = {
  firstName: z.string().min(2, { message: "First name must be at least 2 characters." }).max(50),
  lastName: z.string().min(2, { message: "Last name must be at least 2 characters." }).max(50),
  email: z.string().email({ message: "Invalid email address." }),
  phoneNumber: z.string().max(20, { message: "Phone number is too long."}).optional().or(z.literal('')),
  profilePictureUrl: z.string().url({ message: "Invalid URL for profile picture." }).optional().or(z.literal('')),
};

// Common fields specific to a teacher's professional profile
const commonTeacherFieldsShape = {
  teacherIdNumber: z.string().max(50, { message: "Teacher ID is too long."}).optional().or(z.literal('')),
  dateOfJoining: generalDateString,
  qualifications: z.string().max(1000, { message: "Qualifications text is too long (max 1000 chars)."}).optional().or(z.literal('')),
  specialization: z.string().max(150, { message: "Specialization text is too long (max 150 chars)."}).optional().or(z.literal('')),
};

// Schema for FORM VALIDATION (includes confirmPassword and matching logic)
export const createTeacherSchema = z.object({
  ...commonUserFieldsShape,
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  confirmPassword: z.string().min(8, { message: "Confirm password is required and must be at least 8 characters."}),
  ...commonTeacherFieldsShape,
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

// NEW SCHEMA: For API PAYLOAD VALIDATION (does NOT include confirmPassword)
export const apiCreateTeacherPayloadSchema = z.object({
  ...commonUserFieldsShape,
  password: z.string().min(8, { message: "Password must be at least 8 characters." }), // Password itself is still required
  ...commonTeacherFieldsShape,
});


// Schema for updating an existing teacher's details (similar structure for API vs Form might be needed)
export const updateTeacherSchema = z.object({
  ...commonUserFieldsShape,
  password: z.string().min(8, "New password must be at least 8 characters.").optional().or(z.literal('')),
  confirmPassword: z.string().min(8, "Confirm new password.").optional().or(z.literal('')),
  ...commonTeacherFieldsShape,
}).superRefine((data, ctx) => {
  if (data.password || data.confirmPassword) {
    if (data.password && !data.confirmPassword) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Please confirm your new password.", path: ["confirmPassword"] });
    } else if (!data.password && data.confirmPassword) {
       ctx.addIssue({ code: z.ZodIssueCode.custom, message: "New password is required if confirming.", path: ["password"] });
    } else if (data.password && data.confirmPassword && data.password !== data.confirmPassword) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "New passwords do not match.", path: ["confirmPassword"] });
    }
  }
});

// API payload schema for updating a teacher (omits confirmPassword, makes password truly optional if not changing)
export const apiUpdateTeacherPayloadSchema = z.object({
    ...commonUserFieldsShape,
    // For updates, email is usually fixed or handled by a separate process.
    // Assuming the form disables email input for edit, it might not be in the payload.
    // If it is, Zod will validate its format. To make it explicitly optional for update payload:
    // email: z.string().email({ message: "Invalid email address." }).optional(),
    password: z.string().min(8, "New password must be at least 8 characters.").optional().or(z.literal('')), // Only if password is being changed
    ...commonTeacherFieldsShape,
});