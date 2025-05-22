// File: app/api/schooladmin/[schoolId]/classes/[classId]/students-basic/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust path
import prisma from "@/lib/prisma";

async function isAuthorizedSchoolAdmin(userId, schoolId) {
  if (!userId || !schoolId) return false;
  const assignment = await prisma.schoolAdmin.findFirst({
      where: { userId: userId, schoolId: schoolId }
  });
  return !!assignment;
}

// GET: List basic student info for a specific Class
export async function GET(req, { params }) {
  const { schoolId, classId } = params;
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

    const students = await prisma.student.findMany({
      where: { 
        schoolId: schoolId,
        currentClassId: classId, // Students currently in this class
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
    return NextResponse.json(students, { status: 200 });

  } catch (error) {
    console.error(`Error fetching students for class ${classId} in school ${schoolId}:`, error);
    return NextResponse.json({ error: "Failed to fetch students." }, { status: 500 });
  }
}