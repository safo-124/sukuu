// File: app/api/schooladmin/[schoolId]/academic-settings/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { academicSessionSettingsSchema } from "@/lib/validators/schoolSettingsValidators"; // Adjust path

async function isAuthorizedSchoolAdmin(userId, schoolId) {
  if (!userId || !schoolId) return false;
  const assignment = await prisma.schoolAdmin.findFirst({
      where: { userId: userId, schoolId: schoolId }
  });
  return !!assignment;
}

// GET handler to fetch current academic settings for the school
export async function GET(req, { params }) {
  const { schoolId } = params;
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

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { currentAcademicYear: true, currentTerm: true, name: true }
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }
    return NextResponse.json({ 
        currentAcademicYear: school.currentAcademicYear, 
        currentTerm: school.currentTerm,
        schoolName: school.name 
    }, { status: 200 });

  } catch (error) {
    console.error(`Error fetching academic settings for school ${schoolId}:`, error);
    return NextResponse.json({ error: "Failed to fetch academic settings." }, { status: 500 });
  }
}

// PUT handler to update academic settings for the school
export async function PUT(req, { params }) {
  const { schoolId } = params;
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

    const schoolToUpdate = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!schoolToUpdate) {
      return NextResponse.json({ error: "School not found." }, { status: 404 });
    }

    const requestBody = await req.json();
    const validationResult = academicSessionSettingsSchema.safeParse(requestBody);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed.", fieldErrors: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { currentAcademicYear, currentTerm } = validationResult.data;

    const updatedSchool = await prisma.school.update({
      where: { id: schoolId },
      data: {
        currentAcademicYear: currentAcademicYear,
        currentTerm: currentTerm || null, // Set to null if currentTerm is empty/undefined from form
      },
      select: { currentAcademicYear: true, currentTerm: true, name: true } // Return updated values
    });

    return NextResponse.json(
      { message: `Academic settings for ${updatedSchool.name} updated successfully.`, settings: updatedSchool },
      { status: 200 }
    );

  } catch (error) {
    console.error(`Error updating academic settings for school ${schoolId}:`, error);
    return NextResponse.json({ error: "Failed to update academic settings." }, { status: 500 });
  }
}