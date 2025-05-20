// File: app/api/schooladmin/[schoolId]/students/[studentId]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust path
import prisma from "@/lib/prisma";
import * as z from "zod";

// Helper function to check if the logged-in user is an authorized admin for this school
async function isAuthorizedSchoolAdmin(userId, schoolId) {
    if (!userId || !schoolId) return false;
    const schoolAdminAssignment = await prisma.schoolAdmin.findFirst({
        where: {
            userId: userId,
            schoolId: schoolId,
        }
    });
    return !!schoolAdminAssignment;
}

// Zod schema for updating isActive status
const updateStudentStatusSchema = z.object({
  isActive: z.boolean(),
});

// PUT handler to update student status (isActive)
export async function PUT(req, { params }) {
  const { schoolId, studentId } = params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Authorize: Check if user is SCHOOL_ADMIN for this school OR SUPER_ADMIN
    const isSchoolAdminForThisSchool = await isAuthorizedSchoolAdmin(session.user.id, schoolId);
    if (session.user.role !== 'SUPER_ADMIN' && !isSchoolAdminForThisSchool) {
        return NextResponse.json({ error: "Forbidden: You are not authorized to manage this school's students." }, { status: 403 });
    }

    const requestBody = await req.json();
    const validationResult = updateStudentStatusSchema.safeParse(requestBody);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed.", fieldErrors: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { isActive } = validationResult.data;

    // Ensure student exists and belongs to the school
    const studentToUpdate = await prisma.student.findFirst({
        where: { id: studentId, schoolId: schoolId }
    });

    if (!studentToUpdate) {
        return NextResponse.json({ error: "Student not found in this school." }, { status: 404 });
    }

    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: { isActive },
    });

    return NextResponse.json(
      { message: `Student "${updatedStudent.firstName} ${updatedStudent.lastName}" status updated to ${isActive ? 'Active' : 'Inactive'}.`, student: updatedStudent },
      { status: 200 }
    );

  } catch (error) {
    console.error(`Error updating student ${studentId} in school ${schoolId}:`, error);
    if (error.code === 'P2025') { // Record to update not found by prisma.student.update
        return NextResponse.json({ error: "Student not found for update." }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update student status." }, { status: 500 });
  }
}


// DELETE handler to permanently delete a student
export async function DELETE(req, { params }) {
  const { schoolId, studentId } = params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Authorize: Check if user is SCHOOL_ADMIN for this school OR SUPER_ADMIN
    const isSchoolAdminForThisSchool = await isAuthorizedSchoolAdmin(session.user.id, schoolId);
    if (session.user.role !== 'SUPER_ADMIN' && !isSchoolAdminForThisSchool) {
        return NextResponse.json({ error: "Forbidden: You are not authorized to delete students from this school." }, { status: 403 });
    }

    // Ensure student exists and belongs to the school before attempting delete
    const studentToDelete = await prisma.student.findFirst({
        where: { id: studentId, schoolId: schoolId },
        select: { firstName: true, lastName: true } // For the success message
    });

    if (!studentToDelete) {
        return NextResponse.json({ error: "Student not found in this school for deletion." }, { status: 404 });
    }
    
    // Important: Consider onDelete cascade rules in your Prisma schema.
    // Deleting a student might cascade to delete their grades, attendance, etc.
    await prisma.student.delete({
      where: { id: studentId },
    });

    const studentName = `${studentToDelete.firstName} ${studentToDelete.lastName}`;
    return NextResponse.json({ message: `Student "${studentName}" permanently deleted successfully.` }, { status: 200 }); // Or 204 No Content

  } catch (error) {
    console.error(`Error deleting student ${studentId} from school ${schoolId}:`, error);
    if (error.code === 'P2025') { // Record to delete not found
        return NextResponse.json({ error: "Student not found for deletion." }, { status: 404 });
    }
    // Prisma's P2003 error: Foreign key constraint failed on the field
    // This means other records depend on this student and onDelete is not Cascade
    if (error.code === 'P2003') { 
        return NextResponse.json({ error: "Cannot delete student. They have related records (e.g., grades, attendance). Please remove them first or adjust database cascade rules." }, { status: 409 }); // Conflict
    }
    return NextResponse.json({ error: "Failed to delete student." }, { status: 500 });
  }
}

// You can also add a GET handler here to fetch a single student's details if needed for a view/edit page.
// export async function GET(req, { params }) { ... }