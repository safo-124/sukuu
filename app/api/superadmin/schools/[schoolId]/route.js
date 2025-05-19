// File: app/api/superadmin/schools/[schoolId]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust path
import prisma from "@/lib/prisma";
import { createSchoolSchema } from "@/lib/validators/schoolValidators"; // Re-using for PUT

// GET a single school by ID
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
    
    // Optional: Ensure the Super Admin can only fetch schools they created if that's a requirement
    // const userWithSuperAdminProfile = await prisma.user.findUnique({ where: { id: session.user.id }, include: { superAdmin: true } });
    // if (school.createdBySuperAdminId !== userWithSuperAdminProfile?.superAdmin?.id) {
    //   return NextResponse.json({ error: "Forbidden: You did not create this school" }, { status: 403 });
    // }

    return NextResponse.json(school, { status: 200 });

  } catch (error) {
    console.error(`Error fetching school ${schoolId}:`, error);
    return NextResponse.json({ error: "Failed to fetch school details." }, { status: 500 });
  }
}


// PUT (Update) a school by ID
export async function PUT(req, { params }) {
  const { schoolId } = params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Optional: Check if this super admin is allowed to edit this specific school
    // For now, any super admin can edit any school.
    const schoolToUpdate = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!schoolToUpdate) {
        return NextResponse.json({ error: "School not found" }, { status: 404 });
    }
    // Example ownership check (if needed):
    // const userWithSuperAdminProfile = await prisma.user.findUnique({ where: { id: session.user.id }, include: { superAdmin: true } });
    // if (schoolToUpdate.createdBySuperAdminId !== userWithSuperAdminProfile?.superAdmin?.id) {
    //   return NextResponse.json({ error: "Forbidden: You cannot edit this school" }, { status: 403 });
    // }

    const requestBody = await req.json();

    const fieldsToClean = ['phoneNumber', 'address', 'city', 'stateOrRegion', 'country', 'postalCode', 'website', 'logoUrl', 'currentTerm'];
    fieldsToClean.forEach(field => {
      if (requestBody[field] === '') {
        requestBody[field] = null; // For PUT, null can mean "clear this optional field"
      } else if (requestBody[field] === undefined) {
        // If a field is not sent at all, Prisma update won't touch it unless it's in `data`
        // For PUT, typically all editable fields are sent.
      }
    });
    // For currentTerm, if it's an empty string, make it null to clear it, or undefined to not update it.
    if (requestBody.currentTerm === '') requestBody.currentTerm = null;


    // We use createSchoolSchema for validation, assuming the form submits all editable fields.
    // For a PATCH, you would use a schema with .partial()
    const validationResult = createSchoolSchema.safeParse(requestBody);

    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: "Validation failed. Please check the provided data.",
          fieldErrors: validationResult.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    const updatedSchool = await prisma.school.update({
      where: { id: schoolId },
      data: {
        name: data.name,
        schoolEmail: data.schoolEmail, // Be cautious if this is used as an immutable ID elsewhere
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
        isActive: requestBody.isActive !== undefined ? requestBody.isActive : schoolToUpdate.isActive, // Allow updating isActive
        // createdBySuperAdminId should not be changed on update
      },
    });

    return NextResponse.json({ message: `School "${updatedSchool.name}" updated successfully!`, school: updatedSchool }, { status: 200 });

  } catch (error) {
    console.error(`Error updating school ${schoolId}:`, error);
    if (error.code === 'P2002' && error.meta?.target?.includes('schoolEmail')) {
      return NextResponse.json(
        { 
          error: "A school with this email already exists.",
          fieldErrors: { schoolEmail: ["This email is already registered by another school."] }
        }, 
        { status: 409 } // Conflict
      );
    }
    if (error.code === 'P2025') { // Record to update not found
        return NextResponse.json({ error: "School not found for update." }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update school. An unexpected error occurred." }, { status: 500 });
  }
}

// DELETE a school by ID - (Implement later)
// export async function DELETE(req, { params }) { ... }