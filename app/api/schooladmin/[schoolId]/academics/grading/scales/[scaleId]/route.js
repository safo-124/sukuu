// File: app/api/schooladmin/[schoolId]/academics/grading/scales/[scaleId]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { gradeScaleSchema } from "@/lib/validators/gradeScaleValidators"; // Using the main schema for update

// Helper function
async function isAuthorizedSchoolAdmin(userId, schoolId) {
  if (!userId || !schoolId) return false;
  const assignment = await prisma.schoolAdmin.findFirst({
      where: { userId: userId, schoolId: schoolId }
  });
  return !!assignment;
}

// GET: Fetch a single GradeScale by its ID (for pre-filling edit form)
export async function GET(req, { params }) {
  const { schoolId, scaleId } = params;
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

    const gradeScale = await prisma.gradeScale.findFirst({
      where: { 
        id: scaleId,
        schoolId: schoolId 
      },
      // include: { entries: { orderBy: { minPercentage: 'asc' } } } // Optionally include entries
    });

    if (!gradeScale) {
      return NextResponse.json({ error: "Grade Scale not found." }, { status: 404 });
    }
    return NextResponse.json(gradeScale, { status: 200 });
  } catch (error) {
    console.error(`Error fetching grade scale ${scaleId}:`, error);
    return NextResponse.json({ error: "Failed to fetch grade scale details." }, { status: 500 });
  }
}

// PUT: Update a GradeScale's main details (name, description, isActive)
export async function PUT(req, { params }) {
  const { schoolId, scaleId } = params;
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

    const scaleToUpdate = await prisma.gradeScale.findFirst({
        where: { id: scaleId, schoolId: schoolId}
    });
    if (!scaleToUpdate) {
        return NextResponse.json({ error: "Grade Scale not found." }, { status: 404 });
    }

    const requestBody = await req.json();
    const dataToValidate = { ...requestBody };
    if (dataToValidate.description === "") dataToValidate.description = null;
    // isActive will be a boolean from the form

    // gradeScaleSchema can be used for update as well since fields are well-defined
    // If you want all fields to be optional for PUT, use a .partial() version of the schema.
    // For now, gradeScaleSchema expects name. Description & isActive are optional in Zod schema.
    const validationResult = gradeScaleSchema.safeParse(dataToValidate);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed.", fieldErrors: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const data = validationResult.data;

    // Prepare update payload (only fields that are part of gradeScaleSchema)
    const updatePayload = {
        name: data.name,
        description: data.description, // This can be null
        isActive: data.isActive === undefined ? scaleToUpdate.isActive : data.isActive,
    };

    // Uniqueness check for name if it's being changed
    if (updatePayload.name && updatePayload.name !== scaleToUpdate.name) {
        const existingScaleByName = await prisma.gradeScale.findFirst({
            where: { schoolId: schoolId, name: updatePayload.name, NOT: { id: scaleId }}
        });
        if (existingScaleByName) {
            return NextResponse.json({ error: "Another grade scale with this name already exists.", fieldErrors: {name: ["Name already in use."]}}, {status: 409});
        }
    }
    
    // If this scale is being set to active, deactivate others for this school
    if (updatePayload.isActive === true && !scaleToUpdate.isActive) { // Check if status actually changes to active
        await prisma.gradeScale.updateMany({
            where: { schoolId: schoolId, isActive: true, NOT: { id: scaleId } }, // Exclude current scale
            data: { isActive: false }
        });
    }


    const updatedGradeScale = await prisma.gradeScale.update({
      where: { id: scaleId },
      data: updatePayload,
    });
    return NextResponse.json({ message: "Grade Scale updated successfully.", gradeScale: updatedGradeScale }, { status: 200 });

  } catch (error) {
    console.error(`Error updating grade scale ${scaleId}:`, error);
    if (error.code === 'P2025') return NextResponse.json({ error: "Grade Scale not found for update." }, { status: 404 });
    if (error.code === 'P2002') return NextResponse.json({ error: "A grade scale with this name already exists.", fieldErrors: {name: ["Name already in use for this school."]}}, { status: 409 });
    return NextResponse.json({ error: "Failed to update grade scale." }, { status: 500 });
  }
}

// DELETE: Delete an entire GradeScale (and its entries due to cascade)
export async function DELETE(req, { params }) {
  const { schoolId, scaleId } = params;
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

    const gradeScaleToDelete = await prisma.gradeScale.findFirst({
        where: { id: scaleId, schoolId: schoolId },
        select: { name: true, isActive: true }
    });
    if (!gradeScaleToDelete) {
        return NextResponse.json({ error: "Grade Scale not found." }, { status: 404 });
    }

    // Prevent deleting an active grade scale without first deactivating or choosing another active one
    if (gradeScaleToDelete.isActive) {
        const activeScalesCount = await prisma.gradeScale.count({ where: { schoolId: schoolId, isActive: true }});
        if (activeScalesCount <= 1) { // If this is the only active scale
            return NextResponse.json({ error: "Cannot delete the only active grade scale. Please activate another scale first or deactivate this one." }, { status: 400 });
        }
    }

    // onDelete: Cascade on GradeScale.entries will delete all GradeScaleEntry records
    await prisma.gradeScale.delete({
      where: { id: scaleId },
    });
    return NextResponse.json({ message: `Grade Scale "${gradeScaleToDelete.name}" and its entries deleted successfully.` }, { status: 200 });

  } catch (error) {
    console.error(`Error deleting grade scale ${scaleId}:`, error);
    if (error.code === 'P2025') return NextResponse.json({ error: "Grade Scale not found." }, { status: 404 });
    // P2003 might occur if other models directly depend on GradeScale with Restrict rules
    if (error.code === 'P2003') return NextResponse.json({ error: "Cannot delete this grade scale due to other existing relations." }, { status: 409 });
    return NextResponse.json({ error: "Failed to delete grade scale." }, { status: 500 });
  }
}