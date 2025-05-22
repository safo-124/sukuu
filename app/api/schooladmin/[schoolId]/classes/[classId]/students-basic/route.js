// File: app/api/schooladmin/[schoolId]/classes/[classId]/students-basic/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust path if your authOptions are elsewhere
import prisma from "@/lib/prisma";

// Helper function for authorization (consider moving to a shared lib if used in multiple API routes)
async function isAuthorizedSchoolAdmin(userId, schoolId) {
  if (!userId || !schoolId) return false;
  const assignment = await prisma.schoolAdmin.findFirst({
      where: { userId: userId, schoolId: schoolId }
  });
  return !!assignment;
}

// GET: List basic student info (ID, name, studentIdNumber) for a specific Class
export async function GET(req, { params }) {
  const { schoolId, classId } = params;
  console.log(`[API /students-basic] Request for schoolId: ${schoolId}, classId: ${classId}`);

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      console.error("[API /students-basic] Unauthorized: No session.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuperAdmin = session.user.role === 'SUPER_ADMIN';
    const authorizedSchoolAdmin = isSuperAdmin ? true : await isAuthorizedSchoolAdmin(session.user.id, schoolId);

    if (!authorizedSchoolAdmin) {
      console.error(`[API /students-basic] Forbidden: User ${session.user.email} not authorized for school ${schoolId}.`);
      return NextResponse.json({ error: "Forbidden: Not authorized for this school." }, { status: 403 });
    }

    // Verify class exists and belongs to the school
    const classExists = await prisma.class.findFirst({
        where: {id: classId, schoolId: schoolId}
    });
    if (!classExists) {
        console.error(`[API /students-basic] Class ${classId} not found in school ${schoolId}.`);
        return NextResponse.json({ error: "Class not found in this school." }, { status: 404 });
    }

    const students = await prisma.student.findMany({
      where: {
        schoolId: schoolId,
        currentClassId: classId, // Students whose currentClassId matches the selected class
        isActive: true,         // Only active students
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        studentIdNumber: true,
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    });
    console.log(`[API /students-basic] Found ${students.length} students for class ${classId}.`);
    return NextResponse.json(students, { status: 200 });

  } catch (error) {
    console.error(`[API /students-basic] Error fetching students for class ${classId} in school ${schoolId}:`, error);
    return NextResponse.json({ error: "Failed to fetch students." }, { status: 500 });
  }
}