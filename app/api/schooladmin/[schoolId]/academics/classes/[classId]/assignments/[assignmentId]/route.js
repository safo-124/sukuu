// File: app/api/schooladmin/[schoolId]/academics/classes/[classId]/assignments/[assignmentId]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { updateClassSubjectAssignmentSchema } from "@/lib/validators/classSubjectAssignmentValidators";

// Helper function for authorization and fetching the specific assignment
async function authorizeAndGetAssignment(userId, userRole, schoolId, classId, assignmentId) {
    const isSuperAdmin = userRole === 'SUPER_ADMIN';
    let authorizedSchoolAdmin = isSuperAdmin;

    if (!isSuperAdmin && userId) {
        const adminAssignment = await prisma.schoolAdmin.findFirst({
            where: { userId: userId, schoolId: schoolId }
        });
        authorizedSchoolAdmin = !!adminAssignment;
    }
    if (!authorizedSchoolAdmin) return { error: "Forbidden", status: 403, assignment: null };

    const assignment = await prisma.classSubjectAssignment.findFirst({
        where: { 
            id: assignmentId, 
            classId: classId,
            class: { schoolId: schoolId } // Ensure it's part of the correct school's class
        }
    });
    if (!assignment) return { error: "Subject assignment not found.", status: 404, assignment: null };
    
    return { error: null, status: 200, assignment };
}


// PUT: Update a specific ClassSubjectAssignment (e.g., change teacher)
export async function PUT(req, { params }) {
  const { schoolId, classId, assignmentId } = params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authResult = await authorizeAndGetAssignment(session.user.id, session.user.role, schoolId, classId, assignmentId);
    if (authResult.error || !authResult.assignment) { // Ensure assignment was found by auth helper
        return NextResponse.json({ error: authResult.error || "Assignment not found." }, { status: authResult.status || 404 });
    }

    const requestBody = await req.json();
    const dataToValidate = { ...requestBody };
    if (dataToValidate.teacherId === "") dataToValidate.teacherId = null; // Allow unassigning teacher explicitly

    const validationResult = updateClassSubjectAssignmentSchema.safeParse(dataToValidate);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed.", fieldErrors: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { teacherId } = validationResult.data; // Only teacherId is updatable via this schema

    // Verify teacherId (if provided) belongs to the school
    if (teacherId) {
        const teacherExists = await prisma.teacher.findFirst({ where: { id: teacherId, schoolId: schoolId }});
        if (!teacherExists) {
            return NextResponse.json({ error: "Selected teacher not found in this school.", fieldErrors: { teacherId: ["Invalid teacher."] }}, { status: 400 });
        }
    }
    
    // ClassId, SubjectId, AcademicYear are NOT updated here. If they need to change, it's a new assignment.
    const updatedAssignment = await prisma.classSubjectAssignment.update({
      where: { id: assignmentId },
      data: {
        teacherId: teacherId, // This can be null if unassigning
      },
      include: { // Include related data in the response
        subject: { select: { id: true, name: true, code: true } },
        teacher: { include: { user: { select: { id:true, firstName: true, lastName: true } } } },
      }
    });
    return NextResponse.json({ message: "Subject assignment updated successfully.", assignment: updatedAssignment }, { status: 200 });

  } catch (error) {
    console.error(`Error updating subject assignment ${assignmentId}:`, error);
    if (error.code === 'P2025') return NextResponse.json({ error: "Assignment not found for update." }, { status: 404 });
    return NextResponse.json({ error: "Failed to update subject assignment." }, { status: 500 });
  }
}

// DELETE: Delete a specific ClassSubjectAssignment
export async function DELETE(req, { params }) {
  const { schoolId, classId, assignmentId } = params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authResult = await authorizeAndGetAssignment(session.user.id, session.user.role, schoolId, classId, assignmentId);
    if (authResult.error) { // Also checks if assignment exists
        return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    await prisma.classSubjectAssignment.delete({
      where: { id: assignmentId },
    });
    return NextResponse.json({ message: "Subject assignment removed successfully." }, { status: 200 }); // Or 204

  } catch (error) {
    console.error(`Error deleting subject assignment ${assignmentId}:`, error);
    if (error.code === 'P2025') return NextResponse.json({ error: "Assignment not found for deletion." }, { status: 404 });
    // P2003 could happen if other models directly depend on ClassSubjectAssignment with Restrict rules
    if (error.code === 'P2003') return NextResponse.json({ error: "Cannot delete this assignment due to existing relations." }, { status: 409 });
    return NextResponse.json({ error: "Failed to delete subject assignment." }, { status: 500 });
  }
}