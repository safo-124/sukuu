// File: app/api/schooladmin/[schoolId]/academics/classes/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { createClassSchema } from "@/lib/validators/classValidators";

// Helper function (can be shared)
async function isAuthorizedSchoolAdmin(userId, schoolId) {
  if (!userId || !schoolId) return false;
  const assignment = await prisma.schoolAdmin.findFirst({
      where: { userId: userId, schoolId: schoolId }
  });
  return !!assignment;
}

// POST handler to create a new Class for a specific school
export async function POST(req, { params }) {
  const { schoolId } = params;

  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized: No session found." }, { status: 401 });
    }

    const isSuperAdmin = session.user.role === 'SUPER_ADMIN';
    const authorizedSchoolAdmin = isSuperAdmin ? true : await isAuthorizedSchoolAdmin(session.user.id, schoolId);

    if (!authorizedSchoolAdmin) {
        return NextResponse.json({ error: "Forbidden: You are not authorized to manage classes for this school." }, { status: 403 });
    }

    const schoolExists = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!schoolExists) {
      return NextResponse.json({ error: "School not found." }, { status: 404 });
    }

    const requestBody = await req.json();
    
    const fieldsToClean = ['section', 'homeroomTeacherId'];
    fieldsToClean.forEach(field => {
      if (requestBody[field] === '') {
        requestBody[field] = undefined; // Zod .optional() works better with undefined
      }
    });
    
    const validationResult = createClassSchema.safeParse(requestBody);

    if (!validationResult.success) {
      console.error("Class Creation Validation Errors:", validationResult.error.flatten().fieldErrors);
      return NextResponse.json(
        { error: "Validation failed. Please check the class details.", fieldErrors: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check for duplicate class name + section within the same academic year for this school
    const existingClass = await prisma.class.findFirst({
      where: {
        schoolId: schoolId,
        name: data.name,
        section: data.section || null, // Prisma treats undefined and null differently in unique constraints
        academicYear: data.academicYear,
      }
    });

    if (existingClass) {
      return NextResponse.json(
        { error: `A class named "${data.name}${data.section ? ` (${data.section})` : ''}" already exists for the academic year ${data.academicYear}.`, 
          fieldErrors: { name: ["This class configuration already exists for the year."], section: ["This class configuration already exists for the year."] }
        },
        { status: 409 } // Conflict
      );
    }

    // Verify homeroomTeacherId if provided
    if (data.homeroomTeacherId) {
        const teacherExistsInSchool = await prisma.teacher.findFirst({
            where: { id: data.homeroomTeacherId, schoolId: schoolId }
        });
        if (!teacherExistsInSchool) {
            return NextResponse.json(
                { error: "Selected homeroom teacher does not belong to this school or does not exist.", fieldErrors: { homeroomTeacherId: ["Invalid teacher selection."] }},
                { status: 400 }
            );
        }
    }

    const newClass = await prisma.class.create({
      data: {
        ...data, // Spread validated data (name, section, academicYear, homeroomTeacherId)
        schoolId: schoolId,
        homeroomTeacherId: data.homeroomTeacherId || null, // Ensure null if empty/undefined
        section: data.section || null, // Ensure null if empty/undefined
      },
    });

    return NextResponse.json(
      { message: `Class "${newClass.name} ${newClass.section || ''}".trim() created successfully for ${newClass.academicYear}!`, class: newClass },
      { status: 201 }
    );

  } catch (error) {
    console.error(`Error creating class for school ${schoolId}:`, error);
    // P2002 can also be for other unique constraints if you add them
    return NextResponse.json({ error: "Failed to create class. An unexpected error occurred." }, { status: 500 });
  }
}

// GET handler (you might already have this in a different file or can add it here to list classes for the API)
// For now, ManageClassesPage fetches directly with Prisma.
// export async function GET(req, { params }) { /* ... */ }