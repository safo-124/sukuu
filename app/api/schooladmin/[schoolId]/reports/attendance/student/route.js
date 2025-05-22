// File: app/api/schooladmin/[schoolId]/reports/attendance/student/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { TermPeriod, AttendanceStatus } from "@prisma/client";

async function isAuthorizedSchoolAdmin(userId, schoolId) {
  if (!userId || !schoolId) return false;
  const assignment = await prisma.schoolAdmin.findFirst({
      where: { userId: userId, schoolId: schoolId }
  });
  return !!assignment;
}

export async function GET(req, { params }) {
  const { schoolId } = params;
  const { searchParams } = new URL(req.url);

  const studentId = searchParams.get('studentId');
  const academicYear = searchParams.get('academicYear');
  const term = searchParams.get('term'); // TermPeriod enum string

  if (!studentId || !academicYear || !term) {
    return NextResponse.json({ error: "Missing required query parameters: studentId, academicYear, term." }, { status: 400 });
  }
  if (!Object.values(TermPeriod).includes(term)) {
    return NextResponse.json({ error: "Invalid term provided." }, { status: 400 });
  }

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

    const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true }});
    if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId: schoolId, isActive: true },
      select: { 
        id: true, firstName: true, lastName: true, middleName: true, studentIdNumber: true, profilePictureUrl: true,
        currentClass: { select: { name: true, section: true }}
      }
    });
    if (!student) return NextResponse.json({ error: "Active student not found in this school." }, { status: 404 });

    const attendanceRecords = await prisma.studentAttendance.findMany({
      where: {
        studentId: studentId,
        academicYear: academicYear,
        term: term,
        // Ensure records are tied to the school implicitly via student or class
        // If StudentAttendance has schoolId: student: { schoolId: schoolId }
      },
      orderBy: { date: 'asc' },
      select: { date: true, status: true, remarks: true }
    });

    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;

    attendanceRecords.forEach(record => {
      switch (record.status) {
        case AttendanceStatus.PRESENT: presentCount++; break;
        case AttendanceStatus.ABSENT: absentCount++; break;
        case AttendanceStatus.LATE: lateCount++; break; // Late is often counted as present for percentage
        case AttendanceStatus.EXCUSED: excusedCount++; break;
      }
    });
    
    // Total days for which attendance was marked for this student in this period
    const totalMarkedDays = attendanceRecords.length; 
    // Total effective days present for percentage (e.g., Present + Late)
    const effectivePresentDays = presentCount + lateCount; 
    const attendancePercentage = totalMarkedDays > 0 ? parseFloat(((effectivePresentDays / totalMarkedDays) * 100).toFixed(1)) : 0;


    return NextResponse.json({
      reportData: {
        student,
        schoolName: school.name,
        className: student.currentClass ? `${student.currentClass.name} ${student.currentClass.section || ''}`.trim() : "N/A",
        academicYear,
        term: term.replace("_", " "),
        attendanceLog: attendanceRecords.map(r => ({
            date: r.date.toISOString().split('T')[0], // Format as YYYY-MM-DD string
            status: r.status,
            remarks: r.remarks
        })),
        summary: {
          totalMarkedDays,
          daysPresent: presentCount,
          daysAbsent: absentCount,
          daysLate: lateCount,
          daysExcused: excusedCount,
          attendancePercentage,
        }
      }
    }, { status: 200 });

  } catch (error) {
    console.error("Error generating student attendance report:", error);
    return NextResponse.json({ error: "Failed to generate report due to a server error." }, { status: 500 });
  }
}