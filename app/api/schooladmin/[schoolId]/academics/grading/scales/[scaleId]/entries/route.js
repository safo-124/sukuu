// File: app/api/schooladmin/[schoolId]/academics/grading/scales/[scaleId]/entries/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { gradeScaleEntrySchema } from "@/lib/validators/gradeScaleValidators";

async function authorizeAdminAndGetScale(userId, userRole, schoolId, scaleId) {
  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  let authorizedSchoolAdmin = isSuperAdmin;

  if (!isSuperAdmin && userId) {
    const assignment = await prisma.schoolAdmin.findFirst({
        where: { userId: userId, schoolId: schoolId }
    });
    authorizedSchoolAdmin = !!assignment;
  }
  if (!authorizedSchoolAdmin) return { error: "Forbidden", status: 403, gradeScale: null };

  const gradeScale = await prisma.gradeScale.findFirst({
    where: { id: scaleId, schoolId: schoolId }
  });
  if (!gradeScale) return { error: "Grade Scale not found for this school.", status: 404, gradeScale: null };
  
  return { error: null, status: 200, gradeScale };
}

// GET: List all GradeScaleEntries for a specific GradeScale
export async function GET(req, { params }) {
  const { schoolId, scaleId } = params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authResult = await authorizeAdminAndGetScale(session.user.id, session.user.role, schoolId, scaleId);
    if (authResult.error) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const entries = await prisma.gradeScaleEntry.findMany({
      where: { gradeScaleId: scaleId },
      orderBy: { minPercentage: 'asc' }, // Order by min percentage
    });
    return NextResponse.json(entries, { status: 200 });

  } catch (error) {
    console.error(`Error fetching grade scale entries for scale ${scaleId}:`, error);
    return NextResponse.json({ error: "Failed to fetch grade scale entries." }, { status: 500 });
  }
}

// POST: Add a new GradeScaleEntry to a specific GradeScale
export async function POST(req, { params }) {
  const { schoolId, scaleId } = params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authResult = await authorizeAdminAndGetScale(session.user.id, session.user.role, schoolId, scaleId);
    if (authResult.error) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const requestBody = await req.json();
    // Clean optional text fields
    if (requestBody.remark === "") requestBody.remark = undefined;
    if (requestBody.gradePoint === "" || requestBody.gradePoint === null) requestBody.gradePoint = undefined;


    const validationResult = gradeScaleEntrySchema.safeParse(requestBody);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed.", fieldErrors: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const data = validationResult.data;

    // Additional check for overlapping ranges within this GradeScale
    const existingEntries = await prisma.gradeScaleEntry.findMany({
        where: { gradeScaleId: scaleId }
    });
    const overlap = existingEntries.some(entry => 
        (data.minPercentage <= entry.maxPercentage && data.maxPercentage >= entry.minPercentage)
    );
    if (overlap) {
        return NextResponse.json({ error: "Percentage range overlaps with an existing entry in this scale.", fieldErrors: {minPercentage: ["Range overlap."], maxPercentage: ["Range overlap."]} }, { status: 409 });
    }


    const newEntry = await prisma.gradeScaleEntry.create({
      data: {
        gradeScaleId: scaleId,
        minPercentage: data.minPercentage,
        maxPercentage: data.maxPercentage,
        gradeLetter: data.gradeLetter,
        gradePoint: data.gradePoint, // Will be null if undefined and field is nullable
        remark: data.remark,
      },
    });
    return NextResponse.json({ message: "Grade scale entry added successfully.", entry: newEntry }, { status: 201 });

  } catch (error) {
    console.error(`Error adding entry to grade scale ${scaleId}:`, error);
    return NextResponse.json({ error: "Failed to add grade scale entry." }, { status: 500 });
  }
}