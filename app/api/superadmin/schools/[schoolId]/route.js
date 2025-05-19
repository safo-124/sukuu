// File: app/api/superadmin/schools/[schoolId]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust path
import prisma from "@/lib/prisma";
import { createSchoolSchema } from "@/lib/validators/schoolValidators";

// GET a single school by ID (existing)
export async function GET(req, { params }) {
  const { schoolId } = params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }
    return NextResponse.json(school, { status: 200 });

  } catch (error) {
    console.error(`Error fetching school ${schoolId}:`, error);
    return NextResponse.json({ error: "Failed to fetch school details." }, { status: 500 });
  }
}

// PUT (Update) a school by ID (existing)
export async function PUT(req, { params }) {
  const { schoolId } = params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const schoolToUpdate = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!schoolToUpdate) {
        return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const requestBody = await req.json();
    const fieldsToClean = ['phoneNumber', 'address', 'city', 'stateOrRegion', 'country', 'postalCode', 'website', 'logoUrl', 'currentTerm'];
    fieldsToClean.forEach(field => {
      if (requestBody[field] === '') requestBody[field] = null;
    });
    if (requestBody.currentTerm === '') requestBody.currentTerm = null;

    const validationResult = createSchoolSchema.safeParse(requestBody); // Reusing for PUT

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed.", fieldErrors: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const data = validationResult.data;
    const updatedSchool = await prisma.school.update({
      where: { id: schoolId },
      data: {
        name: data.name,
        schoolEmail: data.schoolEmail,
        phoneNumber: data.phoneNumber,
        address: data.address,
        city: data.city,
        stateOrRegion: data.stateOrRegion,
        country: data.country,
        postalCode: data.postalCode,
        website: data.website,
        logoUrl: data.logoUrl,
        currentAcademicYear: data.currentAcademicYear,
        currentTerm: data.currentTerm,
        currency: data.currency.toUpperCase(),
        timezone: data.timezone,
        isActive: requestBody.isActive !== undefined ? requestBody.isActive : schoolToUpdate.isActive,
      },
    });
    return NextResponse.json({ message: `School "${updatedSchool.name}" updated successfully!`, school: updatedSchool }, { status: 200 });
  } catch (error) {
    console.error(`Error updating school ${schoolId}:`, error);
    if (error.code === 'P2002' && error.meta?.target?.includes('schoolEmail')) {
      return NextResponse.json(
        { error: "A school with this email already exists.", fieldErrors: { schoolEmail: ["This email is already registered by another school."] }}, 
        { status: 409 }
      );
    }
    if (error.code === 'P2025') {
        return NextResponse.json({ error: "School not found for update." }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update school." }, { status: 500 });
  }
}

// --- NEW DELETE Handler ---
export async function DELETE(req, { params }) {
  const { schoolId } = params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Optional: Check if this super admin is allowed to delete this specific school
    // For now, any super admin can delete any school.
    const schoolToDelete = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!schoolToDelete) {
        return NextResponse.json({ error: "School not found" }, { status: 404 });
    }
    // Example ownership check (if needed):
    // const userWithSuperAdminProfile = await prisma.user.findUnique({ where: { id: session.user.id }, include: { superAdmin: true } });
    // if (schoolToDelete.createdBySuperAdminId !== userWithSuperAdminProfile?.superAdmin?.id) {
    //   return NextResponse.json({ error: "Forbidden: You cannot delete this school" }, { status: 403 });
    // }

    // Important: Consider related data and onDelete cascade behavior in your Prisma schema.
    // If related records (students, teachers, classes, etc.) are set to Restrict deletion
    // and they exist, this delete will fail. You might need to handle this more gracefully
    // or ensure your schema's onDelete rules are appropriate (e.g., Cascade if deleting a school
    // should also delete all its associated data, or SetNull if appropriate).
    await prisma.school.delete({
      where: { id: schoolId },
    });

    // Revalidating paths like revalidatePath("/superadmin/schools")
    // cannot be directly done from an API route. Client needs to refresh/refetch.

    return NextResponse.json({ message: `School "${schoolToDelete.name}" deleted successfully.` }, { status: 200 }); // Or 204 No Content

  } catch (error) {
    console.error(`Error deleting school ${schoolId}:`, error);
    if (error.code === 'P2025') { // Record to delete not found
        return NextResponse.json({ error: "School not found for deletion." }, { status: 404 });
    }
    // Prisma's P2014 error code indicates a violation of a required relation, 
    // meaning other records depend on this school and `onDelete` is not `Cascade`.
    if (error.code === 'P2003' || error.code === 'P2014') { 
        return NextResponse.json({ error: "Cannot delete school. It has related records (e.g., students, classes). Please remove them first or adjust database cascade rules." }, { status: 409 }); // Conflict
    }
    return NextResponse.json({ error: "Failed to delete school. An unexpected error occurred." }, { status: 500 });
  }
}