// File: app/api/schooladmin/[schoolId]/attendance/daily/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { bulkDailyAttendanceSchema } from "@/lib/validators/attendanceValidators";

async function isAuthorizedSchoolAdmin(userId, schoolId) {
  if (!userId || !schoolId) return false;
  const assignment = await prisma.schoolAdmin.findFirst({
      where: { userId: userId, schoolId: schoolId }
  });
  return !!assignment;
}

// POST handler to save/update a batch of daily attendance records
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
      return NextResponse.json({ error: "Forbidden: Not authorized for this school." }, { status: 403 });
    }

    const requestBody = await req.json();
    console.log("[API Daily Attendance POST] Request body:", requestBody);

    const validationResult = bulkDailyAttendanceSchema.safeParse(requestBody);

    if (!validationResult.success) {
      console.error("[API Daily Attendance POST] Validation Errors:", validationResult.error.flatten().fieldErrors);
      return NextResponse.json(
        { error: "Validation failed. Please check the attendance data.", fieldErrors: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { classId, date, academicYear, term, records } = validationResult.data;
    const attendanceDate = new Date(date); // Convert string date to Date object for Prisma

    // Verify classId belongs to schoolId
    const classExists = await prisma.class.findFirst({ where: { id: classId, schoolId: schoolId }});
    if (!classExists) {
        return NextResponse.json({ error: "Class not found in this school.", fieldErrors: { classId: ["Invalid class."] }}, { status: 400 });
    }

    // Upsert attendance records in a transaction
    const results = await prisma.$transaction(
      records.map(record =>
        prisma.studentAttendance.upsert({
          where: {
            // Using the unique constraint defined in schema
            unique_student_daily_class_attendance: {
              studentId: record.studentId,
              date: attendanceDate,
              classId: classId, // classId from the payload
              academicYear: academicYear,
              term: term,
            }
          },
          update: {
            status: record.status,
            remarks: record.remarks,
            recordedById: session.user.id,
          },
          create: {
            studentId: record.studentId,
            date: attendanceDate,
            status: record.status,
            remarks: record.remarks,
            academicYear: academicYear,
            term: term,
            classId: classId, // classId from the payload
            schoolId: schoolId, // Add schoolId to StudentAttendance model if not already there and needed
                                // If StudentAttendance doesn't have schoolId directly, it's implied via classId
            recordedById: session.user.id,
          },
        })
      )
    );

    return NextResponse.json(
      { message: `${results.length} attendance records saved/updated successfully for ${formatDate(attendanceDate)}.`, results },
      { status: 200 }
    );

  } catch (error) {
    console.error(`Error saving daily attendance for school ${schoolId}:`, error);
    return NextResponse.json({ error: "Failed to save attendance. An unexpected error occurred." }, { status: 500 });
  }
}

// Helper formatDate for API response message
const formatDate = (dateObj, options = { year: 'numeric', month: 'long', day: 'numeric' }) => {
    return dateObj.toLocaleDateString('en-US', options);
};