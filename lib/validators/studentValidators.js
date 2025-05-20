// File: lib/validators/studentValidators.js
import * as z from "zod";
import { Gender } from "@prisma/client"; // Import Gender enum from Prisma Client

// Helper for date validation ensuring it's not in the future
const pastOrPresentDate = z.string().refine((dateStr) => {
    const date = new Date(dateStr);
    return !isNaN(date.getTime()) && date <= new Date();
}, { message: "Date cannot be in the future." });


export const createStudentSchema = z.object({
  studentIdNumber: z.string().min(1, { message: "Student ID is required." }).max(50),
  firstName: z.string().min(2, { message: "First name must be at least 2 characters." }).max(50),
  lastName: z.string().min(2, { message: "Last name must be at least 2 characters." }).max(50),
  middleName: z.string().max(50).optional().or(z.literal('')),
  dateOfBirth: pastOrPresentDate, // Validates as string, actual conversion to Date is handled by Prisma
  gender: z.nativeEnum(Gender, { errorMap: () => ({ message: "Please select a valid gender." })}),
  enrollmentDate: z.string().refine((dateStr) => !isNaN(new Date(dateStr).getTime()), { message: "Invalid enrollment date."}), // Validates as string
  
  currentClassId: z.string().cuid({ message: "Invalid class selection." }).optional().or(z.literal('')), // Optional on creation, can be assigned later

  // Optional fields
  address: z.string().max(255).optional().or(z.literal('')),
  city: z.string().max(50).optional().or(z.literal('')),
  stateOrRegion: z.string().max(50).optional().or(z.literal('')),
  country: z.string().max(50).optional().or(z.literal('')),
  postalCode: z.string().max(20).optional().or(z.literal('')),
  emergencyContactName: z.string().max(100).optional().or(z.literal('')),
  emergencyContactPhone: z.string().max(20).optional().or(z.literal('')),
  bloodGroup: z.string().max(5).optional().or(z.literal('')), // e.g., O+, AB-
  allergies: z.string().max(500).optional().or(z.literal('')),
  medicalNotes: z.string().max(1000).optional().or(z.literal('')),
  profilePictureUrl: z.string().url({ message: "Invalid URL for profile picture." }).optional().or(z.literal('')),
  // `isActive` will default to true in the database or API logic
  // `schoolId` will come from the URL parameter
});