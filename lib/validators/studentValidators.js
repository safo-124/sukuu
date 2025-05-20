// File: lib/validators/studentValidators.js
import * as z from "zod";
import { Gender } from "@prisma/client";

const optionalDateString = z.string().refine((dateStr) => {
    if (dateStr === null || dateStr === undefined || dateStr === "") return true;
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
}, { message: "Invalid date format." }).optional().or(z.literal(''));

const optionalPastOrPresentDateString = z.string().refine((dateStr) => {
    if (dateStr === null || dateStr === undefined || dateStr === "") return true;
    const date = new Date(dateStr);
    return !isNaN(date.getTime()) && date <= new Date();
}, { message: "Date cannot be in the future and must be a valid date." }).optional().or(z.literal(''));

export const createStudentSchema = z.object({
  studentIdNumber: z.string().min(1, { message: "Student ID is required." }).max(50),
  firstName: z.string().min(2, { message: "First name must be at least 2 characters." }).max(50),
  lastName: z.string().min(2, { message: "Last name must be at least 2 characters." }).max(50),
  middleName: z.string().max(50).optional().or(z.literal('')),
  dateOfBirth: z.string()
    .min(1, {message: "Date of Birth is required."})
    .refine((dateStr) => {
        const date = new Date(dateStr);
        return !isNaN(date.getTime()) && date <= new Date();
    }, { message: "Date of Birth cannot be in the future and must be a valid date." }),
  gender: z.nativeEnum(Gender, { errorMap: () => ({ message: "Please select a valid gender." })}),
  enrollmentDate: z.string()
    .min(1, {message: "Enrollment Date is required."})
    .refine((dateStr) => {
        const date = new Date(dateStr);
        return !isNaN(date.getTime());
    }, { message: "Enrollment Date must be a valid date."}),
  currentClassId: z.string().cuid({ message: "Invalid class selection." }).optional().or(z.literal('')),
  address: z.string().max(255).optional().or(z.literal('')),
  city: z.string().max(50).optional().or(z.literal('')),
  stateOrRegion: z.string().max(50).optional().or(z.literal('')),
  country: z.string().max(50).optional().or(z.literal('')),
  postalCode: z.string().max(20).optional().or(z.literal('')),
  emergencyContactName: z.string().max(100).optional().or(z.literal('')),
  emergencyContactPhone: z.string().max(20).optional().or(z.literal('')),
  bloodGroup: z.string().max(5).optional().or(z.literal('')),
  allergies: z.string().max(500).optional().or(z.literal('')),
  medicalNotes: z.string().max(1000).optional().or(z.literal('')),
  profilePictureUrl: z.string().url({ message: "Invalid URL for profile picture." }).optional().or(z.literal('')),
  isActive: z.boolean().optional(),
});

export const updateStudentSchema = z.object({
  studentIdNumber: z.string().min(1, { message: "Student ID is required." }).max(50).optional(),
  firstName: z.string().min(2, { message: "First name must be at least 2 characters." }).max(50).optional(),
  lastName: z.string().min(2, { message: "Last name must be at least 2 characters." }).max(50).optional(),
  middleName: z.string().max(50).optional().or(z.literal('')),
  dateOfBirth: optionalPastOrPresentDateString,
  gender: z.nativeEnum(Gender, { errorMap: () => ({ message: "Please select a valid gender." })}).optional(),
  enrollmentDate: optionalDateString,
  currentClassId: z.string().cuid({ message: "Invalid class selection." }).optional().or(z.literal('')),
  address: z.string().max(255).optional().or(z.literal('')),
  city: z.string().max(50).optional().or(z.literal('')),
  stateOrRegion: z.string().max(50).optional().or(z.literal('')),
  country: z.string().max(50).optional().or(z.literal('')),
  postalCode: z.string().max(20).optional().or(z.literal('')),
  emergencyContactName: z.string().max(100).optional().or(z.literal('')),
  emergencyContactPhone: z.string().max(20).optional().or(z.literal('')),
  bloodGroup: z.string().max(5).optional().or(z.literal('')),
  allergies: z.string().max(500).optional().or(z.literal('')),
  medicalNotes: z.string().max(1000).optional().or(z.literal('')),
  profilePictureUrl: z.string().url({ message: "Invalid URL for profile picture." }).optional().or(z.literal('')),
  isActive: z.boolean().optional(),
});