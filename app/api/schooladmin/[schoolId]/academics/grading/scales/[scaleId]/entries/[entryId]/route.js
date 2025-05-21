// File: app/api/schooladmin/[schoolId]/academics/grading/scales/[scaleId]/entries/[entryId]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { gradeScaleEntrySchema } from "@/lib/validators/gradeScaleValidators"; // Re-use for update

async function authorizeAdminAndGetScaleEntry(userId, userRole, schoolId, scaleId, entryId) {
    const isSuperAdmin = userRole === 'SUPER_ADMIN';
    let authorizedSchoolAdmin = isSuperAdmin;

    if (!isSuperAdmin && userId) {
        const assignment = await prisma.schoolAdmin.findFirst({
            where: { userId: userId, schoolId: schoolId }
        });
        authorizedSchoolAdmin = !!assignment;
    }
    if (!authorizedSchoolAdmin) return { error: "Forbidden", status: 403, entry: null };

    const entry = await prisma.gradeScaleEntry.findFirst({
        where: { 
            id: entryId, 
            gradeScaleId: scaleId,
            gradeScale: { schoolId: schoolId } // Ensure it's part of the correct school's scale
        }
    });
    if (!entry) return { error: "Grade Scale Entry not found or does not belong to this scale/school.", status: 404, entry: null };
    
    return { error: null, status: 200, entry };
}

// PUT: Update a specific GradeScaleEntry
export async function PUT(req, { params }) {
  const { schoolId, scaleId, entryId } = params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authResult = await authorizeAdminAndGetScaleEntry(session.user.id, session.user.role, schoolId, scaleId, entryId);
    if (authResult.error || !authResult.entry) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const existingEntryToUpdate = authResult.entry;

    const requestBody = await req.json();
    if (requestBody.remark === "") requestBody.remark = null; // Explicitly set empty remark to null
    if (requestBody.gradePoint === "" || requestBody.gradePoint === null) requestBody.gradePoint = null; // Explicitly set empty gradePoint to null

    // For update, all fields are typically optional in the payload
    // Use .partial() or a specific update schema if only subset of fields allowed
    const validationResult = gradeScaleEntrySchema.partial().safeParse(requestBody); // Use partial for updates

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed.", fieldErrors: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const data = validationResult.data;

    // Prepare update payload, only include fields that are actually present in 'data'
    const updatePayload = {};
    if ('minPercentage' in data) updatePayload.minPercentage = data.minPercentage;
    if ('maxPercentage' in data) updatePayload.maxPercentage = data.maxPercentage;
    if ('gradeLetter' in data) updatePayload.gradeLetter = data.gradeLetter;
    if ('gradePoint' in data) updatePayload.gradePoint = data.gradePoint; // Can be null
    if ('remark' in data) updatePayload.remark = data.remark; // Can be null

    // Additional check for overlapping ranges, excluding the current entry being edited
    if ('minPercentage' in updatePayload || 'maxPercentage' in updatePayload) {
        const checkMin = updatePayload.minPercentage ?? existingEntryToUpdate.minPercentage;
        const checkMax = updatePayload.maxPercentage ?? existingEntryToUpdate.maxPercentage;

        const existingEntries = await prisma.gradeScaleEntry.findMany({
            where: { gradeScaleId: scaleId, NOT: { id: entryId } } // Exclude current entry
        });
        const overlap = existingEntries.some(entry => 
            (checkMin <= entry.maxPercentage && checkMax >= entry.minPercentage)
        );
        if (overlap) {
            return NextResponse.json({ error: "Percentage range overlaps with another entry in this scale.", fieldErrors: {minPercentage: ["Range overlap."], maxPercentage: ["Range overlap."]} }, { status: 409 });
        }
    }


    if (Object.keys(updatePayload).length === 0) {
        return NextResponse.json({ message: "No changes provided.", entry: existingEntryToUpdate }, {status: 200 });
    }

    const updatedEntry = await prisma.gradeScaleEntry.update({
      where: { id: entryId },
      data: updatePayload,
    });
    return NextResponse.json({ message: "Grade scale entry updated successfully.", entry: updatedEntry }, { status: 200 });

  } catch (error) {
    console.error(`Error updating grade scale entry ${entryId}:`, error);
    if (error.code === 'P2025') return NextResponse.json({ error: "Entry not found for update." }, { status: 404 });
    return NextResponse.json({ error: "Failed to update grade scale entry." }, { status: 500 });
  }
}

// DELETE: Delete a specific GradeScaleEntry
export async function DELETE(req, { params }) {
  const { schoolId, scaleId, entryId } = params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authResult = await authorizeAdminAndGetScaleEntry(session.user.id, session.user.role, schoolId, scaleId, entryId);
    if (authResult.error) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    await prisma.gradeScaleEntry.delete({
      where: { id: entryId },
    });
    return NextResponse.json({ message: "Grade scale entry deleted successfully." }, { status: 200 }); // Or 204

  } catch (error) {
    console.error(`Error deleting grade scale entry ${entryId}:`, error);
    if (error.code === 'P2025') return NextResponse.json({ error: "Entry not found for deletion." }, { status: 404 });
    return NextResponse.json({ error: "Failed to delete grade scale entry." }, { status: 500 });
  }
}