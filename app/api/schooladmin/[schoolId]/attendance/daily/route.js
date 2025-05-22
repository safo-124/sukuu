// File: app/api/schooladmin/[schoolId]/attendance/daily/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust path if needed
import prisma from "@/lib/prisma";
import { bulkDailyAttendanceSchema } from "@/lib/validators/attendanceValidators"; // Adjust path if needed
import { TermPeriod } from "@prisma/client"; // For validating term

// Helper function
async function isAuthorizedSchoolAdmin(userId, schoolId) {
  if (!userId || !schoolId) return false;
  const assignment = await prisma.schoolAdmin.findFirst({
      where: { userId: userId, schoolId: schoolId }
  });
  return !!assignment;
}

// Helper formatDate for API response message
const formatDateForMessage = (dateObj) => {
    return dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

// POST handler to save/update a batch of daily attendance records
export async function POST(req, { params }) {
  const { schoolId } = params;
  console.log(`[API POST /attendance/daily] Received request for school: ${schoolId}`);

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      console.error("[API POST /attendance/daily] Unauthorized: No session.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log(`[API POST /attendance/daily] User: ${session.user.email}, Role: ${session.user.role}`);

    const isSuperAdmin = session.user.role === 'SUPER_ADMIN';
    const authorizedSchoolAdmin = isSuperAdmin ? true : await isAuthorizedSchoolAdmin(session.user.id, schoolId);

    if (!authorizedSchoolAdmin) {
      console.error(`[API POST /attendance/daily] Forbidden: User ${session.user.email} not authorized for school ${schoolId}.`);
      return NextResponse.json({ error: "Forbidden: Not authorized for this school." }, { status: 403 });
    }

    const requestBody = await req.json();
    console.log("[API POST /attendance/daily] Request body:", JSON.stringify(requestBody, null, 2));

    // The Zod schema `bulkDailyAttendanceSchema` expects classId, date, academicYear, term, and records.
    const validationResult = bulkDailyAttendanceSchema.safeParse(requestBody);

    if (!validationResult.success) {
      console.error("[API POST /attendance/daily] Validation Errors:", JSON.stringify(validationResult.error.flatten().fieldErrors, null, 2));
      return NextResponse.json(
        { error: "Validation failed. Please check the attendance data.", fieldErrors: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { classId, date: dateString, academicYear, term, records } = validationResult.data;
    
    // Convert date string (YYYY-MM-DD from client) to UTC Date object for Prisma @db.Date
    const dateParts = dateString.split('-').map(Number);
    const attendanceDate = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]));
    console.log(`[API POST /attendance/daily] Parsed attendanceDate (UTC): ${attendanceDate.toISOString()}`);


    // Verify classId belongs to schoolId (important integrity check)
    const classExists = await prisma.class.findFirst({ 
        where: { id: classId, schoolId: schoolId },
        select: { id: true } // Select minimal fields
    });
    if (!classExists) {
        console.error(`[API POST /attendance/daily] Class ${classId} not found in school ${schoolId}.`);
        return NextResponse.json({ error: "Class not found in this school.", fieldErrors: { classId: ["Invalid class for this school."] }}, { status: 400 });
    }
    console.log(`[API POST /attendance/daily] Verified class ${classId} belongs to school ${schoolId}.`);


    console.log(`[API POST /attendance/daily] Starting transaction for ${records.length} records.`);
    const results = await prisma.$transaction(
      records.map(record => {
        const dataForCreate = {
          studentId: record.studentId,
          date: attendanceDate,
          status: record.status,
          remarks: record.remarks, // Prisma handles null for optional fields
          academicYear: academicYear,
          term: term,
          classId: classId, 
          // NO schoolId here directly, it's implied via classId if your StudentAttendance model doesn't have it.
          // If your StudentAttendance model DOES have a schoolId field, uncomment and ensure it's correct:
          // schoolId: schoolId, 
          recordedById: session.user.id,
        };
        const dataForUpdate = {
          status: record.status,
          remarks: record.remarks,
          recordedById: session.user.id,
        };

        console.log(`[API POST /attendance/daily] Upserting for student ${record.studentId}: Status ${record.status}`);
        return prisma.studentAttendance.upsert({
          where: {
            unique_student_daily_class_attendance: { // Name of your @@unique constraint
              studentId: record.studentId,
              date: attendanceDate,
              classId: classId,
              academicYear: academicYear,
              term: term,
            }
          },
          update: dataForUpdate,
          create: dataForCreate,
        });
      })
    );
    console.log(`[API POST /attendance/daily] Transaction successful. ${results.length} records processed.`);

    return NextResponse.json(
      { message: `${results.length} attendance records saved/updated successfully for ${formatDateForMessage(attendanceDate)}.`, results },
      { status: 200 }
    );

  } catch (error) {
    console.error(`[API POST /attendance/daily] CRITICAL ERROR for school ${schoolId}:`, error.name, error.message);
    console.error("[API POST /attendance/daily] Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    // Check for specific Prisma error codes if needed
    if (error.code === 'P2002') { // Unique constraint violation not caught by upsert (should be rare)
        return NextResponse.json({ error: "A unique constraint was violated during save." }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to save attendance. An unexpected server error occurred.", detailedError: error.message }, { status: 500 });
  }
}