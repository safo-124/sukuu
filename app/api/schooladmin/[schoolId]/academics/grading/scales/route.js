// File: app/api/schooladmin/[schoolId]/academics/grading/scales/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Ensure this path is correct
import prisma from "@/lib/prisma";
import { gradeScaleSchema } from "@/lib/validators/gradeScaleValidators"; // Ensure this path is correct

async function isAuthorizedSchoolAdmin(userId, schoolId) {
  if (!userId || !schoolId) return false;
  const assignment = await prisma.schoolAdmin.findFirst({
      where: { userId: userId, schoolId: schoolId }
  });
  return !!assignment;
}

// POST: Create a new GradeScale for the school
export async function POST(req, { params }) {
  const { schoolId } = params;
  console.log(`[API GRADE SCALE CREATE] School ID: ${schoolId}`);

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      console.error("[API GRADE SCALE CREATE] Unauthorized: No session found.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log(`[API GRADE SCALE CREATE] User: ${session.user.email}, Role: ${session.user.role}`);

    const isSuperAdmin = session.user.role === 'SUPER_ADMIN';
    const authorizedSchoolAdmin = isSuperAdmin ? true : await isAuthorizedSchoolAdmin(session.user.id, schoolId);

    if (!authorizedSchoolAdmin) {
      console.error(`[API GRADE SCALE CREATE] Forbidden: User ${session.user.email} for school ${schoolId}.`);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const schoolExists = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!schoolExists) {
      console.error(`[API GRADE SCALE CREATE] School not found: ${schoolId}`);
      return NextResponse.json({ error: "School not found." }, { status: 404 });
    }
    console.log("[API GRADE SCALE CREATE] School found:", schoolExists.name);

    const requestBody = await req.json();
    console.log("[API GRADE SCALE CREATE] Request body:", requestBody);
    
    // Clean optional text fields that Zod might treat as required if empty string
    const dataToValidate = { ...requestBody };
    if (dataToValidate.description === "") {
      dataToValidate.description = undefined; // Zod .optional() handles undefined better than empty string
    }
    // isActive is boolean, should be fine. Zod schema has .optional()

    const validationResult = gradeScaleSchema.safeParse(dataToValidate);

    if (!validationResult.success) {
      console.error("[API GRADE SCALE CREATE] Validation Errors:", JSON.stringify(validationResult.error.flatten().fieldErrors, null, 2));
      return NextResponse.json(
        { error: "Validation failed.", fieldErrors: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    
    const data = validationResult.data;
    console.log("[API GRADE SCALE CREATE] Validated data:", data);

    // If isActive is being set to true, deactivate other scales for this school
    if (data.isActive === true) {
      console.log(`[API GRADE SCALE CREATE] Setting other scales to inactive for school ${schoolId}`);
      await prisma.gradeScale.updateMany({
          where: { schoolId: schoolId, isActive: true },
          data: { isActive: false }
      });
      console.log("[API GRADE SCALE CREATE] Other scales deactivated.");
    }

    console.log("[API GRADE SCALE CREATE] Creating new grade scale with data:", {
        ...data,
        isActive: data.isActive === undefined ? false : data.isActive,
        schoolId: schoolId,
    });

    const newGradeScale = await prisma.gradeScale.create({
      data: {
        name: data.name,
        description: data.description, // Prisma handles undefined as "don't set" for optional fields
        isActive: data.isActive === undefined ? false : data.isActive, // Default to false if not explicitly provided
        schoolId: schoolId,
      },
    });
    console.log("[API GRADE SCALE CREATE] Grade Scale created successfully:", newGradeScale);

    return NextResponse.json({ message: "Grade Scale created successfully.", gradeScale: newGradeScale }, { status: 201 });

  } catch (error) {
    console.error("[API GRADE SCALE CREATE] CRITICAL ERROR:", error);
    console.error("[API GRADE SCALE CREATE] Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));

    if (error.code === 'P2002' && error.meta?.target?.includes('name') && error.meta?.target?.includes('schoolId')) { // Unique constraint on name within school
        return NextResponse.json({ error: "A grade scale with this name already exists for this school.", fieldErrors: {name: ["Name already in use for this school."]}}, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create grade scale. An unexpected server error occurred.", detailedError: error.message }, { status: 500 });
  }
}

// GET handler to list all GradeScales for the school (from previous step)
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

    const gradeScales = await prisma.gradeScale.findMany({
      where: { schoolId: schoolId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { entries: true } } }
    });
    return NextResponse.json(gradeScales, { status: 200 });
  } catch (error) {
    console.error(`[API GRADE SCALE GET] Error fetching grade scales for school ${schoolId}:`, error);
    return NextResponse.json({ error: "Failed to fetch grade scales." }, { status: 500 });
  }
}