// File: app/api/superadmin/schools/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust path if your authOptions are elsewhere
import prisma from "@/lib/prisma";
import { createSchoolSchema } from "@/lib/validators/schoolValidators";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const superAdminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { superAdmin: true }
    });

    if (!superAdminUser?.superAdmin) {
      return NextResponse.json({ error: "Forbidden: Super Admin profile not found." }, { status: 403 });
    }

    const requestBody = await req.json();
    
    // Convert optional empty strings to undefined for Zod validation
    const fieldsToClean = ['phoneNumber', 'address', 'city', 'stateOrRegion', 'country', 'postalCode', 'website', 'logoUrl', 'currentTerm'];
    fieldsToClean.forEach(field => {
      if (requestBody[field] === '') {
        requestBody[field] = undefined;
      }
    });

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

    const newSchool = await prisma.school.create({
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
        isActive: true,
        createdBySuperAdminId: superAdminUser.superAdmin.id,
      },
    });

    // Note: Revalidating paths like revalidatePath("/superadmin/schools")
    // cannot be directly done from an API route in the same way as a Server Action.
    // The client will typically handle navigation or re-fetching after a successful POST.

    return NextResponse.json({ message: `School "${newSchool.name}" created successfully!`, school: newSchool }, { status: 201 });

  } catch (error) {
    console.error("Error creating school (API):", error);
    if (error.code === 'P2002' && error.meta?.target?.includes('schoolEmail')) {
      return NextResponse.json(
        { 
          error: "A school with this email already exists.",
          fieldErrors: { schoolEmail: ["This email is already registered."] }
        }, 
        { status: 409 } // 409 Conflict is appropriate here
      );
    }
    return NextResponse.json({ error: "Failed to create school. An unexpected error occurred." }, { status: 500 });
  }
}

// You can add a GET handler here later if you want to list schools via this API route as well,
// though typically fetching data for display in Server Components is done directly with Prisma.
// export async function GET(req) { ... }