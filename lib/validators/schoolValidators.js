// File: lib/validators/schoolValidators.js
import * as z from "zod";
import { TermPeriod } from "@prisma/client";

export const createSchoolSchema = z.object({
  name: z.string().min(3, { message: "School name must be at least 3 characters." }).max(100),
  schoolEmail: z.string().email({ message: "Invalid email address." }),
  phoneNumber: z.string().min(10, { message: "Phone number seems too short." }).max(20).optional().or(z.literal('')),
  address: z.string().max(255).optional().or(z.literal('')),
  city: z.string().max(50).optional().or(z.literal('')),
  stateOrRegion: z.string().max(50).optional().or(z.literal('')),
  country: z.string().max(50).optional().or(z.literal('')),
  postalCode: z.string().max(20).optional().or(z.literal('')),
  website: z.string().url({ message: "Invalid URL." }).optional().or(z.literal('')),
  logoUrl: z.string().url({ message: "Invalid URL for logo." }).optional().or(z.literal('')),
  currentAcademicYear: z.string().regex(/^\d{4}-\d{4}$/, { message: "Academic year must be in YYYY-YYYY format (e.g., 2024-2025)." }),
  currentTerm: z.nativeEnum(TermPeriod).optional(),
  currency: z.string().min(3, { message: "Currency code must be 3 characters (e.g., GHS)." }).max(3),
  timezone: z.string().min(3, { message: "Timezone is required (e.g., Africa/Accra)." }),
});

// Schema for updating a school (most fields are optional for PATCH-like behavior, but PUT implies sending all editable fields)
// For PUT, we usually expect all editable fields. We can use .partial() if we want to allow partial updates.
// Or, if PUT means "replace with this new data", then required fields in the schema should remain required.
// Let's assume for PUT, we are updating the editable fields, and the form will submit them.
// The core requirements (like name, email format) should still hold if a value is provided.
export const updateSchoolSchema = createSchoolSchema.extend({
  // If some fields cannot be updated, you might omit them or handle it in the API.
  // For example, schoolEmail might be critical. For now, we allow it.
  // If using .partial(), all fields become optional:
  // name: z.string().min(3).max(100).optional(),
  // schoolEmail: z.string().email().optional(),
  // etc.
  // For now, let's keep the same requiredness as create, assuming the form PRE-FILLS and submits all.
  // This means if a user clears a required field, it will be an error.
  // A true PATCH would use .partial() and the API would only update provided fields.
  // Since our form will likely submit all fields (pre-filled), createSchoolSchema is mostly fine for PUT.
  // Let's explicitly make fields optional if not sending them is acceptable in an update,
  // but typically for a "full update" form, values are sent.
  // If we want to allow a user to clear an optional field:
  phoneNumber: z.string().min(10, { message: "Phone number seems too short." }).max(20).optional().or(z.literal('')).nullable(),
  address: z.string().max(255).optional().or(z.literal('')).nullable(),
  city: z.string().max(50).optional().or(z.literal('')).nullable(),
  stateOrRegion: z.string().max(50).optional().or(z.literal('')).nullable(),
  country: z.string().max(50).optional().or(z.literal('')).nullable(),
  postalCode: z.string().max(20).optional().or(z.literal('')).nullable(),
  website: z.string().url({ message: "Invalid URL." }).optional().or(z.literal('')).nullable(),
  logoUrl: z.string().url({ message: "Invalid URL for logo." }).optional().or(z.literal('')).nullable(),
  currentTerm: z.nativeEnum(TermPeriod).optional().nullable(),
}).omit({
  // Fields that generally shouldn't be changed in an update, or are handled differently
  // For example, createdBySuperAdminId is set on creation.
  // For now, we let all fields be updatable via the form.
  // If schoolEmail had to be immutable after creation, you would .omit({ schoolEmail: true })
  // and handle its display separately in the form.
});
// For simplicity, if the form always submits all fields (pre-filled),
// `createSchoolSchema` can often be reused for PUT validation.
// Using a distinct updateSchoolSchema gives more control if update logic differs.
// Let's stick to a schema that largely mirrors create for now as the form will be pre-filled.
// `updateSchoolSchema` will be the same as `createSchoolSchema` for this iteration,
// with the understanding that the form pre-fills everything.
// If you want to allow clearing optional fields, adding `.nullable()` is good.