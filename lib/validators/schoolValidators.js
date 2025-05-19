// File: lib/validators/schoolValidators.js
import * as z from "zod";
import { TermPeriod } from "@prisma/client"; // Import enums from Prisma Client

export const createSchoolSchema = z.object({
  name: z.string().min(3, { message: "School name must be at least 3 characters." }).max(100),
  schoolEmail: z.string().email({ message: "Invalid email address." }),
  phoneNumber: z.string().min(10, { message: "Phone number seems too short." }).max(20).optional().or(z.literal('')), // Optional but validate if present
  address: z.string().max(255).optional().or(z.literal('')),
  city: z.string().max(50).optional().or(z.literal('')),
  stateOrRegion: z.string().max(50).optional().or(z.literal('')),
  country: z.string().max(50).optional().or(z.literal('')),
  postalCode: z.string().max(20).optional().or(z.literal('')),
  website: z.string().url({ message: "Invalid URL." }).optional().or(z.literal('')),
  logoUrl: z.string().url({ message: "Invalid URL for logo." }).optional().or(z.literal('')), // For now, URL; file upload later
  currentAcademicYear: z.string().regex(/^\d{4}-\d{4}$/, { message: "Academic year must be in YYYY-YYYY format (e.g., 2024-2025)." }),
  currentTerm: z.nativeEnum(TermPeriod).optional(), // Optional, can be set later
  currency: z.string().min(3, { message: "Currency code must be 3 characters (e.g., GHS)." }).max(3),
  timezone: z.string().min(3, { message: "Timezone is required (e.g., Africa/Accra)." }),
});