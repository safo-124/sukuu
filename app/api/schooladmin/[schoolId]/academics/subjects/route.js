// File: app/api/schooladmin/[schoolId]/academics/subjects/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { subjectSchema } from "@/lib/validators/subjectValidators"; // Using one schema for create, can be split

// Helper function
async function isAuthorizedSchoolAdmin(userId, schoolId) {
  if (!userId || !schoolId) return false;
  const assignment = await prisma.schoolAdmin.findFirst({
      where: { userId: userId, schoolId: schoolId }
  });
  return !!assignment;
}

// GET handler to list all Subjects for a school
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

    const subjects = await prisma.subject.findMany({
      where: { schoolId: schoolId },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(subjects, { status: 200 });

  } catch (error) {
    console.error(`Error fetching subjects for school ${schoolId}:`, error);
    return NextResponse.json({ error: "Failed to fetch subjects." }, { status: 500 });
  }
}


// POST handler to create a new Subject for a specific school
export async function POST(req, { params }) {
  const { schoolId } = params;

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuperAdmin = session.user.role === 'SUPER_ADMIN';
    const authorizedSchoolAdmin = isSuperAdmin ? true : await isAuthorizedSchoolAdmin(session.user.id, schoolId);

    if (!authorizedSchoolAdmin) {
      return NextResponse.json({ error: "Forbidden: You are not authorized to add subjects to this school." }, { status: 403 });
    }

    const schoolExists = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!schoolExists) {
      return NextResponse.json({ error: "School not found." }, { status: 404 });
    }

    const requestBody = await req.json();
    const fieldsToClean = ['code', 'description'];
    fieldsToClean.forEach(field => {
      if (requestBody[field] === '') requestBody[field] = undefined;
    });
    
    const validationResult = subjectSchema.safeParse(requestBody); // Using subjectSchema for creation

    if (!validationResult.success) {
      console.error("Subject Creation Validation Errors:", validationResult.error.flatten().fieldErrors);
      return NextResponse.json(
        { error: "Validation failed. Please check the subject details.", fieldErrors: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check for duplicate subject name within the same school
    const existingSubjectByName = await prisma.subject.findUnique({
      where: { schoolId_name: { schoolId, name: data.name } }
    });
    if (existingSubjectByName) {
      return NextResponse.json(
        { error: "A subject with this name already exists in this school.", fieldErrors: { name: ["This subject name is already in use."] }},
        { status: 409 }
      );
    }

    // Check for duplicate subject code within the same school (if code is provided)
    if (data.code) {
      const existingSubjectByCode = await prisma.subject.findUnique({
        where: { schoolId_code: { schoolId, code: data.code } }
      });
      if (existingSubjectByCode) {
        return NextResponse.json(
          { error: "A subject with this code already exists in this school.", fieldErrors: { code: ["This subject code is already in use."] }},
          { status: 409 }
        );
      }
    }

    const newSubject = await prisma.subject.create({
      data: {
        name: data.name,
        code: data.code || null, // Store as null if undefined/empty
        description: data.description || null, // Store as null if undefined/empty
        schoolId: schoolId,
      },
    });

    return NextResponse.json(
      { message: `Subject "${newSubject.name}" created successfully!`, subject: newSubject },
      { status: 201 }
    );

  } catch (error) {
    console.error(`Error creating subject for school ${schoolId}:`, error);
    if (error.code === 'P2002') { // Unique constraint failed
      // This should be caught by the specific checks above, but as a fallback:
      const target = error.meta?.target || [];
      if (target.includes('name')) {
         return NextResponse.json({ error: "A subject with this name already exists.", fieldErrors: { name: ["This subject name is already in use."] }}, { status: 409 });
      }
      if (target.includes('code')) {
         return NextResponse.json({ error: "A subject with this code already exists.", fieldErrors: { code: ["This subject code is already in use."] }}, { status: 409 });
      }
      return NextResponse.json({ error: "A unique constraint was violated." }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create subject. An unexpected error occurred." }, { status: 500 });
  }
}