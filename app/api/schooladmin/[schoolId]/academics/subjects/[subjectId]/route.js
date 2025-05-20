// File: app/api/schooladmin/[schoolId]/academics/subjects/[subjectId]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { updateSubjectSchema } from "@/lib/validators/subjectValidators"; // Use the update schema

// Helper function
async function isAuthorizedSchoolAdmin(userId, schoolId) {
  if (!userId || !schoolId) return false;
  const assignment = await prisma.schoolAdmin.findFirst({
      where: { userId: userId, schoolId: schoolId }
  });
  return !!assignment;
}

// GET handler to fetch a single subject by its ID
export async function GET(req, { params }) {
  const { schoolId, subjectId } = params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuperAdmin = session.user.role === 'SUPER_ADMIN';
    const authorizedSchoolAdmin = isSuperAdmin ? true : await isAuthorizedSchoolAdmin(session.user.id, schoolId);

    if (!authorizedSchoolAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const subject = await prisma.subject.findFirst({
      where: { 
        id: subjectId,
        schoolId: schoolId // Ensure subject belongs to the school
      }
    });

    if (!subject) {
      return NextResponse.json({ error: "Subject not found in this school." }, { status: 404 });
    }
    return NextResponse.json(subject, { status: 200 });

  } catch (error) {
    console.error(`Error fetching subject ${subjectId} for school ${schoolId}:`, error);
    return NextResponse.json({ error: "Failed to fetch subject details." }, { status: 500 });
  }
}


// PUT handler to update a Subject
export async function PUT(req, { params }) {
  const { schoolId, subjectId } = params;

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuperAdmin = session.user.role === 'SUPER_ADMIN';
    const authorizedSchoolAdmin = isSuperAdmin ? true : await isAuthorizedSchoolAdmin(session.user.id, schoolId);

    if (!authorizedSchoolAdmin) {
      return NextResponse.json({ error: "Forbidden: You are not authorized to edit subjects for this school." }, { status: 403 });
    }

    const subjectToUpdate = await prisma.subject.findFirst({
        where: { id: subjectId, schoolId: schoolId }
    });
    if (!subjectToUpdate) {
        return NextResponse.json({ error: "Subject not found or does not belong to this school." }, { status: 404 });
    }

    const requestBody = await req.json();
    const dataToValidate = { ...requestBody };
    // Convert empty strings for optional fields to undefined for Zod's .optional()
    if (dataToValidate.code === "") dataToValidate.code = undefined;
    if (dataToValidate.description === "") dataToValidate.description = undefined;
    
    const validationResult = updateSubjectSchema.safeParse(dataToValidate); // updateSubjectSchema is subjectSchema.partial()

    if (!validationResult.success) {
      console.error("Subject Update Validation Errors:", validationResult.error.flatten().fieldErrors);
      return NextResponse.json(
        { error: "Validation failed. Please check the subject details.", fieldErrors: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validationResult.data; // Contains only fields defined in updateSubjectSchema (all optional)

    // Prepare data for Prisma update, only including fields that were actually provided
    const updatePayload = {};
    if (data.name !== undefined && data.name !== subjectToUpdate.name) {
      // Check for duplicate subject name if it's being changed
      const existingSubjectByName = await prisma.subject.findFirst({
        where: { schoolId, name: data.name, NOT: { id: subjectId } }
      });
      if (existingSubjectByName) {
        return NextResponse.json({ error: "Another subject with this name already exists.", fieldErrors: { name: ["This name is already in use."] }}, { status: 409 });
      }
      updatePayload.name = data.name;
    }

    if (data.code !== undefined && data.code !== subjectToUpdate.code) {
      // Check for duplicate subject code if it's being changed (and is not empty)
      if (data.code && data.code.trim() !== "") {
        const existingSubjectByCode = await prisma.subject.findFirst({
            where: { schoolId, code: data.code, NOT: { id: subjectId } }
        });
        if (existingSubjectByCode) {
            return NextResponse.json({ error: "Another subject with this code already exists.", fieldErrors: { code: ["This code is already in use."] }}, { status: 409 });
        }
        updatePayload.code = data.code;
      } else { // Code is being cleared
        updatePayload.code = null;
      }
    } else if (data.code === "") { // Explicitly clearing the code
        updatePayload.code = null;
    }


    if (data.description !== undefined) {
      updatePayload.description = data.description === "" ? null : data.description;
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ message: "No changes provided.", subject: subjectToUpdate }, { status: 200 });
    }

    const updatedSubject = await prisma.subject.update({
      where: { id: subjectId },
      data: updatePayload,
    });

    return NextResponse.json(
      { message: `Subject "${updatedSubject.name}" updated successfully!`, subject: updatedSubject },
      { status: 200 }
    );

  } catch (error) {
    console.error(`Error updating subject ${subjectId} for school ${schoolId}:`, error);
    if (error.code === 'P2025') { // Record to update not found
        return NextResponse.json({ error: "Subject not found for update." }, { status: 404 });
    }
    if (error.code === 'P2002') { // Unique constraint violation
      const target = error.meta?.target || [];
      if (target.includes('name')) return NextResponse.json({ error: "Another subject with this name already exists.", fieldErrors: { name: ["This name is already in use."] }}, { status: 409 });
      if (target.includes('code')) return NextResponse.json({ error: "Another subject with this code already exists.", fieldErrors: { code: ["This code is already in use."] }}, { status: 409 });
      return NextResponse.json({ error: "A unique constraint was violated during update." }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to update subject details.", detailedError: error.message }, { status: 500 });
  }
}

// DELETE handler for subjects
export async function DELETE(req, { params }) {
  const { schoolId, subjectId } = params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuperAdmin = session.user.role === 'SUPER_ADMIN';
    const authorizedSchoolAdmin = isSuperAdmin ? true : await isAuthorizedSchoolAdmin(session.user.id, schoolId);
    if (!authorizedSchoolAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const subjectToDelete = await prisma.subject.findUnique({
        where: { id: subjectId, schoolId: schoolId }, // Ensure it belongs to the school
        select: { name: true }
    });
    if (!subjectToDelete) {
        return NextResponse.json({ error: "Subject not found." }, { status: 404 });
    }

    // IMPORTANT: Check for relations before deleting (e.g., if subject is in timetables, assignments, grades)
    // Example: Check if subject is used in any TimetableSlot
    const timetableSlots = await prisma.timetableSlot.count({ where: { subjectId: subjectId }});
    if (timetableSlots > 0) {
        return NextResponse.json({ error: `Cannot delete subject "${subjectToDelete.name}". It is currently assigned to ${timetableSlots} timetable slot(s). Please remove these assignments first.` }, { status: 409 });
    }
    // Add similar checks for Assignments, StudentGrades, etc.

    await prisma.subject.delete({ where: { id: subjectId } });
    return NextResponse.json({ message: `Subject "${subjectToDelete.name}" deleted successfully.` }, { status: 200 });

  } catch (error) {
    console.error(`Error deleting subject ${subjectId}:`, error);
    if (error.code === 'P2025') { return NextResponse.json({ error: "Subject not found." }, { status: 404 }); }
    // P2003: Foreign key constraint failed (e.g. subject still linked somewhere and onDelete is Restrict)
    if (error.code === 'P2003') { 
        return NextResponse.json({ error: "Cannot delete subject due to existing relations that prevent deletion. Please remove these relations first." }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to delete subject." }, { status: 500 });
  }
}