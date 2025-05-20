// File: app/api/schooladmin/[schoolId]/students/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { createStudentSchema } from "@/lib/validators/studentValidators";

// Helper function to check if the logged-in user is an authorized admin for this school
async function isAuthorizedSchoolAdmin(userId, schoolId) {
    if (!userId || !schoolId) return false;
    const schoolAdminAssignment = await prisma.schoolAdmin.findFirst({
        where: { userId: userId, schoolId: schoolId }
    });
    return !!schoolAdminAssignment;
}

// POST handler to create a new Student for a specific school
export async function POST(req, { params }) {
  const { schoolId } = params;

  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized: No session found." }, { status: 401 });
    }

    // Authorize: Check if user is SCHOOL_ADMIN for this school OR SUPER_ADMIN
    const isSchoolAdminForThisSchool = await isAuthorizedSchoolAdmin(session.user.id, schoolId);
    if (session.user.role !== 'SUPER_ADMIN' && !isSchoolAdminForThisSchool) {
        return NextResponse.json({ error: "Forbidden: You are not authorized to add students to this school." }, { status: 403 });
    }

    // Check if school exists
    const schoolExists = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!schoolExists) {
      return NextResponse.json({ error: "School not found." }, { status: 404 });
    }

    const requestBody = await req.json();
    
    // Clean optional empty string fields before validation
    const fieldsToClean = ['middleName', 'currentClassId', 'address', 'city', 'stateOrRegion', 'country', 'postalCode', 'emergencyContactName', 'emergencyContactPhone', 'bloodGroup', 'allergies', 'medicalNotes', 'profilePictureUrl'];
    fieldsToClean.forEach(field => {
      if (requestBody[field] === '') {
        requestBody[field] = undefined; // Zod .optional() works better with undefined than empty string
      }
    });

    const validationResult = createStudentSchema.safeParse(requestBody);

    if (!validationResult.success) {
      console.error("Student Creation Validation Errors:", validationResult.error.flatten().fieldErrors);
      return NextResponse.json(
        { error: "Validation failed. Please check the student details.", fieldErrors: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check for duplicate studentIdNumber within the same school
    const existingStudentByIdNumber = await prisma.student.findUnique({
      where: { schoolId_studentIdNumber: { schoolId, studentIdNumber: data.studentIdNumber } }
    });
    if (existingStudentByIdNumber) {
      return NextResponse.json(
        { error: "A student with this ID number already exists in this school.", fieldErrors: { studentIdNumber: ["This ID number is already in use."] }},
        { status: 409 } // Conflict
      );
    }
    
    // Check if currentClassId is valid for this school (if provided)
    if (data.currentClassId) {
        const classExistsInSchool = await prisma.class.findFirst({
            where: { id: data.currentClassId, schoolId: schoolId }
        });
        if (!classExistsInSchool) {
            return NextResponse.json(
                { error: "Selected class does not belong to this school or does not exist.", fieldErrors: { currentClassId: ["Invalid class selection."] }},
                { status: 400 }
            );
        }
    }


    const newStudent = await prisma.student.create({
      data: {
        ...data, // Spread validated data
        schoolId: schoolId, // Associate with the school from URL params
        dateOfBirth: new Date(data.dateOfBirth), // Convert string to Date
        enrollmentDate: new Date(data.enrollmentDate), // Convert string to Date
        isActive: true, // Default new students to active
        currentClassId: data.currentClassId || null, // Ensure null if not provided
      },
    });

    return NextResponse.json(
      { message: `Student ${newStudent.firstName} ${newStudent.lastName} enrolled successfully!`, student: newStudent },
      { status: 201 }
    );

  } catch (error) {
    console.error(`Error creating student for school ${schoolId}:`, error);
    if (error.code === 'P2002') { // Unique constraint failed (should be caught by studentIdNumber check ideally)
      return NextResponse.json({ error: "A unique constraint was violated (e.g., student ID or other unique field)." }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to enroll student. An unexpected error occurred." }, { status: 500 });
  }
}

// GET handler to list students (from ManageStudentsPage - already there)
// If you need a dedicated API for just listing students, you can add it here too.
// For now, the ManageStudentsPage fetches directly.