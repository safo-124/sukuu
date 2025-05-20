// File: app/api/schooladmin/[schoolId]/staff/teachers/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { apiCreateTeacherPayloadSchema } from "@/lib/validators/teacherValidators"; // Using the API-specific schema

// Helper function
async function isAuthorizedSchoolAdmin(userId, schoolId) {
  if (!userId || !schoolId) return false;
  const assignment = await prisma.schoolAdmin.findFirst({
      where: { userId: userId, schoolId: schoolId }
  });
  return !!assignment;
}

// POST handler to create a new Teacher (User + Teacher record)
export async function POST(req, { params }) {
  const { schoolId } = params;
  console.log(`[API TEACHER CREATE] Attempting to create teacher for schoolId: ${schoolId}`);

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      console.error("[API TEACHER CREATE] Unauthorized: No session found.");
      return NextResponse.json({ error: "Unauthorized: No session found." }, { status: 401 });
    }
    console.log("[API TEACHER CREATE] Session retrieved:", session.user.email, "Role:", session.user.role);


    const isSuperAdmin = session.user.role === 'SUPER_ADMIN';
    const authorizedSchoolAdmin = isSuperAdmin ? true : await isAuthorizedSchoolAdmin(session.user.id, schoolId);

    if (!authorizedSchoolAdmin) {
      console.error(`[API TEACHER CREATE] Forbidden: User ${session.user.email} not authorized for school ${schoolId}.`);
      return NextResponse.json({ error: "Forbidden: You are not authorized to add teachers to this school." }, { status: 403 });
    }

    const schoolExists = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!schoolExists) {
      console.error(`[API TEACHER CREATE] School not found for schoolId: ${schoolId}`);
      return NextResponse.json({ error: "School not found." }, { status: 404 });
    }

    const requestBody = await req.json();
    console.log("[API TEACHER CREATE] Request body received:", requestBody);
    
    const fieldsToClean = ['phoneNumber', 'profilePictureUrl', 'teacherIdNumber', 'dateOfJoining', 'qualifications', 'specialization'];
    fieldsToClean.forEach(field => {
      if (requestBody[field] === '') requestBody[field] = undefined;
    });
    if (requestBody.password === '') requestBody.password = undefined;


    const validationResult = apiCreateTeacherPayloadSchema.safeParse(requestBody);
    if (!validationResult.success) {
      console.error("[API TEACHER CREATE] Validation Errors:", validationResult.error.flatten().fieldErrors);
      return NextResponse.json(
        { error: "Validation failed. Please check the teacher's details.", fieldErrors: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    console.log("[API TEACHER CREATE] Validated data:", data);


    const existingUserByEmail = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUserByEmail) {
      console.warn(`[API TEACHER CREATE] User with email ${data.email} already exists.`);
      return NextResponse.json(
        { error: "User with this email already exists.", fieldErrors: { email: ["This email is already taken."] }},
        { status: 409 }
      );
    }

    if (data.teacherIdNumber) {
      const existingTeacherByIdNumber = await prisma.teacher.findUnique({
        where: { schoolId_teacherIdNumber: { schoolId, teacherIdNumber: data.teacherIdNumber } }
      });
      if (existingTeacherByIdNumber) {
        console.warn(`[API TEACHER CREATE] Teacher with ID ${data.teacherIdNumber} already exists in school ${schoolId}.`);
        return NextResponse.json(
          { error: "A teacher with this ID number already exists in this school.", fieldErrors: { teacherIdNumber: ["This ID number is already in use."] }},
          { status: 409 }
        );
      }
    }

    console.log("[API TEACHER CREATE] Hashing password...");
    const hashedPassword = await bcrypt.hash(data.password, 10);
    console.log("[API TEACHER CREATE] Password hashed. Starting transaction...");

    const newTeacherAndUser = await prisma.$transaction(async (tx) => {
      console.log("[API TEACHER CREATE] Inside transaction: Creating User...");
      const newUser = await tx.user.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          hashedPassword,
          phoneNumber: data.phoneNumber,        // Ensure these match your User model optionality
          profilePicture: data.profilePictureUrl, // User.profilePicture from Zod.profilePictureUrl
          role: UserRole.TEACHER,
          isActive: true,
        },
      });
      console.log("[API TEACHER CREATE] User created:", newUser.id);
      console.log("[API TEACHER CREATE] Inside transaction: Creating Teacher profile...");

      const newTeacher = await tx.teacher.create({
        data: {
          userId: newUser.id,
          schoolId: schoolId,
          teacherIdNumber: data.teacherIdNumber, // Optional
          dateOfJoining: data.dateOfJoining ? new Date(data.dateOfJoining) : null, // Handle optional date
          qualifications: data.qualifications,   // Optional
          specialization: data.specialization, // Optional
        },
      });
      console.log("[API TEACHER CREATE] Teacher profile created:", newTeacher.id);
      return { ...newTeacher, user: {id: newUser.id, firstName: newUser.firstName, lastName: newUser.lastName, email: newUser.email, isActive: newUser.isActive, role: newUser.role, profilePicture: newUser.profilePicture, phoneNumber: newUser.phoneNumber } };
    });
    console.log("[API TEACHER CREATE] Transaction successful.");


    return NextResponse.json(
      { message: `Teacher ${data.firstName} ${data.lastName} registered successfully.`, teacher: newTeacherAndUser },
      { status: 201 }
    );

  } catch (error) {
    console.error(`[API TEACHER CREATE] Critical error for school ${schoolId}:`, error);
    // Log the full error object for more details
    console.error("[API TEACHER CREATE] Full error object:", JSON.stringify(error, null, 2));

    if (error.code === 'P2002') { 
      // This unique constraint error might not be caught by earlier checks if it's on a different field
      // or if the earlier check logic has a subtle bug.
      return NextResponse.json({ error: "A unique constraint was violated. This email or Teacher ID might already exist.", detailedError: error.message }, { status: 409 });
    }
    // Add more specific Prisma error code handling if needed
    // e.g., P2003 for foreign key constraint, P2025 for record not found (less likely in create)
    
    return NextResponse.json({ error: "Failed to create teacher. An unexpected server error occurred.", detailedError: error.message }, { status: 500 });
  }
}

// GET handler can be added here later if needed
// export async function GET(req, { params }) { /* ... */ }