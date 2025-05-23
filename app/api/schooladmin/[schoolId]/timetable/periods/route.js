// File: app/api/schooladmin/[schoolId]/timetable/periods/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust path
import prisma from "@/lib/prisma";
import { schoolPeriodSchema } from "@/lib/validators/timetableValidators"; // Adjust path

async function isAuthorizedSchoolAdmin(userId, schoolId) {
  if (!userId || !schoolId) return false;
  const assignment = await prisma.schoolAdmin.findFirst({
      where: { userId: userId, schoolId: schoolId }
  });
  return !!assignment;
}

// GET: List all SchoolPeriods for the school
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

    const periods = await prisma.schoolPeriod.findMany({
      where: { schoolId: schoolId },
      orderBy: { sortOrder: 'asc' },
    });
    return NextResponse.json(periods, { status: 200 });
  } catch (error) {
    console.error(`Error fetching school periods for school ${schoolId}:`, error);
    return NextResponse.json({ error: "Failed to fetch school periods." }, { status: 500 });
  }
}

// POST: Create a new SchoolPeriod
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
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const requestBody = await req.json();
    const validationResult = schoolPeriodSchema.safeParse(requestBody);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed.", fieldErrors: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const data = validationResult.data;

    // Server-side check for time overlaps and sortOrder/name uniqueness
    const existingPeriods = await prisma.schoolPeriod.findMany({ where: { schoolId } });
    if (existingPeriods.some(p => p.sortOrder === data.sortOrder)) {
        return NextResponse.json({ error: "Sort order must be unique.", fieldErrors: { sortOrder: ["This sort order is already in use."]}}, { status: 409 });
    }
    if (existingPeriods.some(p => p.name === data.name)) {
        return NextResponse.json({ error: "Period name must be unique.", fieldErrors: { name: ["This name is already in use."]}}, { status: 409 });
    }
    // Basic overlap check (more robust check might be needed for complex cases)
    // Convert HH:MM to minutes for comparison
    const newStartTime = parseInt(data.startTime.split(':')[0]) * 60 + parseInt(data.startTime.split(':')[1]);
    const newEndTime = parseInt(data.endTime.split(':')[0]) * 60 + parseInt(data.endTime.split(':')[1]);

    for (const p of existingPeriods) {
        const existingStartTime = parseInt(p.startTime.split(':')[0]) * 60 + parseInt(p.startTime.split(':')[1]);
        const existingEndTime = parseInt(p.endTime.split(':')[0]) * 60 + parseInt(p.endTime.split(':')[1]);
        if (Math.max(newStartTime, existingStartTime) < Math.min(newEndTime, existingEndTime)) {
            return NextResponse.json({ error: `Time overlaps with existing period: ${p.name} (${p.startTime}-${p.endTime})`, fieldErrors: {startTime: ["Time overlap."], endTime: ["Time overlap."]}}, { status: 409 });
        }
    }


    const newPeriod = await prisma.schoolPeriod.create({
      data: {
        ...data,
        schoolId: schoolId,
      },
    });
    return NextResponse.json({ message: "School period created successfully.", period: newPeriod }, { status: 201 });

  } catch (error) {
    console.error(`Error creating school period for school ${schoolId}:`, error);
    if (error.code === 'P2002') { // Unique constraint failed (e.g. on name or sortOrder)
        const target = error.meta?.target || [];
        if (target.includes('sortOrder')) return NextResponse.json({ error: "This sort order is already in use.", fieldErrors: { sortOrder: ["Sort order already taken."] }}, { status: 409 });
        if (target.includes('name')) return NextResponse.json({ error: "This period name is already in use.", fieldErrors: { name: ["Name already taken."] }}, { status: 409 });
        return NextResponse.json({ error: "A unique constraint was violated." }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create school period." }, { status: 500 });
  }
}